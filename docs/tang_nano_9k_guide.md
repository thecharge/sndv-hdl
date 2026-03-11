# Deploying to Tang Nano 9K

Complete guide for getting ts2v-generated modules running on a
Sipeed Tang Nano 9K (Gowin GW1NR-9C FPGA).

## Prerequisites

- Sipeed Tang Nano 9K board
- Gowin EDA (free education version from gowin.com.cn)
  OR openFPGALoader + Yosys with Gowin support (apicula)
- USB-C cable

## Understanding the architecture

ts2v Milestone 1 generates **combinational** Verilog modules.
A blinking LED needs a **sequential** counter driven by a clock.

The solution is a two-layer architecture:

```
[ts2v-generated combinational modules]  <-- auto-generated
              |
[hand-written sequential top-level]     <-- you write this once
              |
[FPGA hardware: clock, pins, LEDs]
```

The file `boards/tang_nano_9k/blinker_top.v` provides the sequential
wrapper. When Milestone 2 adds `always_ff` support, this wrapper
will also be auto-generated.

## Step-by-step: Blinker on Tang Nano 9K

### 1. Generate the Verilog modules

```bash
bun run build:examples
# Creates build/blinker.v with 6 combinational modules
```

### 2a. Using Gowin EDA (GUI)

1. Open Gowin EDA, create new project
2. Select device: GW1NR-LV9QN88PC6/I5
3. Add source files:
   - `build/blinker.v` (generated combinational modules)
   - `boards/tang_nano_9k/blinker_top.v` (sequential wrapper)
4. Add constraint file: `constraints/tang_nano_9k.cst`
5. Set `blinker_top` as the top module
6. Click Synthesize -> Place & Route -> Program

### 2b. Using open-source toolchain (Yosys + apicula)

```bash
# Synthesize
yosys -p "
  read_verilog build/blinker.v;
  read_verilog boards/tang_nano_9k/blinker_top.v;
  synth_gowin -top blinker_top -json build/blinker.json
"

# Place & route
nextpnr-gowin \
  --json build/blinker.json \
  --write build/blinker_pnr.json \
  --device GW1NR-LV9QN88PC6/I5 \
  --cst constraints/tang_nano_9k.cst

# Pack bitstream
gowin_pack -d GW1N-9C -o build/blinker.fs build/blinker_pnr.json

# Program
openFPGALoader -b tangnano9k build/blinker.fs
```

### 3. Verify

The 6 onboard LEDs should display a pattern that changes
approximately 1.6 times per second (27 MHz / 2^24).

## Pin mapping

| Signal | Pin | Board feature |
|--------|-----|---------------|
| sys_clk | 52 | 27 MHz oscillator |
| sys_rst_n | 4 | Button S2 |
| led[0] | 10 | User LED 0 |
| led[1] | 11 | User LED 1 |
| led[2] | 13 | User LED 2 |
| led[3] | 14 | User LED 3 |
| led[4] | 15 | User LED 4 |
| led[5] | 16 | User LED 5 |
| uart_tx | 17 | USB-UART TX |
| uart_rx | 18 | USB-UART RX |

## Troubleshooting

**LEDs don't blink**: Check that `blinker_top` is set as top module,
not one of the combinational sub-modules.

**Programming fails**: Try `openFPGALoader -b tangnano9k -f build/blinker.fs`
to write to flash instead of SRAM.

**All LEDs solid**: The LEDs are active-low. The top module inverts
the output with `assign led = ~pattern[5:0]`.

## Adapting for other boards

1. Copy `configs/tang_nano_9k.board.json` and edit pin assignments
2. Create a new `.cst` (Gowin) or `.xdc` (Xilinx) or `.qsf` (Intel) constraint file
3. Adjust the clock frequency in `blinker_top.v` (`PRESCALE_BITS` parameter)
4. Change the LED polarity if your board uses active-high LEDs
