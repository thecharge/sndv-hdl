/**
 * aurora.ts - Aurora UART interactive client (Bun).
 *
 * Usage:  bun aurora.ts [port]       default port: auto-detected (highest /dev/ttyUSB*)
 *
 * Commands:
 *   a  aurora  - smooth rainbow wave (default)
 *   r  red     - solid red
 *   g  green   - solid green
 *   b  blue    - solid blue
 *   f  faster  - 8x speed
 *   s  slower  - 1x speed
 *   x  freeze  - hold current colours
 *   q  quit
 *
 * FPGA echoes 'K' for every recognised command.
 *
 * Compile hw:
 *   bun run apps/cli/src/index.ts compile \
 *     examples/hardware/tang_nano_20k/aurora_uart/hw \
 *     --board boards/tang_nano_20k.board.json --out .artifacts/aurora_uart --flash
 */

import * as readline from "readline";
import { openSync, writeSync, readSync, closeSync, constants, readdirSync } from "fs";
import { spawnSync } from "child_process";

const O_NOCTTY = 0o400;  // prevent port from becoming controlling terminal
const NB_FLAG = 0o4000; // O_NONBLOCK on Linux
const BAUD = 115_200;

function listTtyUsbPorts(): string[] {
  return readdirSync("/dev")
    .filter((entry) => /^ttyUSB\d+$/.test(entry))
    .sort((left, right) => Number(left.slice(6)) - Number(right.slice(6)))
    .map((entry) => `/dev/${entry}`);
}

// Auto-detect only when the expected two-port Tang Nano bridge is present.
function resolvePort(arg: string | undefined): string {
  if (arg) return arg;
  const ports = listTtyUsbPorts();
  if (ports.length === 0) {
    console.error("No /dev/ttyUSB* found — check USB cable and board power.");
    process.exit(1);
  }
  if (ports.length !== 2) {
    console.error(`Refusing to auto-select a UART port from ${ports.length} ttyUSB devices.`);
    console.error("Pass the intended UART device explicitly, for example: bun aurora.ts /dev/ttyUSB1");
    console.error(`Available ports: ${ports.join(", ")}`);
    process.exit(1);
  }
  return ports[1];
}
const PORT = resolvePort(process.argv[2]);

const CMDS: Record<string, { byte: string; label: string }> = {
  a: { byte: "a", label: "aurora (rainbow wave)" },
  aurora: { byte: "a", label: "aurora (rainbow wave)" },
  r: { byte: "r", label: "red solid" },
  red: { byte: "r", label: "red solid" },
  g: { byte: "g", label: "green solid" },
  green: { byte: "g", label: "green solid" },
  b: { byte: "b", label: "blue solid" },
  blue: { byte: "b", label: "blue solid" },
  f: { byte: "f", label: "faster (8x)" },
  faster: { byte: "f", label: "faster (8x)" },
  s: { byte: "s", label: "slower (1x)" },
  slower: { byte: "s", label: "slower (1x)" },
  x: { byte: "x", label: "freeze" },
  freeze: { byte: "x", label: "freeze" },
};

// IMPORTANT: open FIRST, then stty.
// USB-serial drivers (BL616, FTDI) reinitialize baud rate on open.
// Running stty before openSync means the driver resets to 9600 on open.
let fd: number;
try {
  fd = openSync(PORT, constants.O_RDWR | O_NOCTTY | NB_FLAG);
} catch (e: any) {
  console.error(`Cannot open ${PORT}: ${e.message}`);
  console.error("  Check group access for the device and prefer adding your user to the dialout group.");
  process.exit(1);
}

const stty = spawnSync("stty", [
  "-F", PORT, `${BAUD}`, "raw", "cs8", "-cstopb", "-parenb", "clocal", "cread", "-echo", "-crtscts",
]);
if (stty.status !== 0) {
  console.error(`Cannot configure ${PORT}: ${stty.stderr?.toString().trim()}`);
  process.exit(1);
}

console.log(`Aurora UART  |  ${PORT} @ ${BAUD} baud`);
console.log("Commands: a=aurora  r=red  g=green  b=blue  f=faster  s=slower  x=freeze  q=quit");
console.log();

// Poll for FPGA ACK bytes every 20 ms without blocking readline.
const rxBuf = Buffer.alloc(16);
function poll() {
  try {
    const n = readSync(fd, rxBuf, 0, rxBuf.length, null);
    if (n > 0) {
      const s = rxBuf.subarray(0, n).toString("ascii").replace(/[^\x20-\x7e]/g, "");
      if (s) process.stdout.write(`\r  << ACK '${s}'\n> `);
    }
  } catch (e: any) {
    if (e.code !== "EAGAIN" && e.code !== "EWOULDBLOCK") {
      console.error(`\nRead error: ${e.message}`);
    }
  }
  setTimeout(poll, 20);
}
poll();

const rl = readline.createInterface({
  input: process.stdin, output: process.stdout,
  prompt: "> ", terminal: true,
});
rl.prompt();

rl.on("line", (line) => {
  const cmd = line.trim().toLowerCase();
  if (!cmd) { rl.prompt(); return; }
  if (cmd === "q" || cmd === "quit") { closeSync(fd); process.exit(0); }
  const entry = CMDS[cmd];
  if (entry) {
    console.log(`  >> ${entry.label}`);
    writeSync(fd, Buffer.from([entry.byte.charCodeAt(0)]));
  } else {
    console.log(`  Unknown: '${cmd}'.  Valid: a r g b f s x q`);
  }
  rl.prompt();
});

rl.on("close", () => { closeSync(fd); process.exit(0); });
