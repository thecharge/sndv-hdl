# Aurora UART

An 8-pixel rainbow wave you can control in real time from your PC over USB.

The FPGA drives a WS2812 LED strip with a smooth colour animation.
You send one-letter commands over serial and the animation changes instantly.
The FPGA replies with `K` to confirm every command it understood.

---

## What You Need

- Tang Nano 20K board
- WS2812 LED strip (8 pixels or more), connected to **pin 79**
- USB cable (the one you use for programming)
- `/dev/ttyUSB1` - the UART bridge on the same USB cable

> **Pin sharing note:** pins 15 and 16 are the UART TX/RX lines in this design.
> Those same pins are `led[0]` and `led[1]` on the board, so the two onboard LEDs
> nearest the USB connector will not light up while this firmware is running.
> The other four onboard LEDs are also unused. All visible output is on the WS2812 strip.

---

## Flash

```bash
./examples/hardware/tang_nano_20k/aurora_uart/flash.sh
```

What this does: compiles the TypeScript hardware to SystemVerilog, synthesises with Yosys,
place-and-routes with nextpnr, packs with gowin_pack, and writes the bitstream to the
board's external flash. The board reloads the new design immediately.

---

## Run the Client

```bash
./examples/hardware/tang_nano_20k/aurora_uart/run.sh
```

The helper auto-detects the UART port only when exactly two `ttyUSB` devices are present.
If you have additional USB serial devices attached, pass the port explicitly:

```bash
./examples/hardware/tang_nano_20k/aurora_uart/run.sh /dev/ttyUSB2
```

You can also run the client directly with Bun:

```bash
bun examples/hardware/tang_nano_20k/aurora_uart/client/aurora.ts
```

---

## Commands

| Key             | What it does                                             |
| --------------- | -------------------------------------------------------- |
| `a` or `aurora` | Rainbow wave animation (this is the default on power-up) |
| `r` or `red`    | All 8 pixels solid red                                   |
| `g` or `green`  | All 8 pixels solid green                                 |
| `b` or `blue`   | All 8 pixels solid blue                                  |
| `f` or `faster` | 8x animation speed                                       |
| `s` or `slower` | Back to normal 1x speed                                  |
| `x` or `freeze` | Hold the current colours, stop animating                 |
| `q` or `quit`   | Exit the client (board keeps running)                    |

The FPGA echoes the letter `K` (ASCII 75) after every command it recognises.
You will see `<< ACK 'K'` in the client when this happens.

You can also hold the **S2 button** (pin 87) on the board at any time to switch to
fast mode without using the client.

---

## JSON Client

If you want to drive the animation from a script or another program, use the JSON client:

```bash
bun examples/hardware/tang_nano_20k/aurora_uart/client/aurora-json.ts
```

Send one JSON object per line. Every event (sent command, ACK received, error) is
written to stdout as JSON:

```
input:  {"cmd": "red"}
output: {"type":"sent","cmd":"red","byte":"r","hex":"0x72"}
output: {"type":"ack","raw":"K","hex":"0x4b"}
```

```
input:  {"cmd": "faster"}
input:  {"cmd": "aurora"}
input:  {"cmd": "quit"}
```

Pipe mode works too:

```bash
echo '{"cmd":"freeze"}' | bun client/aurora-json.ts
```

---

## How the Colour Works

Hue is a number from 0 to 255. The 8 pixels always span the full wheel - pixel 0 starts
at the current hue, and each next pixel is offset by 1/8 of the wheel (32 steps), so all
8 pixels are always showing different colours.

The hue maps to RGB using three linear segments, giving a smooth gradient with no
abrupt jumps:

| Hue range | Green       | Red         | Blue        |
| --------- | ----------- | ----------- | ----------- |
| 0 - 84    | rises 0→252 | falls 252→0 | 0           |
| 85 - 169  | falls 252→0 | 0           | rises 0→252 |
| 170 - 255 | 0           | rises 0→252 | falls 252→0 |

One full revolution at normal speed takes about 10 seconds. At fast speed it takes about 1.2 seconds.

---

## UART Details

| Setting     | Value                                    |
| ----------- | ---------------------------------------- |
| Port        | `/dev/ttyUSB1`                           |
| Baud rate   | 115200                                   |
| Format      | 8N1 (8 data bits, no parity, 1 stop bit) |
| Direction   | bidirectional                            |
| FPGA TX pin | 15 (`uart_tx`)                           |
| FPGA RX pin | 16 (`uart_rx`)                           |

The FPGA samples the start bit at its centre (half a bit period after the falling edge) so
it handles small timing differences on either end cleanly.

---

## File Layout

```
aurora_uart/
  hw/              Hardware source - compiled to the FPGA bitstream
    aurora_uart_rx.ts    UART receiver (8N1, 115200 baud)
    aurora_uart_tx.ts    UART transmitter (8N1, 115200 baud)
    aurora_gen_uart.ts   Rainbow generator + command handler
    aurora_serialiser.ts WS2812 bit-bang serialiser
    aurora_uart_top.ts   Top-level wiring
  client/          PC-side scripts - never compiled to hardware
    aurora.ts            Interactive terminal client
    aurora-json.ts       JSON pipe client (for scripting)
    aurora.py            Python alternative client
  flash.sh         Compile + flash the hw/ folder
  run.sh           Launch aurora.ts against /dev/ttyUSB1
  README.md        This file
```

---

## Troubleshooting

**WS2812 shows nothing after flash**
- Check that the data wire is on pin 79, not a neighbouring pin.
- Make sure the strip has its own power supply (5V, enough amps for your strip length).
- Make sure GND is shared between the strip and the board.
- The on-board single WS2812C-2020 (also on pin 79) should at minimum show pixel 0 changing colour, even with no external strip.

**No `<< ACK 'K'` after commands**
- Check you are on the right port. Run `ls /dev/ttyUSB*` to see what is available.
  The Tang Nano 20K FTDI bridge always appears as two ports: `ttyUSB0` (JTAG, for flashing) and `ttyUSB1` (UART, for this client).
- If the port does not exist, the USB cable may not be fully seated or the driver is not loaded.

**Permission denied on the port**
- Prefer adding your user to the `dialout` group rather than relaxing device permissions globally.
- You can also pass the intended port explicitly to avoid selecting the wrong serial device.

Permanent fix (takes effect after next login):
```bash
sudo usermod -aG dialout $USER
```
