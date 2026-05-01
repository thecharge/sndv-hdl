/**
 * matrix.ts - 4x4 matrix multiply FPGA client (Bun).
 *
 * Usage:  echo '{"a":[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],"b":[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]}' | bun matrix.ts
 *
 * Protocol:
 *   Host -> FPGA : 64 bytes  [A[0..15] as uint8, B[0..15] as uint8] (row-major)
 *   FPGA -> Host : 32 bytes  [C[0..15] as uint16 little-endian]
 */

import { readdirSync } from "fs";

const PORT = process.argv[2] ?? "auto";

function listTtyUsbPorts(): string[] {
  return readdirSync("/dev")
    .filter((e) => /^ttyUSB\d+$/.test(e))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)))
    .map((e) => `/dev/${e}`);
}

const PYTHON_BRIDGE = `
import sys, serial, struct

port = sys.argv[1]
try:
    s = serial.Serial(port, 115200, timeout=5)
except Exception as e:
    sys.stdout.write("ERR " + str(e) + "\\n")
    sys.stdout.flush()
    sys.exit(1)

sys.stdout.write("READY\\n")
sys.stdout.flush()

while True:
    line = sys.stdin.readline()
    if not line:
        break
    parts = line.strip().split()
    if len(parts) != 32:
        sys.stdout.write("ERR bad input\\n")
        sys.stdout.flush()
        continue
    payload = bytes([int(x) for x in parts])
    s.write(payload)
    resp = s.read(32)
    if len(resp) != 32:
        sys.stdout.write("ERR timeout len=" + str(len(resp)) + "\\n")
    else:
        # 16 uint16 little-endian values
        vals = struct.unpack('<16H', resp)
        sys.stdout.write(' '.join(str(v) for v in vals) + "\\n")
    sys.stdout.flush()
`;

async function main() {
  const ports = listTtyUsbPorts();
  const port = PORT === "auto" ? ports[ports.length - 1] : PORT;
  if (!port) {
    process.stderr.write("No ttyUSB ports found\n");
    process.exit(1);
  }

  const py = Bun.spawn(["python3", "-c", PYTHON_BRIDGE, port], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
  });
  const reader = py.stdout.getReader();
  const dec = new TextDecoder();
  let buf = "";

  async function readLine(): Promise<string> {
    while (true) {
      const nl = buf.indexOf("\n");
      if (nl >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        return line;
      }
      const { value, done } = await reader.read();
      if (done) return "";
      buf += dec.decode(value);
    }
  }

  const ready = await readLine();
  if (!ready.startsWith("READY")) {
    process.stderr.write("Python bridge failed: " + ready + "\n");
    process.exit(1);
  }

  let inputJson = "";
  for await (const chunk of Bun.stdin.stream()) {
    inputJson += new TextDecoder().decode(chunk);
  }

  let parsed: { a: number[][]; b: number[][] };
  try {
    parsed = JSON.parse(inputJson.trim());
  } catch {
    process.stderr.write("Invalid JSON input\n");
    process.exit(1);
  }

  const a = parsed.a.flat();
  const b = parsed.b.flat();
  if (a.length !== 16 || b.length !== 16) {
    process.stderr.write("Expected 4x4 matrices\n");
    process.exit(1);
  }

  const payload = [...a, ...b].join(" ") + "\n";
  const t0 = Date.now();
  py.stdin.write(new TextEncoder().encode(payload));
  const response = await readLine();
  const ms = Date.now() - t0;

  if (response.startsWith("ERR")) {
    process.stderr.write(response + "\n");
    process.exit(1);
  }

  const flat = response.trim().split(" ").map(Number);
  const result: number[][] = [flat.slice(0, 4), flat.slice(4, 8), flat.slice(8, 12), flat.slice(12, 16)];

  process.stdout.write(JSON.stringify({ a: parsed.a, b: parsed.b, result, ms }) + "\n");
  py.stdin.end();
}

main();
