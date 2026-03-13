// Testbench: stdlib combinational modules
// Run: iverilog -o tb_stdlib build/stdlib.v testbenches/tb_stdlib.v && vvp tb_stdlib
`timescale 1ns / 1ps

module tb_stdlib;
    integer pass_count = 0;
    integer fail_count = 0;

    task check(input [31:0] actual, input [31:0] expected, input [255:0] label);
        if (actual === expected) begin
            pass_count = pass_count + 1;
        end else begin
            $display("FAIL %0s: got %0d (0x%08h), expected %0d (0x%08h)", label, actual, actual, expected, expected);
            fail_count = fail_count + 1;
        end
    endtask

    // -- mux2 --
    reg [31:0] mux_a, mux_b; reg mux_sel;
    wire [31:0] mux2_result;
    mux2 uut_mux2(.sel(mux_sel), .a(mux_a), .b(mux_b), .result(mux2_result));

    // -- min_unsigned --
    reg [31:0] min_a, min_b;
    wire [31:0] min_result;
    min_unsigned uut_min(.a(min_a), .b(min_b), .result(min_result));

    // -- max_unsigned --
    wire [31:0] max_result;
    max_unsigned uut_max(.a(min_a), .b(min_b), .result(max_result));

    // -- saturating_add --
    reg [31:0] sat_a, sat_b, sat_max;
    wire [31:0] sat_result;
    saturating_add uut_sat(.a(sat_a), .b(sat_b), .max_value(sat_max), .result(sat_result));

    // -- parity_8bit --
    reg [31:0] parity_in;
    wire parity_result;
    parity_8bit uut_parity(.data(parity_in), .result(parity_result));

    initial begin
        // Mux2: sel=0 -> a
        mux_sel = 1'b0; mux_a = 32'd42; mux_b = 32'd99; #10;
        check(mux2_result, 32'd42, "mux2 sel=0");

        // Mux2: sel=1 -> b
        mux_sel = 1'b1; #10;
        check(mux2_result, 32'd99, "mux2 sel=1");

        // Min
        min_a = 32'd10; min_b = 32'd20; #10;
        check(min_result, 32'd10, "min(10,20)");

        min_a = 32'd20; min_b = 32'd10; #10;
        check(min_result, 32'd10, "min(20,10)");

        // Max
        min_a = 32'd10; min_b = 32'd20; #10;
        check(max_result, 32'd20, "max(10,20)");

        // Saturating add: no saturation
        sat_a = 32'd10; sat_b = 32'd20; sat_max = 32'd255; #10;
        check(sat_result, 32'd30, "sat add no overflow");

        // Saturating add: saturates
        sat_a = 32'd200; sat_b = 32'd100; sat_max = 32'd255; #10;
        check(sat_result, 32'd255, "sat add overflow");

        // Parity: 0x00 = even parity (0)
        parity_in = 32'h00; #10;
        check({31'd0, parity_result}, 32'd0, "parity 0x00");

        // Parity: 0x01 = odd parity (1)
        parity_in = 32'h01; #10;
        check({31'd0, parity_result}, 32'd1, "parity 0x01");

        // Parity: 0xFF = even parity (0)
        parity_in = 32'hFF; #10;
        check({31'd0, parity_result}, 32'd0, "parity 0xFF");

        // Parity: 0x0F = even parity (0) - 4 bits set
        parity_in = 32'h0F; #10;
        check({31'd0, parity_result}, 32'd0, "parity 0x0F");

        // Parity: 0x07 = odd parity (1) - 3 bits set
        parity_in = 32'h07; #10;
        check({31'd0, parity_result}, 32'd1, "parity 0x07");

        $display("");
        $display("stdlib testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
