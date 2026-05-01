/**
 * tpu.ts - FPGA TPU UART client (Bun).
 *
 * Usage:  bun tpu.ts [port]       default port: auto-detected
 *         echo '{"op":"dot","a":[1,2,3,4],"b":[4,3,2,1]}' | bun tpu.ts
 *
 * Interactive:
 *   > {"op":"dot","a":[1,2,3,4],"b":[4,3,2,1]}
 *   {"op":"dot","a":[1,2,3,4],"b":[4,3,2,1],"result":20,"ms":3}
 *   > q    (or Ctrl-D)
 *
 * Operations:
 *   dot:       a·b = a0*b0+a1*b1+a2*b2+a3*b3  (acc unchanged)
 *   mac:       acc += a·b; returns new acc
 *   relu:      returns max(0, signed acc); acc set to result
 *   reset_acc: acc = 0; returns 0
 *
 * Protocol:
 *   Host -> FPGA:
 *     byte 0: op  (0=dot  1=mac  2=relu  3=reset_acc)
 *     bytes 1-8 (dot/mac only): a0,a1,a2,a3,b0,b1,b2,b3
 *   FPGA -> Host: 2 bytes big-endian 16-bit result
 */

import * as readline from "readline";
import { readdirSync } from "fs";

const PORT = process.argv[2] ?? "auto";
const BAUD = 115_200;

const OP: Record<string, number> = { dot: 0, mac: 1, relu: 2, reset_acc: 3 };
const OP_HAS_OPERANDS = new Set([0, 1]);

function listTtyUsbPorts(): string[] {
  return readdirSync("/dev")
    .filter((entry) => /^ttyUSB\d+$/.test(entry))
    .sort((left, right) => Number(left.slice(6)) - Number(right.slice(6)))
    .map((entry) => `/dev/${entry}`);
}

function emit(obj: Record<string, unknown>) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

// ---------------------------------------------------------------------------
// Python co-process: handles all serial I/O using pyserial.
// request:  "<op> [a0 a1 a2 a3 b0 b1 b2 b3]\n"  (operands only for dot/mac)
// response: "<result>\n"  (decimal integer, or -1 on timeout)
// ---------------------------------------------------------------------------
const PYTHON_BRIDGE = `
import sys, serial

port = sys.argv[1]
try:
    s = serial.Serial(port, 115200, timeout=2)
except Exception as e:
    sys.stdout.write("ERR " + str(e) + "\\n")
    sys.stdout.flush()
    sys.exit(1)

sys.stdout.write("READY\\n")
sys.stdout.flush()

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    parts = line.split()
    op = int(parts[0])
    if op in (0, 1):
        payload = bytes([op] + [int(x) for x in parts[1:]])
    else:
        payload = bytes([op])
    s.write(payload)
    r = s.read(2)
    if len(r) == 2:
        sys.stdout.write(str(r[0] * 256 + r[1]) + "\\n")
    else:
        sys.stdout.write("-1\\n")
    sys.stdout.flush()

s.close()
`;

function resolvePort(port: string): string {
  if (port !== "auto") return port;
  const ports = listTtyUsbPorts();
  if (ports.length === 0) {
    emit({ error: "no /dev/ttyUSB* found - check USB cable and board power" });
    process.exit(1);
  }
  if (ports.length !== 2) {
    emit({
      error: `refusing to auto-select a UART port from ${ports.length} ttyUSB devices`,
      ports,
      hint: "pass the intended UART device explicitly, for example /dev/ttyUSB1",
    });
    process.exit(1);
  }
  return ports[1];
}

const resolvedPort = resolvePort(PORT);

const py = Bun.spawn(["python3", "-u", "-c", PYTHON_BRIDGE, resolvedPort], {
  stdin: "pipe",
  stdout: "pipe",
  stderr: "pipe",
});

const pyReader = py.stdout.getReader();
const pyDec = new TextDecoder();
let pyBuf = "";

async function pyReadLine(): Promise<string> {
  while (true) {
    const nl = pyBuf.indexOf("\n");
    if (nl !== -1) {
      const line = pyBuf.slice(0, nl).trim();
      pyBuf = pyBuf.slice(nl + 1);
      return line;
    }
    const { value, done } = await pyReader.read();
    if (done) return pyBuf.trim();
    pyBuf += pyDec.decode(value);
  }
}

const handshake = await pyReadLine();
if (!handshake.startsWith("READY")) {
  emit({ error: `cannot open serial port: ${handshake.replace(/^ERR /, "")}` });
  process.exit(1);
}

if (process.stdin.isTTY) {
  process.stderr.write(`FPGA TPU  |  ${resolvedPort} @ ${BAUD} baud\n`);
  process.stderr.write(`ops: dot mac relu reset_acc  |  q = quit\n\n`);
}

function parseVec(v: unknown, name: string): number[] | string {
  if (!Array.isArray(v) || v.length !== 4) {
    return `"${name}" must be an array of 4 integers`;
  }
  for (let i = 0; i < 4; i++) {
    const n = Number(v[i]);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 255) {
      return `"${name}[${i}]" must be an integer 0-255, got ${JSON.stringify(v[i])}`;
    }
  }
  return v.map(Number);
}

const rl = readline.createInterface({
  input: process.stdin, output: process.stdout,
  prompt: "> ", terminal: process.stdin.isTTY,
});
if (process.stdin.isTTY) rl.prompt();

rl.on("line", async (line) => {
  const s = line.trim();
  if (!s) { if (process.stdin.isTTY) rl.prompt(); return; }
  if (s === "q" || s === "quit") { py.kill(); process.exit(0); }

  let req: Record<string, unknown>;
  try { req = JSON.parse(s); }
  catch { emit({ error: `invalid JSON: ${s}` }); if (process.stdin.isTTY) rl.prompt(); return; }

  const opStr = String(req.op ?? "").toLowerCase();
  if (!(opStr in OP)) {
    emit({ error: `"op" must be dot|mac|relu|reset_acc, got ${JSON.stringify(req.op)}` });
    if (process.stdin.isTTY) rl.prompt(); return;
  }
  const opCode = OP[opStr];

  let cmd: string;
  if (OP_HAS_OPERANDS.has(opCode)) {
    const aVec = parseVec(req.a, "a");
    if (typeof aVec === "string") { emit({ error: aVec }); if (process.stdin.isTTY) rl.prompt(); return; }
    const bVec = parseVec(req.b, "b");
    if (typeof bVec === "string") { emit({ error: bVec }); if (process.stdin.isTTY) rl.prompt(); return; }
    cmd = `${opCode} ${aVec.join(" ")} ${bVec.join(" ")}`;
  } else {
    cmd = `${opCode}`;
  }

  const t0 = Date.now();
  py.stdin.write(cmd + "\n");
  const resp = await pyReadLine();
  const ms = Date.now() - t0;

  const val = parseInt(resp);
  if (isNaN(val) || val < 0) {
    emit({ error: "timeout - no response from FPGA", op: opStr });
    if (process.stdin.isTTY) rl.prompt(); return;
  }

  const out: Record<string, unknown> = { op: opStr };
  if (OP_HAS_OPERANDS.has(opCode)) {
    out.a = req.a;
    out.b = req.b;
  }
  out.result = val;
  out.ms = ms;
  emit(out);
  if (process.stdin.isTTY) rl.prompt();
});

rl.on("close", () => { py.kill(); process.exit(0); });
