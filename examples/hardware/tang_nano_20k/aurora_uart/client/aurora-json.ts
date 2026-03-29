/**
 * aurora-json.ts - Aurora UART JSON pipe client (Bun).
 *
 * Reads one JSON object per stdin line, sends the command byte to the FPGA,
 * prints all events as JSON to stdout.  Designed for scripting / automation.
 *
 * Usage:  bun aurora-json.ts [port]       default port: /dev/ttyUSB1
 *
 * Input JSON fields:
 *   {"cmd": "aurora"}   or short form  {"cmd": "a"}
 *   {"cmd": "red"}      {"cmd": "green"}  {"cmd": "blue"}
 *   {"cmd": "faster"}   {"cmd": "slower"}
 *   {"cmd": "freeze"}
 *   {"cmd": "quit"}
 *
 * Output events:
 *   {"type":"sent",  "cmd":"aurora", "byte":"a", "hex":"0x61"}
 *   {"type":"ack",   "raw":"K",      "hex":"0x4b"}
 *   {"type":"error", "message":"..."}
 *
 * Example:
 *   echo '{"cmd":"red"}' | bun aurora-json.ts
 *   echo '{"cmd":"faster"}\n{"cmd":"quit"}' | bun aurora-json.ts
 *
 * Compile hw:
 *   bun run apps/cli/src/index.ts compile \
 *     examples/hardware/tang_nano_20k/aurora_uart/hw \
 *     --board boards/tang_nano_20k.board.json --out .artifacts/aurora_uart --flash
 */

import * as readline from "readline";
import { openSync, writeSync, readSync, closeSync, constants } from "fs";
import { spawnSync } from "child_process";

const PORT    = process.argv[2] ?? "/dev/ttyUSB1";
const BAUD    = 115_200;
const NB_FLAG = 0o4000;

const CMD_MAP: Record<string, string> = {
  aurora: "a", a: "a",
  red: "r",    r: "r",
  green: "g",  g: "g",
  blue: "b",   b: "b",
  faster: "f", f: "f",
  slower: "s", s: "s",
  freeze: "x", x: "x",
};
const LONG_NAME: Record<string, string> = {
  a: "aurora", r: "red", g: "green", b: "blue", f: "faster", s: "slower", x: "freeze",
};

function out(obj: Record<string, unknown>) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

const stty = spawnSync("stty", [
  "-F", PORT, `${BAUD}`, "raw", "cs8", "-cstopb", "-parenb", "clocal", "cread", "-echo",
]);
if (stty.status !== 0) {
  out({ type: "error", message: `cannot configure ${PORT}: ${stty.stderr?.toString().trim()}` });
  process.exit(1);
}

let fd: number;
try {
  fd = openSync(PORT, constants.O_RDWR | NB_FLAG);
} catch (e: any) {
  out({ type: "error", message: `cannot open ${PORT}: ${e.message}` });
  process.exit(1);
}

// Poll ACK bytes from FPGA.
const rxBuf = Buffer.alloc(16);
function poll() {
  try {
    const n = readSync(fd, rxBuf, 0, rxBuf.length, null);
    if (n > 0) {
      const raw = rxBuf.subarray(0, n).toString("ascii").replace(/[^\x20-\x7e]/g, "");
      if (raw) out({ type: "ack", raw, hex: "0x" + rxBuf.subarray(0, n).toString("hex") });
    }
  } catch (e: any) {
    if (e.code !== "EAGAIN" && e.code !== "EWOULDBLOCK") {
      out({ type: "error", message: `read: ${e.message}` });
    }
  }
  setTimeout(poll, 20);
}
poll();

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on("line", (line) => {
  const s = line.trim();
  if (!s) return;

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(s); }
  catch { out({ type: "error", message: `invalid JSON: ${s}` }); return; }

  const rawCmd = String(parsed.cmd ?? "").toLowerCase();
  if (!rawCmd) { out({ type: "error", message: 'missing "cmd"' }); return; }
  if (rawCmd === "quit" || rawCmd === "q") { closeSync(fd); process.exit(0); }

  const byte = CMD_MAP[rawCmd];
  if (!byte) { out({ type: "error", message: `unknown cmd: ${rawCmd}` }); return; }

  writeSync(fd, Buffer.from([byte.charCodeAt(0)]));
  out({ type: "sent", cmd: LONG_NAME[byte], byte, hex: "0x" + byte.charCodeAt(0).toString(16).padStart(2, "0") });
});

rl.on("close", () => { closeSync(fd); process.exit(0); });
