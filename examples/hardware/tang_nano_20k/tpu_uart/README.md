# tpu_uart - Tensor Processing Unit over UART

A minimal TPU implemented on the Tang Nano 20K FPGA. Performs dot products, MAC accumulation, ReLU activation, and accumulator reset on 4-element 8-bit vectors, communicating over USB serial at 115200 baud.

## Operations

| Op | Code | Description |
|----|------|-------------|
| `dot` | 0 | Compute a·b = a0\*b0+a1\*b1+a2\*b2+a3\*b3. Result returned; accumulator unchanged. |
| `mac` | 1 | acc += a·b; result = new accumulator value. |
| `relu` | 2 | result = max(0, signed acc). Accumulator set to result. |
| `reset_acc` | 3 | acc = 0; result = 0. |

All results are 16-bit unsigned, returned as 2 bytes big-endian.

## UART Protocol

**Host to FPGA:**
- Byte 0: op code (0-3)
- Bytes 1-8 (dot/mac only): a0, a1, a2, a3, b0, b1, b2, b3 (8-bit unsigned each)
- relu and reset_acc send only the 1-byte op code

**FPGA to Host:**
- 2 bytes big-endian 16-bit result

Baud: 115200 8N1. Clock: 27 MHz. Bit period: 234 clocks.

## Hardware Architecture

```
TpuTop
  ├── TpuUartRx  (UART 8N1 receiver)
  ├── TpuEngine  (state machine: receive → compute → send)
  └── TpuUartTx  (UART 8N1 transmitter)
```

The engine processes one operation at a time. The accumulator is a persistent 16-bit register inside the engine, so MAC operations accumulate across multiple calls until `reset_acc` is sent.

ReLU treats the accumulator as a signed 16-bit value: if bit 15 is set (acc >= 32768), the result is 0.

## Flash

```bash
./examples/hardware/tang_nano_20k/tpu_uart/flash.sh
```

After flashing: **unplug and replug the USB cable** to power-cycle the board. The GW2AR-18C loads the bitstream from external flash on power-on.

## Run

```bash
./examples/hardware/tang_nano_20k/tpu_uart/run.sh
```

Or specify the port explicitly:

```bash
bun examples/hardware/tang_nano_20k/tpu_uart/client/tpu.ts /dev/ttyUSB1
```

## Example Session

```
> {"op":"dot","a":[1,2,3,4],"b":[4,3,2,1]}
{"op":"dot","a":[1,2,3,4],"b":[4,3,2,1],"result":20,"ms":3}

> {"op":"mac","a":[1,0,0,0],"b":[5,0,0,0]}
{"op":"mac","a":[1,0,0,0],"b":[5,0,0,0],"result":5,"ms":3}

> {"op":"mac","a":[0,1,0,0],"b":[0,10,0,0]}
{"op":"mac","a":[0,1,0,0],"b":[0,10,0,0],"result":15,"ms":3}

> {"op":"relu"}
{"op":"relu","result":15,"ms":2}

> {"op":"reset_acc"}
{"op":"reset_acc","result":0,"ms":2}
```

Dot product `[1,2,3,4]·[4,3,2,1]` = 1\*4 + 2\*3 + 3\*2 + 4\*1 = 20.

## Diagnostic

```bash
bun examples/hardware/tang_nano_20k/tpu_uart/client/diag.ts /dev/ttyUSB1
```

Sends a single dot product command and verifies the result. Expected output:

```
OK   opened fd=5 on /dev/ttyUSB1
OK   stty configured 115200 8N1 raw -crtscts
OK   sent bytes: [0, 1, 2, 3, 4, 4, 3, 2, 1]
     sleeping 500 ms...
     readSync attempt 1: k=2  total=2
OK   result=20 (expected 20)  raw=[0, 20]
```

## Compile Manually

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/tpu_uart/hw \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/tpu_uart
```
