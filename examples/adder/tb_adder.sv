// Testbench: adder — 32-bit combinational adder
// Compile and run (requires iverilog):
//   bun run apps/cli/src/index.ts compile examples/adder/adder.ts --out build/adder
//   iverilog -g2012 -o build/tb_adder build/adder/adder.sv examples/adder/tb_adder.sv && vvp build/tb_adder
`timescale 1ns / 1ps

module tb_adder;
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

    reg  [31:0] a, b;
    wire [31:0] result;

    adder uut(.operand_a(a), .operand_b(b), .result(result));

    initial begin
        // Zero + zero
        a = 32'd0; b = 32'd0; #10;
        check(result, 32'd0, "0+0=0");

        // Basic addition
        a = 32'd10; b = 32'd5; #10;
        check(result, 32'd15, "10+5=15");

        // Large values
        a = 32'd1000000; b = 32'd999999; #10;
        check(result, 32'd1999999, "large add");

        // Wrap-around
        a = 32'hFFFFFFFF; b = 32'd1; #10;
        check(result, 32'd0, "wraparound");

        // Max + max
        a = 32'hFFFFFFFF; b = 32'hFFFFFFFF; #10;
        check(result, 32'hFFFFFFFE, "max+max");

        // Commutativity
        a = 32'd42; b = 32'd58; #10;
        check(result, 32'd100, "42+58=100");

        $display("");
        $display("adder testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
