/**
 * calc.ts - FPGA Calculator UART client (Bun).
 *
 * Usage:  bun calc.ts [port]       default port: auto-detected
 *         echo '{"op":"add","a":42,"b":13}' | bun calc.ts
 *
 * Interactive:
 *   > {"op": "add", "a": 42, "b": 13}
 *   {"op":"add","a":42,"b":13,"result":55,"hex":"0x0037","ms":2}
 *   > q    (or Ctrl-D)
 *
 * Protocol:
 *   Host -> FPGA : 3 bytes  [op(1), a(1), b(1)]
 *     op  0=add  1=sub  2=mul
 *     a, b  unsigned 0-255
 *   FPGA -> Host : 2 bytes  [hi, lo]  big-endian 16-bit result
 *
 * Serial I/O is delegated to a persistent Python co-process using pyserial,
 * which handles all termios configuration reliably.
 *
 * Compile hw:
 *   bun run apps/cli/src/index.ts compile \
 *     examples/hardware/tang_nano_20k/calc_uart/hw \
 *     --board boards/tang_nano_20k.board.json --out .artifacts/calc_uart --flash
 */

import * as readline from "readline";

const PORT = process.argv[2] ?? "auto";
const BAUD = 115_200;

const OP: Record<string, number> = { add: 0, sub: 1, mul: 2 };

function emit(obj: Record<string, unknown>) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

// ---------------------------------------------------------------------------
// Python co-process: handles all serial I/O using pyserial.
// Communicates via stdin/stdout using a simple text protocol:
//   request:  "<op> <a> <b>\n"
//   response: "<result>\n"  (decimal integer, or -1 on timeout)
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
    op, a, b = int(parts[0]), int(parts[1]), int(parts[2])
    s.write(bytes([op, a, b]))
    r = s.read(2)
    if len(r) == 2:
        sys.stdout.write(str(r[0] * 256 + r[1]) + "\\n")
    else:
        sys.stdout.write("-1\\n")
    sys.stdout.flush()

s.close()
`;

// Resolve "auto" to the highest ttyUSB port (Tang Nano UART is always the
// higher-numbered of the two Tang Nano ttyUSB ports).
function resolvePort(port: string): string {
  if (port !== "auto") return port;
  const glob = Bun.spawnSync(["bash", "-c", "ls /dev/ttyUSB* 2>/dev/null | sort -V | tail -1"]);
  const p = glob.stdout.toString().trim();
  if (!p) {
    emit({ error: "no /dev/ttyUSB* found - check USB cable and board power" });
    process.exit(1);
  }
  return p;
}

const resolvedPort = resolvePort(PORT);

const py = Bun.spawn(["python3", "-u", "-c", PYTHON_BRIDGE, resolvedPort], {
  stdin: "pipe",
  stdout: "pipe",
  stderr: "pipe",
});

// Persistent reader + line buffer — never re-acquire the lock between calls.
const pyReader = py.stdout.getReader();
const pyDec    = new TextDecoder();
let   pyBuf    = "";

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

// Wait for READY handshake.
const handshake = await pyReadLine();
if (!handshake.startsWith("READY")) {
  emit({ error: `cannot open serial port: ${handshake.replace(/^ERR /, "")}` });
  process.exit(1);
}

if (process.stdin.isTTY) {
  process.stderr.write(`FPGA Calculator  |  ${resolvedPort} @ ${BAUD} baud\n`);
  process.stderr.write(`Input: {"op":"add|sub|mul","a":0-255,"b":0-255}  |  q = quit\n\n`);
}

// Parse and validate an operand value (accepts number or numeric string).
function parseOp(v: unknown, name: string): number | string {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 255) {
    return `"${name}" must be an integer 0-255, got ${JSON.stringify(v)}`;
  }
  return n;
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
    emit({ error: `"op" must be add|sub|mul, got ${JSON.stringify(req.op)}` });
    if (process.stdin.isTTY) rl.prompt(); return;
  }
  const aVal = parseOp(req.a, "a");
  if (typeof aVal === "string") { emit({ error: aVal }); if (process.stdin.isTTY) rl.prompt(); return; }
  const bVal = parseOp(req.b, "b");
  if (typeof bVal === "string") { emit({ error: bVal }); if (process.stdin.isTTY) rl.prompt(); return; }

  const t0 = Date.now();
  py.stdin.write(`${OP[opStr]} ${aVal} ${bVal}\n`);
  const resp = await pyReadLine();
  const ms = Date.now() - t0;

  const val = parseInt(resp);
  if (isNaN(val) || val < 0) {
    emit({ error: "timeout - no response from FPGA", op: opStr, a: aVal, b: bVal });
    if (process.stdin.isTTY) rl.prompt(); return;
  }

  const result = val;
  const hex = "0x" + result.toString(16).padStart(4, "0");
  const out: Record<string, unknown> = { op: opStr, a: aVal, b: bVal, result, hex, ms };
  if (opStr === "sub" && bVal > aVal) out.note = "underflow (16-bit wrap)";
  else if (result > 255)              out.note = "result > 8-bit";

  emit(out);
  if (process.stdin.isTTY) rl.prompt();
});

rl.on("close", () => { py.kill(); process.exit(0); });
