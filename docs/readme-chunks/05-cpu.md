## nibble4 CPU (Penalty Deliverable)

A 4-bit dual-core CPU written in TypeScript, compiled through ts2v to synthesizable SystemVerilog.

### Architecture

- **Data path:** 4-bit (nibble)
- **Registers:** R0-R3 (4-bit each), PC (8-bit), flags Z/C
- **Instruction:** 8-bit (4-bit opcode + 4-bit operand)
- **Cores:** 2 (shared RAM via round-robin arbiter)
- **Peripherals:** UART TX (115200 8N1), LED output, hardware mutex, timer

### ISA (16 instructions)

| Op | Name | Encoding | Action |
|----|------|----------|--------|
| 0 | NOP | `0x 0r` | No operation |
| 1 | LDI | `1r imm` | R[r] = imm |
| 2 | LD  | `2x 00` | R0 = MEM[R0] |
| 3 | ST  | `3x 00` | MEM[R0] = R1 |
| 4 | ADD | `4x 00` | R0 = R0 + R1, set Z/C |
| 5 | SUB | `5x 00` | R0 = R0 - R1, set Z/C |
| 6 | AND | `6x 00` | R0 = R0 & R1 |
| 7 | OR  | `7x 00` | R0 = R0 \| R1 |
| 8 | XOR | `8x 00` | R0 = R0 ^ R1 |
| 9 | NOT | `9x 00` | R0 = ~R0 |
| A | SHL | `Ax 00` | R0 = R0 << 1, C = MSB |
| B | SHR | `Bx 00` | R0 = R0 >> 1, C = LSB |
| C | JMP | `Cx addr`| PC = addr |
| D | JZ  | `Dx addr`| if Z: PC = addr |
| E | OUT | `Ex 00` | PERIPH[0xF0+R1] = R0 |
| F | HLT | `Fx 00` | Halt |

### Source Files

| File | What |
|------|------|
| `cpu/ts/nibble4_core.ts` | CPU core (TypeScript) |
| `cpu/ts/nibble4_soc.ts` | Arbiter + Memory + UART (TypeScript) |
| `cpu/build/nibble4_core.sv` | Generated SystemVerilog (282 lines) |
| `cpu/build/nibble4_soc.sv` | Generated SystemVerilog (252 lines) |
| `cpu/build/tb_nibble4_core.sv` | Testbench (exercises LDI+ADD, JZ, AND) |

### Compile

```bash
bun run apps/cli/src/index.ts compile cpu/ts/ --out cpu/build --board configs/tang_nano_9k.board.json
```

### Simulate (iverilog)

```bash
iverilog -g2012 -o sim.vvp cpu/build/nibble4_core.sv cpu/build/tb_nibble4_core.sv
vvp sim.vvp
```
