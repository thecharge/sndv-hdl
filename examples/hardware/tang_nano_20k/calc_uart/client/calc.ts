/**
 * calc.ts - FPGA Calculator UART client (Bun).
 *
 * Usage:  bun calc.ts [port]       default port: /dev/ttyUSB1
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
 * Notes:
 *   - add/sub results are 16-bit (sub may underflow and wrap)
 *   - mul results up to 255*255=65025 fit in 16 bits
 *
 * Compile hw:
 *   bun run apps/cli/src/index.ts compile \
 *     examples/hardware/tang_nano_20k/calc_uart/hw \
 *     --board boards/tang_nano_20k.board.json --out .artifacts/calc_uart --flash
 */

import * as readline from "readline";
import { openSync, writeSync, readSync, closeSync, constants } from "fs";
import { spawnSync } from "child_process";

const PORT       = process.argv[2] ?? "/dev/ttyUSB1";
const BAUD       = 115_200;
const NB_FLAG    = 0o4000;  // O_NONBLOCK
const NOCTTY     = 0o400;   // O_NOCTTY - don't become controlling terminal
const TIMEOUT_MS = 2_000;
const POLL_MS    = 10;

const OP: Record<string, number> = { add: 0, sub: 1, mul: 2 };

function emit(obj: Record<string, unknown>) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

// Open FIRST so the FTDI driver doesn't reinitialize the UART on our open.
// O_NOCTTY: don't attach as controlling terminal.
let fd: number;
try {
  fd = openSync(PORT, constants.O_RDWR | NB_FLAG | NOCTTY);
} catch (e: any) {
  emit({ error: `cannot open ${PORT}: ${e.message}` });
  process.exit(1);
}

// Configure AFTER opening: stty applies settings to the live device while our
// fd holds it open, so the FTDI driver cannot reset baud rate between calls.
const stty = spawnSync("stty", [
  "-F", PORT, `${BAUD}`, "raw", "cs8", "-cstopb", "-parenb",
  "clocal", "cread", "-echo", "-crtscts",
]);
if (stty.status !== 0) {
  emit({ error: `cannot configure ${PORT}: ${stty.stderr?.toString().trim()}` });
  process.exit(1);
}

// Read exactly `n` bytes. Returns null on timeout.
// Uses O_NONBLOCK fd + Bun.sleepSync so each retry actually waits.
function readExact(n: number): Buffer | null {
  const buf  = Buffer.alloc(n);
  let got    = 0;
  const dead = Date.now() + TIMEOUT_MS;
  while (got < n) {
    if (Date.now() > dead) return null;
    try {
      const k = readSync(fd, buf, got, n - got, null);
      if (k > 0) { got += k; continue; }
    } catch (e: any) {
      if (e.code !== "EAGAIN" && e.code !== "EWOULDBLOCK") throw e;
    }
    // No bytes yet - sleep before retrying so we don't spin-burn the CPU.
    Bun.sleepSync(POLL_MS);
  }
  return buf;
}

// Parse and validate an operand value (accepts number or numeric string).
function parseOp(v: unknown, name: string): number | string {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 255) {
    return `"${name}" must be an integer 0-255, got ${JSON.stringify(v)}`;
  }
  return n;
}

if (process.stdin.isTTY) {
  process.stderr.write(`FPGA Calculator  |  ${PORT} @ ${BAUD} baud\n`);
  process.stderr.write(`Input: {"op":"add|sub|mul","a":0-255,"b":0-255}  |  q = quit\n\n`);
}

const rl = readline.createInterface({
  input: process.stdin, output: process.stdout,
  prompt: "> ", terminal: process.stdin.isTTY,
});
if (process.stdin.isTTY) rl.prompt();

rl.on("line", (line) => {
  const s = line.trim();
  if (!s) { if (process.stdin.isTTY) rl.prompt(); return; }

  // Plain quit command (not JSON).
  if (s === "q" || s === "quit") { closeSync(fd); process.exit(0); }

  // Parse JSON.
  let req: Record<string, unknown>;
  try { req = JSON.parse(s); }
  catch { emit({ error: `invalid JSON: ${s}` }); if (process.stdin.isTTY) rl.prompt(); return; }

  // Validate fields.
  const opStr = String(req.op ?? "").toLowerCase();
  if (!(opStr in OP)) {
    emit({ error: `"op" must be add|sub|mul, got ${JSON.stringify(req.op)}` });
    if (process.stdin.isTTY) rl.prompt(); return;
  }
  const aVal = parseOp(req.a, "a");
  if (typeof aVal === "string") { emit({ error: aVal }); if (process.stdin.isTTY) rl.prompt(); return; }
  const bVal = parseOp(req.b, "b");
  if (typeof bVal === "string") { emit({ error: bVal }); if (process.stdin.isTTY) rl.prompt(); return; }

  // Send packet and wait for response.
  writeSync(fd, Buffer.from([OP[opStr], aVal, bVal]));
  const t0  = Date.now();
  const rsp = readExact(2);
  const ms  = Date.now() - t0;

  if (!rsp) {
    emit({ error: "timeout - no response from FPGA", op: opStr, a: aVal, b: bVal });
    if (process.stdin.isTTY) rl.prompt(); return;
  }

  const result = (rsp[0] << 8) | rsp[1];
  const hex    = "0x" + result.toString(16).padStart(4, "0");
  const out: Record<string, unknown> = { op: opStr, a: aVal, b: bVal, result, hex, ms };

  if (opStr === "sub" && bVal > aVal) out.note = "underflow (16-bit wrap)";
  else if (result > 255)              out.note = "result > 8-bit";

  emit(out);
  if (process.stdin.isTTY) rl.prompt();
});

rl.on("close", () => { closeSync(fd); process.exit(0); });
