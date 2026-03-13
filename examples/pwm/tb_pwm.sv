// Testbench: pwm combinational modules
// Run: iverilog -o tb_pwm build/pwm.v testbenches/tb_pwm.v && vvp tb_pwm
`timescale 1ns / 1ps

module tb_pwm;
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

    // -- pwm_output --
    reg  [31:0] counter_val, duty_cycle;
    wire        pwm_out_result;
    pwm_output uut_pwm(.counter_value(counter_val), .duty_cycle(duty_cycle), .result(pwm_out_result));

    // -- pwm_counter_next --
    reg  [31:0] cnt_val, period;
    wire [31:0] cnt_next_result;
    pwm_counter_next uut_cnt(.counter_value(cnt_val), .period(period), .result(cnt_next_result));

    // -- pwm_clamp_duty --
    reg  [31:0] req_duty, max_duty, min_duty;
    wire [31:0] clamp_result;
    pwm_clamp_duty uut_clamp(.requested_duty(req_duty), .max_duty(max_duty), .min_duty(min_duty), .result(clamp_result));

    initial begin
        // PWM output: below duty = high
        counter_val = 32'd50; duty_cycle = 32'd100; #10;
        check({31'd0, pwm_out_result}, 32'd1, "pwm below duty");

        // PWM output: above duty = low
        counter_val = 32'd150; duty_cycle = 32'd100; #10;
        check({31'd0, pwm_out_result}, 32'd0, "pwm above duty");

        // PWM output: at duty = low
        counter_val = 32'd100; duty_cycle = 32'd100; #10;
        check({31'd0, pwm_out_result}, 32'd0, "pwm at duty");

        // Counter: below period increments
        cnt_val = 32'd50; period = 32'd255; #10;
        check(cnt_next_result, 32'd51, "counter increment");

        // Counter: at period resets
        cnt_val = 32'd255; period = 32'd255; #10;
        check(cnt_next_result, 32'd0, "counter reset");

        // Clamp: within range passes through
        req_duty = 32'd50; max_duty = 32'd200; min_duty = 32'd10; #10;
        check(clamp_result, 32'd50, "clamp passthrough");

        // Clamp: above max clamps to max
        req_duty = 32'd250; #10;
        check(clamp_result, 32'd200, "clamp to max");

        // Clamp: below min clamps to min
        req_duty = 32'd5; #10;
        check(clamp_result, 32'd10, "clamp to min");

        $display("");
        $display("pwm testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
