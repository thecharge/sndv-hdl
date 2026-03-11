
## Dual-Core nibble4 CPU (Penalty Deliverable)

A complete 4-bit dual-core SoC written in TypeScript and compiled through ts2v. Same architecture, same testbenches — runs on Tang Nano 9K or Arty A7.

### Architecture

```
┌─────────────────────────────────────────────────┐
│                 nibble4 Dual-Core SoC            │
│                                                  │
│  ┌──────────┐  ┌──────────┐                     │
│  │  Core 0  │  │  Core 1  │  4-bit data path    │
│  │  4 regs  │  │  4 regs  │  8-bit address      │
│  │  16 ISA  │  │  16 ISA  │  Z/C flags          │
│  └────┬─────┘  └────┬─────┘                     │
│       │              │                           │
│  ┌────┴──────────────┴────┐                     │
│  │    Round-Robin Arbiter  │                     │
│  └───────────┬─────────────┘                     │
│              │                                   │
│  ┌───────────┴─────────────┐                     │
│  │     Shared Memory Bus    │                     │
│  ├──────────┬──────┬───────┤                     │
│  │ RAM 240n │ UART │ LED   │                     │
│  │ 0x00-EF  │ 0xF0 │ 0xF2  │                     │
│  │          │      │       │                     │
│  │ Mutex    │Timer │CoreID │                     │
│  │ 0xF4     │0xF5-6│ 0xF3  │                     │
│  └──────────┴──────┴───────┘                     │
└─────────────────────────────────────────────────┘
```

### ISA (16 instructions)

| Opcode | Mnemonic | Operation |
|--------|----------|-----------|
| 0x0 | NOP | No operation |
| 0x1 | LDI Rx, imm | Load immediate into register |
| 0x2 | LD | Load from memory[R0] into R0 |
| 0x3 | ST | Store R1 to memory[R0] |
| 0x4 | ADD | R0 = R0 + R1, set Z/C |
| 0x5 | SUB | R0 = R0 - R1, set Z/C |
| 0x6 | AND | R0 = R0 & R1 |
| 0x7 | OR | R0 = R0 \| R1 |
| 0x8 | XOR | R0 = R0 ^ R1 |
| 0x9 | NOT | R0 = ~R0 |
| 0xA | SHL | R0 = R0 << 1, carry out |
| 0xB | SHR | R0 = R0 >> 1, carry out |
| 0xC | JMP addr | Jump to address |
| 0xD | JZ addr | Jump if zero flag set |
| 0xE | OUT | Write R0 to peripheral[0xF0+R1] |
| 0xF | HLT | Halt core |

### TypeScript Source → Generated SystemVerilog

```bash
# Compile the CPU
npx ts-node src/cli.ts compile cpu/ts/nibble4_core.ts -o cpu/build/nibble4_core.sv
npx ts-node src/cli.ts compile cpu/ts/nibble4_soc.ts  -o cpu/build/nibble4_soc.sv

# Run testbench (requires iverilog)
iverilog -g2012 -o cpu/build/sim \
  cpu/build/nibble4_core.sv \
  cpu/build/nibble4_soc.sv \
  cpu/build/nibble4_dual_soc_top.sv \
  cpu/build/tb_nibble4_dual_soc.sv
vvp cpu/build/sim
```

Both cores execute from shared RAM at address 0x00. Core differentiation via Core ID register (0xF3). Mutex at 0xF4 for synchronization.
