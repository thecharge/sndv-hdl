## Translation Rules

| TypeScript | SystemVerilog | Spec § |
|---|---|---|
| `class X extends Module` | `module X (...)` | §3.1 |
| `@Input prop: Logic<N>` | `input wire logic [N-1:0] prop` | §3.2 |
| `@Output prop: Logic<N> = V` | `output logic [N-1:0] prop` + reset to V | §3.2, §52 |
| `private prop: Logic<N> = V` | `logic [N-1:0] prop` + reset to V | §3.1 |
| `private readonly C = V` | `localparam C = V` | §3.1 |
| `@Sequential(clk)` | `always_ff @(posedge clk or negedge rst_n)` | §4.2, §52 |
| `@Combinational` | `always_comb` | §4.1 |
| `this.x = expr` (in `@Sequential`) | `x <= expr` (non-blocking) | §4.3 |
| `this.x = expr` (in `@Combinational`) | `x = expr` (blocking) | §4.3 |
| `enum State { A, B, C }` | `typedef enum logic [1:0] { A=0, B=1, C=2 } State` | §9.1 |
| `switch (this.state)` | `case (state)` | §10.2 |
| `this.a === this.b` | `a == b` | - |
| `~this.a` | `~a` | - |
| `this.count++` | `count <= count + 1` | - |
| Property init `= 0` | Reset value in `if (!rst_n)` block | §52.1 |
