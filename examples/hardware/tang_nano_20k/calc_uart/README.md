# Calc UART

A simple calculator that runs on the FPGA. You send it two numbers and an operation,
it computes the result in hardware and sends back the answer.

Everything goes over the USB serial port. The client speaks JSON, so you can drive it
from the terminal or pipe it from any script.

---

## What You Need

- Tang Nano 20K board
- USB cable (the one you use for programming)
- `/dev/ttyUSB1` - the UART bridge on the same USB cable

No LEDs or external hardware required. All communication is over UART.

---

## Flash

```bash
./examples/hardware/tang_nano_20k/calc_uart/flash.sh
```

---

## Run the Client

```bash
./examples/hardware/tang_nano_20k/calc_uart/run.sh
```

The helper auto-detects the UART port only when exactly two `ttyUSB` devices are present.
If you have additional USB serial devices attached, pass the port explicitly:

```bash
./examples/hardware/tang_nano_20k/calc_uart/run.sh /dev/ttyUSB2
```

You can also run it directly:

```bash
bun examples/hardware/tang_nano_20k/calc_uart/client/calc.ts
```

---

## How to Use

Type one JSON object per line and press Enter. The client sends the calculation to the
FPGA, waits for the result, and prints it as JSON.

**Add two numbers:**
```
> {"op": "add", "a": 42, "b": 13}
{"op":"add","a":42,"b":13,"result":55,"hex":"0x0037","ms":2}
```

**Multiply:**
```
> {"op": "mul", "a": 200, "b": 200}
{"op":"mul","a":200,"b":200,"result":40000,"hex":"0x9c40","ms":3,"note":"result > 8-bit"}
```

**Subtract (with underflow):**
```
> {"op": "sub", "a": 10, "b": 30}
{"op":"sub","a":10,"b":30,"result":65516,"hex":"0xffec","ms":2,"note":"underflow (16-bit wrap)"}
```

**Type `q` to quit:**
```
> q
```

---

## Input Format

```json
{"op": "add", "a": 42, "b": 13}
```

| Field | Values                    | Notes                           |
| ----- | ------------------------- | ------------------------------- |
| `op`  | `"add"`, `"sub"`, `"mul"` | The operation to perform        |
| `a`   | 0 - 255                   | First operand (8-bit unsigned)  |
| `b`   | 0 - 255                   | Second operand (8-bit unsigned) |

Both `a` and `b` accept numbers or numeric strings (`"12"` and `12` both work).

---

## Output Format

```json
{"op":"add","a":42,"b":13,"result":55,"hex":"0x0037","ms":2}
```

| Field    | Meaning                                                                |
| -------- | ---------------------------------------------------------------------- |
| `op`     | The operation that was run                                             |
| `a`, `b` | The operands you sent                                                  |
| `result` | The answer as a decimal number (16-bit unsigned)                       |
| `hex`    | The answer in hex (always 4 digits)                                    |
| `ms`     | Round-trip time in milliseconds                                        |
| `note`   | Only present when something interesting happened (underflow, overflow) |

---

## Result Range

The result is always 16 bits (0 - 65535).

- **add**: can exceed 255 if `a + b > 255`. Example: `200 + 200 = 400`.
- **sub**: wraps around if `b > a`. Example: `10 - 30 = 65516` (16-bit underflow).
- **mul**: can be up to `255 × 255 = 65025`, which fits in 16 bits.

When the result is larger than 255 or there is underflow, the output includes a `note` field explaining it.

---

## Pipe Mode

You can pipe JSON into the client for batch use:

```bash
echo '{"op":"add","a":100,"b":55}' | bun client/calc.ts
```

```bash
printf '{"op":"mul","a":12,"b":12}\n{"op":"sub","a":5,"b":3}\n' | bun client/calc.ts
```

---

## Protocol (for reference)

The client and FPGA communicate over UART at 115200 baud 8N1.

**Request** - 3 bytes sent from PC to FPGA:

| Byte | Content                                   |
| ---- | ----------------------------------------- |
| 0    | Operation code: `0`=add, `1`=sub, `2`=mul |
| 1    | Operand A (0-255)                         |
| 2    | Operand B (0-255)                         |

**Response** - 2 bytes sent from FPGA to PC:

| Byte | Content                      |
| ---- | ---------------------------- |
| 0    | Result high byte (bits 15-8) |
| 1    | Result low byte (bits 7-0)   |

The result is big-endian: `result = (byte0 << 8) | byte1`.

The FPGA starts processing as soon as it receives the third byte. Typical response time
is under 5 ms including UART transmission.

---

## How It Works on the FPGA

The hardware is split into three modules wired together in `calc_top.ts`:

```
uart_rx  ->  calc_engine  ->  uart_tx
```

`calc_engine` is a state machine with seven states:

1. Wait for op byte
2. Wait for A byte
3. Wait for B byte
4. Compute result (one clock cycle)
5. Send high byte of result
6. Gap (one clock, lets the transmitter start)
7. Send low byte of result, then back to state 1

The gap in step 6 is needed because of how non-blocking assignments work in hardware:
the transmitter takes one clock to register the first byte and drop its ready signal,
so without the gap the second byte would be sent before the transmitter is ready.

---

## File Layout

```
calc_uart/
  hw/              Hardware source - compiled to the FPGA bitstream
    calc_uart_rx.ts    UART receiver (8N1, 115200 baud)
    calc_uart_tx.ts    UART transmitter (8N1, 115200 baud)
    calc_engine.ts     Calculator state machine
    calc_top.ts        Top-level wiring
  client/          PC-side scripts - never compiled to hardware
    calc.ts            JSON terminal client
  flash.sh         Compile + flash the hw/ folder
  run.sh           Launch calc.ts against /dev/ttyUSB1
  README.md        This file
```

---

## UART Details

| Setting     | Value          |
| ----------- | -------------- |
| Port        | `/dev/ttyUSB1` |
| Baud rate   | 115200         |
| Format      | 8N1            |
| FPGA TX pin | 15 (`uart_tx`) |
| FPGA RX pin | 16 (`uart_rx`) |

---

## Troubleshooting

**Timeout - no response from FPGA**
1. Make sure you flashed `calc_uart` and not another example. Run `flash.sh` again.
2. Check you are on the right port (`ls /dev/ttyUSB*`). Use `ttyUSB1`, not `ttyUSB0` (that is the JTAG programmer port).
3. After flashing, wait a second before running the client - the board reloads the design on reset.

**Permission denied on the port**
- Prefer adding your user to the `dialout` group rather than relaxing device permissions globally.
- You can also pass the intended port explicitly to avoid selecting the wrong serial device.

Permanent fix (takes effect after next login):
```bash
sudo usermod -aG dialout $USER
```

**`invalid JSON` error**
Make sure your input is valid JSON. Common mistakes:
- Strings need quotes: `"a": "12"` works (numeric string), `"a": 12` also works.
- The field names must be exactly `op`, `a`, `b`.
- The op value must be `"add"`, `"sub"`, or `"mul"` (lowercase, in quotes).
