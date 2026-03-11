// Testbench: alu combinational modules
// Run: iverilog -o tb_alu build/alu.v testbenches/tb_alu.v && vvp tb_alu
`timescale 1ns / 1ps

module tb_alu;
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

    wire [31:0] add_result, sub_result, and_result, or_result, xor_result;

    alu_add      uut_add(.operand_a(a), .operand_b(b), .result(add_result));
    alu_subtract uut_sub(.operand_a(a), .operand_b(b), .result(sub_result));
    alu_bitwise_and uut_and(.operand_a(a), .operand_b(b), .result(and_result));
    alu_bitwise_or  uut_or(.operand_a(a), .operand_b(b), .result(or_result));
    alu_bitwise_xor uut_xor(.operand_a(a), .operand_b(b), .result(xor_result));

    initial begin
        // Basic arithmetic
        a = 32'd10; b = 32'd3; #10;
        check(add_result, 32'd13, "10+3=13");
        check(sub_result, 32'd7,  "10-3=7");

        // Zero cases
        a = 32'd0; b = 32'd0; #10;
        check(add_result, 32'd0, "0+0=0");
        check(sub_result, 32'd0, "0-0=0");

        // Bitwise with known patterns
        a = 32'hFF00FF00; b = 32'h0F0F0F0F; #10;
        check(and_result, 32'h0F000F00, "AND pattern");
        check(or_result,  32'hFF0FFF0F, "OR pattern");
        check(xor_result, 32'hF00FF00F, "XOR pattern");

        // All ones
        a = 32'hFFFFFFFF; b = 32'hFFFFFFFF; #10;
        check(and_result, 32'hFFFFFFFF, "AND all ones");
        check(xor_result, 32'h00000000, "XOR all ones = 0");

        // Large values
        a = 32'h7FFFFFFF; b = 32'd1; #10;
        check(add_result, 32'h80000000, "max_int + 1 overflow");

        $display("");
        $display("alu testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
