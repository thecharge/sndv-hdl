## Board Support (Spec §62)

The compiler generates vendor-specific constraint files from `board.json`.

```bash
bun run apps/cli/src/index.ts compile examples/blinker.ts --out build --board configs/tang_nano_9k.board.json  # → .cst
bun run apps/cli/src/index.ts compile examples/blinker.ts --out build --board configs/arty_a7.board.json       # → .xdc
bun run apps/cli/src/index.ts compile examples/blinker.ts --out build --board configs/de10_nano.board.json     # → .qsf
```

### Supported Vendors

| Vendor | Format | Config Key |
|--------|--------|------------|
| Gowin (Tang Nano) | `.cst` | `"vendor": "gowin"` |
| Xilinx (Vivado) | `.xdc` | `"vendor": "xilinx"` |
| Intel (Quartus) | `.qsf` | `"vendor": "intel"` |
| Lattice (Diamond) | `.lpf` | `"vendor": "lattice"` |

### Board Config Format

```json
{
  "board": {
    "vendor": "gowin",
    "family": "GW1NR",
    "part": "GW1NR-LV9QN88PC6/I5",
    "pins": {
      "sys_clk": "52",
      "uart_tx": "17",
      "led_0": "10"
    },
    "io_standard": "LVCMOS33"
  }
}
```

### Generated Output (Gowin .cst)

```
IO_LOC "sys_clk" 52;
IO_PORT "sys_clk" IO_TYPE=LVCMOS33;
IO_LOC "uart_tx" 17;
IO_PORT "uart_tx" IO_TYPE=LVCMOS33;
```
