
## What It Does

Write hardware in TypeScript:

```typescript
enum State { IDLE, FETCH, EXEC, HALT }

class Counter extends Module {
  @Input  clk: Logic<1>;
  @Output count: Logic<8> = 0;
  private state: Logic<2> = 0;

  @Sequential(clk)
  update() {
    switch (this.state) {
      case State.IDLE:
        this.state = State.FETCH;
        break;
      case State.FETCH:
        this.count = this.count + 1;
        this.state = State.EXEC;
        break;
    }
  }

  @Combinational
  status() {
    this.led = this.count > 0;
  }
}
```

Get IEEE 1800-2017 compliant SystemVerilog:

```systemverilog
typedef enum logic [1:0] {
    IDLE  = 2'd0,
    FETCH = 2'd1,
    EXEC  = 2'd2,
    HALT  = 2'd3
} State;

module Counter (
    input  wire logic       clk,
    input  wire logic       rst_n,    // auto-injected
    output      logic [7:0] count
);
    logic [1:0] state;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            count <= 8'd0;
            state <= 2'd0;
        end else begin
            case (state)
                IDLE: begin
                    state <= FETCH;
                end
                FETCH: begin
                    count <= count + 1;
                    state <= EXEC;
                end
            endcase
        end
    end

    always_comb begin
        led = count > 0;
    end
endmodule
```
