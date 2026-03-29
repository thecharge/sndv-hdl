/**
 * diag.ts - one-shot hardware diagnostic for calc_uart.
 * Usage: bun diag.ts /dev/ttyUSB2
 *
 * Sends [0, 42, 13] (add 42+13), waits 500 ms, reads whatever arrived.
 * Expected: 2 bytes [0x00, 0x37] = result 55.
 */

import { openSync, writeSync, readSync, closeSync, constants } from "fs";
import { spawnSync } from "child_process";

const PORT = process.argv[2] ?? "/dev/ttyUSB2";
const O_NOCTTY = 0o400;
const O_NONBLOCK = 0o4000;

// --- open ---
let fd: number;
try {
    fd = openSync(PORT, constants.O_RDWR | O_NOCTTY | O_NONBLOCK);
} catch (e: any) {
    console.error(`FAIL open: ${e.message}`);
    process.exit(1);
}
console.log(`OK   opened fd=${fd} on ${PORT}`);

// --- configure ---
const stty = spawnSync("stty", [
    "-F", PORT, "115200", "raw", "cs8",
    "-cstopb", "-parenb", "clocal", "cread", "-echo", "-crtscts",
]);
if (stty.status !== 0) {
    console.error(`FAIL stty: ${stty.stderr?.toString().trim()}`);
    process.exit(1);
}
console.log("OK   stty configured 115200 8N1 raw -crtscts");

// --- flush any stale input ---
{
    const tmp = Buffer.alloc(64);
    try { readSync(fd, tmp, 0, tmp.length, null); } catch { /* EAGAIN = empty */ }
}

// --- write ---
const pkt = Buffer.from([0, 42, 13]);  // add, a=42, b=13
writeSync(fd, pkt);
console.log(`OK   sent bytes: [${[...pkt]}]`);

// --- wait 500 ms (FPGA responds in ~3 ms) ---
console.log("     sleeping 500 ms...");
Bun.sleepSync(500);

// --- read ---
const buf = Buffer.alloc(4);
let got = 0;
for (let i = 0; i < 5; i++) {
    try {
        const k = readSync(fd, buf, got, buf.length - got, null);
        got += k;
        console.log(`     readSync attempt ${i + 1}: k=${k}  total=${got}`);
    } catch (e: any) {
        console.log(`     readSync attempt ${i + 1}: threw ${e.code}`);
    }
    if (got >= 2) break;
    Bun.sleepSync(50);
}

if (got >= 2) {
    const result = (buf[0] << 8) | buf[1];
    const ok = result === 55;
    console.log(`${ok ? "OK  " : "FAIL"} result=${result} (expected 55)  raw=[${[...buf.slice(0, got)]}]`);
} else {
    console.log(`FAIL got only ${got} bytes — FPGA did not respond`);
    console.log("     Check: correct firmware flashed? correct ttyUSB port?");
    console.log("     Verify with Python:");
    console.log(`       python3 -c "import serial; s=serial.Serial('${PORT}',115200,timeout=2); s.write(bytes([0,42,13])); r=s.read(2); print(list(r))"`);
}

closeSync(fd);
