## IEEE 1800-2017 Compliance

Every generated file includes:

```systemverilog
`timescale 1ns / 1ps          // Clause 22: Time precision
`default_nettype none          // Safety: catch undeclared nets
// ... module body ...
`default_nettype wire          // Restore default
```

### Compliance Checklist (Spec §8)

| Requirement | Status |
|-------------|--------|
| Explicit `timeunit`/`timeprecision` | ✅ `timescale 1ns/1ps` |
| ANSI port style | ✅ `module X (input wire logic ...)` |
| `always_comb` / `always_ff` only (no generic `always`) | ✅ |
| Non-blocking in sequential, blocking in combinational | ✅ |
| `typedef enum logic [W-1:0]` with explicit sizing | ✅ |
| `case`/`endcase` with `default` | ✅ |
| No vendor-specific pragmas | ✅ |

### What's Not Yet Implemented

| Feature | Spec Section | Status |
|---------|-------------|--------|
| Module hierarchy (`new Child()`) | §3.3 | Planned |
| `async/await` FSM inference | §5 | Partial (while loops recognized) |
| SystemVerilog `class` (verification) | §5.1 | Planned |
| UVM-Lite layer | §25 | Planned |
| SVA assertions | §17 | Planned |
| Clock domain crossing checks | §26 | Planned |
| DPI-C bridge generation | §18 | Planned |
| Pipeline operator (`\|>`) | §61 | Planned |
