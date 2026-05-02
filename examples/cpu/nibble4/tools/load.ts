#!/usr/bin/env bun
// load.ts - send a nibble4 program (.bin) to the FPGA over UART.
// Usage: bun run tools/load.ts programs/counter.bin [/dev/ttyUSB1]
//
// Protocol:
//   1. Send sync byte 0xAA
//   2. Send count byte (number of nibbles, 0-31)
//   3. Send each nibble as one byte (bits[3:0] = nibble value, bits[7:4] = 0)
//
// The FPGA bootloader loads nibbles into program RAM then releases the CPU to run.

import { openSync, readdirSync, writeSync, closeSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';

const O_RDWR   = 0o2;
const O_NOCTTY = 0o400;
const O_NDELAY = 0o4000;

function findUartPort(): string {
    const devs = readdirSync('/dev').filter(d => d.startsWith('ttyUSB')).sort();
    if (devs.length === 0) throw new Error('No /dev/ttyUSB* devices found');
    // JTAG = lower index (ttyUSB0), UART data = higher index.
    return '/dev/' + devs[devs.length - 1];
}

const binPath = process.argv[2];
if (!binPath) {
    console.error('Usage: bun run tools/load.ts <file.bin> [port]');
    console.error('       bun run tools/load.ts programs/counter.bin /dev/ttyUSB1');
    process.exit(1);
}

const port = process.argv[3] ?? findUartPort();
console.log(`Using port: ${port}`);

const nibbles = readFileSync(resolve(binPath));
if (nibbles.length > 31) {
    console.error(`Program too large: ${nibbles.length} nibbles (max 31)`);
    process.exit(1);
}
console.log(`Loading ${nibbles.length} nibbles from ${binPath}`);

// Open BEFORE stty so FTDI does not reinitialise baud rate on open.
const fd = openSync(port, O_RDWR | O_NOCTTY | O_NDELAY);
spawnSync('stty', ['-F', port, '115200', 'raw', 'cs8', '-cstopb', '-parenb', 'clocal', 'cread', '-echo', '-crtscts']);

const payload = Buffer.allocUnsafe(2 + nibbles.length);
payload[0] = 0xAA;            // sync byte
payload[1] = nibbles.length;  // nibble count
for (let i = 0; i < nibbles.length; i++) {
    payload[2 + i] = nibbles[i] & 0xF;
}

writeSync(fd, payload);
closeSync(fd);

console.log(`Sent ${payload.length} bytes. CPU is now running.`);
