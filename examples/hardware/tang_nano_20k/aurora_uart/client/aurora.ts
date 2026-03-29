/**
 * aurora.ts - Aurora UART interactive client (Bun).
 *
 * Usage:  bun aurora.ts [port]       default port: /dev/ttyUSB1
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
import { openSync, writeSync, readSync, closeSync, constants } from "fs";
import { spawnSync } from "child_process";

const PORT     = process.argv[2] ?? "/dev/ttyUSB1";
const BAUD     = 115_200;
const NB_FLAG  = 0o4000; // O_NONBLOCK on Linux

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

// Configure port.
const stty = spawnSync("stty", [
  "-F", PORT, `${BAUD}`, "raw", "cs8", "-cstopb", "-parenb", "clocal", "cread", "-echo",
]);
if (stty.status !== 0) {
  console.error(`Cannot configure ${PORT}: ${stty.stderr?.toString().trim()}`);
  console.error("  sudo chmod a+rw /dev/ttyUSB1  or  sudo usermod -aG dialout $USER");
  process.exit(1);
}

let fd: number;
try {
  fd = openSync(PORT, constants.O_RDWR | NB_FLAG);
} catch (e: any) {
  console.error(`Cannot open ${PORT}: ${e.message}`);
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
