# ts2v — TypeScript to SystemVerilog Compiler

**IEEE 1800-2017 compliant.** Write hardware in TypeScript. Get synthesizable SystemVerilog.

```
ts2v build cpu/ts/ --out cpu/build/ --board configs/tang_nano_9k.board.json
```

| Metric | Value |
|--------|-------|
| Tests | 392 passing |
| CPU Arch | nibble4 (4-bit, dual-core) |
| Board Support | Gowin, Xilinx, Intel, Lattice |
| Output | `always_ff`, `always_comb`, `typedef enum`, `case` |
| Reset | Async (negedge rst_n) + Sync + Active-high (posedge) |
