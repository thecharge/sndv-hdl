/**
 * diag.ts - one-shot hardware diagnostic for tpu_uart.
 * Usage: bun diag.ts /dev/ttyUSB2
 *
 * Sends op=0 (dot) with a=[1,2,3,4] b=[4,3,2,1] = 1*4+2*3+3*2+4*1 = 20.
 * Expected: 2 bytes [0x00, 0x14] = result 20.
 */

import { openSync, writeSync, readSync, closeSync, constants } from "fs";
import { spawnSync } from "child_process";

const PORT = process.argv[2] ?? "/dev/ttyUSB2";
const O_NOCTTY = 0o400;
const O_NONBLOCK = 0o4000;

let fd: number;
try {
    fd = openSync(PORT, constants.O_RDWR | O_NOCTTY | O_NONBLOCK);
} catch (e: any) {
    console.error(`FAIL open: ${e.message}`);
    process.exit(1);
}
console.log(`OK   opened fd=${fd} on ${PORT}`);

const stty = spawnSync("stty", [
    "-F", PORT, "115200", "raw", "cs8",
    "-cstopb", "-parenb", "clocal", "cread", "-echo", "-crtscts",
]);
if (stty.status !== 0) {
    console.error(`FAIL stty: ${stty.stderr?.toString().trim()}`);
    process.exit(1);
}
console.log("OK   stty configured 115200 8N1 raw -crtscts");

{
    const tmp = Buffer.alloc(64);
    try { readSync(fd, tmp, 0, tmp.length, null); } catch { /* EAGAIN = empty */ }
}

// op=0 (dot), a=[1,2,3,4], b=[4,3,2,1] => expected 20
const pkt = Buffer.from([0, 1, 2, 3, 4, 4, 3, 2, 1]);
writeSync(fd, pkt);
console.log(`OK   sent bytes: [${[...pkt]}]`);
console.log("     sleeping 500 ms...");
Bun.sleepSync(500);

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
    const ok = result === 20;
    console.log(`${ok ? "OK  " : "FAIL"} result=${result} (expected 20)  raw=[${[...buf.slice(0, got)]}]`);
} else {
    console.log(`FAIL got only ${got} bytes — FPGA did not respond`);
    console.log("     Check: correct firmware flashed? correct ttyUSB port?");
    console.log(`     Verify with Python:`);
    console.log(`       python3 -c "import serial; s=serial.Serial('${PORT}',115200,timeout=2); s.write(bytes([0,1,2,3,4,4,3,2,1])); r=s.read(2); print(list(r))"`);
}

closeSync(fd);
