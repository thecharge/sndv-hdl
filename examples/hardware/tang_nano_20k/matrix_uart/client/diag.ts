/**
 * diag.ts - Diagnostic client for matrix_uart (raw byte-level UART).
 * Sends 64 zero bytes and reads the 32-byte response.
 *
 * Usage: bun diag.ts [port]
 */

import { readdirSync } from "fs";

const PORT = process.argv[2] ?? "auto";

function listTtyUsbPorts(): string[] {
  return readdirSync("/dev")
    .filter((e) => /^ttyUSB\d+$/.test(e))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)))
    .map((e) => `/dev/${e}`);
}

const PYTHON_SCRIPT = `
import sys, serial, time

port = sys.argv[1]
s = serial.Serial(port, 115200, timeout=3)
time.sleep(0.1)

payload = bytes(32 + 32)  # 64 zero bytes (identity matrices would be different)
t0 = time.time()
s.write(payload)
resp = s.read(32)
ms = int((time.time() - t0) * 1000)

print(f"sent={len(payload)} recv={len(resp)} ms={ms}")
if resp:
    print("hex:", resp.hex())
    import struct
    if len(resp) == 32:
        vals = struct.unpack('<16H', resp)
        print("uint16:", list(vals))
`;

const ports = listTtyUsbPorts();
const port = PORT === "auto" ? ports[ports.length - 1] : PORT;
if (!port) {
  process.stderr.write("No ttyUSB ports found\n");
  process.exit(1);
}

const result = Bun.spawnSync(["python3", "-c", PYTHON_SCRIPT, port], { stdout: "pipe", stderr: "pipe" });
process.stdout.write(result.stdout.toString());
if (result.stderr.length) process.stderr.write(result.stderr.toString());
