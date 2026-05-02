# nibble4 - 4-bit CPU on Tang Nano 20K

A minimal 4-bit CPU implemented in ts2v (TypeScript -> SystemVerilog), with a UART bootloader
for loading programs at runtime.

## Quick Start

```bash
# 1. Flash the SoC bitstream
./examples/cpu/nibble4/flash.sh
# Unplug and replug USB to power-cycle the board.

# 2. Load the counter demo (default program)
./examples/cpu/nibble4/load.sh

# 3. Monitor UART output
./examples/cpu/nibble4/run.sh
# Expected: 0x00 (0), 0x01 (1), ... 0x0F (15), 0x00 (0), ... (repeating)
```

To load a custom program:
```bash
./examples/cpu/nibble4/load.sh examples/cpu/nibble4/programs/my_program.n4asm
```

---

## ISA Reference

nibble4 is a Harvard-style 4-bit CPU with 8-bit instruction words (two nibbles per instruction,
plus an optional third nibble for immediates). All registers are 4 bits wide.

### Registers

| Name | Description                   |
|------|-------------------------------|
| `r0` | Accumulator / general purpose |
| `r1` | General purpose / port offset |
| `r2` | General purpose               |
| `r3` | General purpose               |

Flags: `flag_z` (zero), `flag_c` (carry/borrow from ADD/SUB).

### Instructions

| Mnemonic       | Nibbles | Operation                                   |
|----------------|---------|---------------------------------------------|
| `NOP`          | 2       | No operation                                |
| `LDI r<n>, k`  | 3       | r\<n\> = k (4-bit immediate)                |
| `LD  r<n>`     | 2       | r\<n\> = mem[r0]  (r0 = address 0..15)      |
| `ST  r<n>`     | 2       | mem[r0] = r1                                |
| `ADD`          | 2       | r0 = r0 + r1  (sets flag_z, flag_c)         |
| `SUB`          | 2       | r0 = r0 - r1  (sets flag_z, flag_c)         |
| `AND`          | 2       | r0 = r0 & r1  (sets flag_z)                 |
| `OR`           | 2       | r0 = r0 \| r1  (sets flag_z)                |
| `XOR`          | 2       | r0 = r0 ^ r1  (sets flag_z)                 |
| `NOT`          | 2       | r0 = ~r0 & 0xF  (sets flag_z)              |
| `SHL`          | 2       | r0 = (r0 << 1) & 0xF  (sets flag_c)        |
| `SHR`          | 2       | r0 = r0 >> 1  (sets flag_c)                |
| `JMP label`    | 3       | pc = target  (label or 4-bit literal 0..15) |
| `JZ  label`    | 3       | if flag_z == 1: pc = target                 |
| `OUT`          | 2       | write r0 to peripheral 0xF0 + r1           |
| `HLT`          | 2       | halt CPU                                    |

> **JMP/JZ target** must be a label or literal in range 0..15. Programs longer than 16 nibbles
> can still call back to the first 16 nibble addresses.

### Memory Map

| Address     | Description                                      |
|-------------|--------------------------------------------------|
| 0x00-0x1F   | Program RAM (32 nibble cells, 4 bits each)       |
| 0x20-0xEF   | Reserved (reads as 0)                            |
| 0xF0        | UART TX - write nibble, sends byte 0x00..0x0F   |
| 0xF1        | UART TX busy (1 = busy, read-only)               |
| 0xF2        | LED output register (4 bits, low-active)         |
| 0xF4        | Mutex lock (read = test-and-set; write = unlock) |
| 0xF5        | Timer low nibble (free-running)                  |
| 0xF6        | Timer high nibble                                |

### OUT instruction detail

```
OUT               ; r0 -> peripheral at 0xF0 + r1
```

- `r1 = 0`: UART TX at 0xF0 - sends byte `0x00 | (r0 & 0xF)` over serial
- The CPU **stalls** while UART is busy (HW back-pressure, no busy-poll needed)
- Host receives bytes 0x00..0x0F; the nibble value is in bits [3:0]

---

## UART Bootloader Protocol

The FPGA holds the CPU in reset until a valid program is loaded over UART (115200 8N1).

```
Host sends:  0xAA          - sync byte
             N             - nibble count (1..31)
             byte_0        - nibble[0] in bits[3:0], bits[7:4] = 0
             byte_1        - nibble[1]
             ...
             byte_{N-1}

FPGA:        loads nibbles into program RAM[0..N-1]
             releases CPU reset -> CPU begins executing
```

Reset/abort: send `0xFF` at any time to return the bootloader to the sync-wait state.

---

## Assembler

```bash
bun run examples/cpu/nibble4/tools/assemble.ts <file.n4asm>
# Produces <file.bin> in the same directory.
```

Assembly format:
```asm
; comment
label:
    MNEMONIC [operands]     ; inline comment
```

Example:
```asm
; Blink LED: toggle 0xF2 repeatedly
    LDI r0, 0       ; r0 = LED pattern (all off)
    LDI r1, 2       ; r1 = 2 (LED peripheral offset: 0xF0 + 2 = 0xF2)
loop:
    OUT             ; send r0 to LED register
    NOT             ; r0 = ~r0 (toggle)
    JMP loop
```

---

## File Layout

```
examples/cpu/nibble4/
  nibble4_core.ts        - CPU execution engine
  nibble4_soc.ts         - RAM + peripherals + UART TX
  nibble4_bootloader.ts  - UART RX bootloader
  nibble4_top.ts         - Top-level SoC
  programs/
    counter.n4asm        - Count 0..15 forever over UART
    counter.bin          - Assembled binary (generated)
  tools/
    assemble.ts          - Assembler
    load.ts              - UART loader
  flash.sh               - Compile + flash bitstream
  load.sh                - Assemble program + send to FPGA
  run.sh                 - Monitor UART output
```
