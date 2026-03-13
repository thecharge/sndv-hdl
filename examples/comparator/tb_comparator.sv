// Testbench: comparator — is_greater, is_equal, shift, mask operations
// Compile and run (requires iverilog):
//   bun run apps/cli/src/index.ts compile examples/comparator/comparator.ts --out build/comparator
//   iverilog -g2012 -o build/tb_comparator build/comparator/comparator.sv examples/comparator/tb_comparator.sv && vvp build/tb_comparator
`timescale 1ns / 1ps

module tb_comparator;
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

    // -- is_greater --
    reg  [31:0] val_a, val_b;
    wire        greater_result;
    is_greater uut_gt(.value_a(val_a), .value_b(val_b), .result(greater_result));

    // -- is_equal --
    wire equal_result;
    is_equal uut_eq(.value_a(val_a), .value_b(val_b), .result(equal_result));

    // -- shift_left_by_4 --
    reg  [31:0] shift_in;
    wire [31:0] shl_result;
    shift_left_by_4 uut_shl(.data_in(shift_in), .result(shl_result));

    // -- shift_right_by_4 --
    wire [31:0] shr_result;
    shift_right_by_4 uut_shr(.data_in(shift_in), .result(shr_result));

    // -- mask_lower_byte --
    wire [31:0] mask_result;
    mask_lower_byte uut_mask(.data_in(shift_in), .result(mask_result));

    initial begin
        // is_greater: a > b
        val_a = 32'd10; val_b = 32'd5; #10;
        check({31'd0, greater_result}, 32'd1, "10>5 true");

        val_a = 32'd5; val_b = 32'd10; #10;
        check({31'd0, greater_result}, 32'd0, "5>10 false");

        val_a = 32'd7; val_b = 32'd7; #10;
        check({31'd0, greater_result}, 32'd0, "7>7 false");

        // is_equal
        val_a = 32'd42; val_b = 32'd42; #10;
        check({31'd0, equal_result}, 32'd1, "42==42 true");

        val_a = 32'd1; val_b = 32'd2; #10;
        check({31'd0, equal_result}, 32'd0, "1==2 false");

        // shift_left_by_4: value * 16
        shift_in = 32'h0000000F; #10;
        check(shl_result, 32'h000000F0, "shl 0x0F -> 0xF0");

        shift_in = 32'h00000001; #10;
        check(shl_result, 32'h00000010, "shl 1 -> 16");

        // shift_right_by_4: value / 16
        shift_in = 32'h000000F0; #10;
        check(shr_result, 32'h0000000F, "shr 0xF0 -> 0x0F");

        // mask_lower_byte: keep only bits [7:0]
        shift_in = 32'hDEADBEEF; #10;
        check(mask_result, 32'h000000EF, "mask 0xDEADBEEF -> 0xEF");

        shift_in = 32'h12345678; #10;
        check(mask_result, 32'h00000078, "mask 0x12345678 -> 0x78");

        $display("");
        $display("comparator testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
