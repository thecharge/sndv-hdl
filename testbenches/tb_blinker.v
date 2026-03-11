// Testbench: blinker combinational modules
// Run: iverilog -o tb_blinker build/blinker.v testbenches/tb_blinker.v && vvp tb_blinker
`timescale 1ns / 1ps

module tb_blinker;
    integer pass_count = 0;
    integer fail_count = 0;

    task check(input [31:0] actual, input [31:0] expected, input [255:0] label);
        if (actual === expected) begin
            pass_count = pass_count + 1;
        end else begin
            $display("FAIL %0s: got %0d, expected %0d", label, actual, expected);
            fail_count = fail_count + 1;
        end
    endtask

    // -- blinker_counter_next --
    reg  [31:0] cnt_current, cnt_enable;
    wire [31:0] cnt_result;
    blinker_counter_next uut_cnt(.current_count(cnt_current), .enable(cnt_enable), .result(cnt_result));

    // -- blinker_prescaler_next --
    reg  [31:0] pre_value, pre_max;
    wire [31:0] pre_result;
    blinker_prescaler_next uut_pre(.prescaler_value(pre_value), .prescaler_max(pre_max), .result(pre_result));

    // -- blinker_prescaler_tick --
    wire pre_tick_result;
    blinker_prescaler_tick uut_tick(.prescaler_value(pre_value), .prescaler_max(pre_max), .result(pre_tick_result));

    // -- blinker_toggle --
    reg         tog_state;
    reg  [31:0] tog_enable;
    wire        tog_result;
    blinker_toggle uut_tog(.current_state(tog_state), .enable(tog_enable), .result(tog_result));

    initial begin
        // Counter: disabled stays at current
        cnt_current = 32'd5; cnt_enable = 32'd0; #10;
        check(cnt_result, 32'd5, "counter disabled");

        // Counter: enabled increments
        cnt_enable = 32'd1; #10;
        check(cnt_result, 32'd6, "counter enabled");

        // Prescaler: below max increments
        pre_value = 32'd10; pre_max = 32'd100; #10;
        check(pre_result, 32'd11, "prescaler increment");

        // Prescaler: at max resets to 0
        pre_value = 32'd100; #10;
        check(pre_result, 32'd0, "prescaler reset");

        // Prescaler tick: not at max = no tick
        pre_value = 32'd10; #10;
        check({31'd0, pre_tick_result}, 32'd0, "prescaler no tick");

        // Prescaler tick: at max = tick
        pre_value = 32'd100; #10;
        check({31'd0, pre_tick_result}, 32'd1, "prescaler tick");

        // Toggle: disabled keeps state
        tog_state = 1'b0; tog_enable = 32'd0; #10;
        check({31'd0, tog_result}, 32'd0, "toggle disabled 0");

        tog_state = 1'b1; #10;
        check({31'd0, tog_result}, 32'd1, "toggle disabled 1");

        // Toggle: enabled flips
        tog_state = 1'b0; tog_enable = 32'd1; #10;
        check({31'd0, tog_result}, 32'd1, "toggle flip 0->1");

        tog_state = 1'b1; #10;
        check({31'd0, tog_result}, 32'd0, "toggle flip 1->0");

        $display("");
        $display("blinker testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
