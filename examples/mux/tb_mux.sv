// Testbench: mux — 2-to-1 multiplexer
// Compile and run (requires iverilog):
//   bun run apps/cli/src/index.ts compile examples/mux/mux.ts --out build/mux
//   iverilog -g2012 -o build/tb_mux build/mux/mux.sv examples/mux/tb_mux.sv && vvp build/tb_mux
`timescale 1ns / 1ps

module tb_mux;
    integer pass_count = 0;
    integer fail_count = 0;

    task check(input [31:0] actual, input [31:0] expected, input [255:0] label);
        if (actual === expected) begin
            pass_count = pass_count + 1;
        end else begin
            $display("FAIL %0s: got 0x%08h, expected 0x%08h", label, actual, expected);
            fail_count = fail_count + 1;
        end
    endtask

    reg        sel;
    reg [31:0] in_a, in_b;
    wire [31:0] result;

    mux_2to1 uut(.selector(sel), .input_a(in_a), .input_b(in_b), .result(result));

    initial begin
        // sel=0 (false) → select input_b
        sel = 1'b0; in_a = 32'd42; in_b = 32'd99; #10;
        check(result, 32'd99, "sel=0 selects input_b");

        // sel=1 (true) → select input_a
        sel = 1'b1; #10;
        check(result, 32'd42, "sel=1 selects input_a");

        // Edge: both inputs same
        in_a = 32'hDEAD; in_b = 32'hDEAD; sel = 1'b0; #10;
        check(result, 32'hDEAD, "same inputs");

        // Edge: zero and max
        in_a = 32'hFFFFFFFF; in_b = 32'd0;
        sel = 1'b1; #10;
        check(result, 32'hFFFFFFFF, "max when sel=1");

        sel = 1'b0; #10;
        check(result, 32'd0, "zero when sel=0");

        // Pattern check
        in_a = 32'hA5A5A5A5; in_b = 32'h5A5A5A5A;
        sel = 1'b1; #10;
        check(result, 32'hA5A5A5A5, "pattern A sel=1");

        sel = 1'b0; #10;
        check(result, 32'h5A5A5A5A, "pattern B sel=0");

        $display("");
        $display("mux testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
