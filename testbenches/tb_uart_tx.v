// Testbench: uart_tx combinational modules
// Run: iverilog -o tb_uart build/uart_tx.v testbenches/tb_uart_tx.v && vvp tb_uart
`timescale 1ns / 1ps

module tb_uart_tx;
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

    // -- uart_baud_tick --
    reg  [31:0] baud_counter, baud_divisor;
    wire        baud_tick_result;
    uart_baud_tick uut_tick(.baud_counter(baud_counter), .baud_divisor(baud_divisor), .result(baud_tick_result));

    // -- uart_baud_counter_next --
    wire [31:0] baud_next_result;
    uart_baud_counter_next uut_baud_next(.baud_counter(baud_counter), .baud_divisor(baud_divisor), .result(baud_next_result));

    // -- uart_bit_select --
    reg  [31:0] data_byte, bit_index;
    wire        bit_sel_result;
    uart_bit_select uut_bit_sel(.data_byte(data_byte), .bit_index(bit_index), .result(bit_sel_result));

    // -- uart_tx_output --
    reg  [31:0] state;
    reg         data_bit;
    wire        tx_out_result;
    uart_tx_output uut_tx_out(.state(state), .data_bit(data_bit), .result(tx_out_result));

    // -- uart_is_busy --
    wire uart_busy_result;
    uart_is_busy uut_busy(.current_state(state), .result(uart_busy_result));

    // -- uart_state_next --
    reg  [31:0] cur_state, bit_count_in;
    reg         baud_tick_in, start_trigger;
    wire [31:0] state_next_result;
    uart_state_next uut_state_next(
        .current_state(cur_state), .baud_tick(baud_tick_in),
        .start_trigger(start_trigger), .bit_count(bit_count_in),
        .result(state_next_result)
    );

    initial begin
        // Baud tick: not at divisor
        baud_counter = 32'd5; baud_divisor = 32'd100; #10;
        check({31'd0, baud_tick_result}, 32'd0, "baud no tick");

        // Baud tick: at divisor
        baud_counter = 32'd100; #10;
        check({31'd0, baud_tick_result}, 32'd1, "baud tick");

        // Baud counter: increment
        baud_counter = 32'd5; baud_divisor = 32'd100; #10;
        check(baud_next_result, 32'd6, "baud counter inc");

        // Baud counter: reset at divisor
        baud_counter = 32'd100; #10;
        check(baud_next_result, 32'd0, "baud counter reset");

        // Bit select: LSB of 0xA5 = 1
        data_byte = 32'hA5; bit_index = 32'd0; #10;
        check({31'd0, bit_sel_result}, 32'd1, "bit select LSB");

        // Bit select: bit 1 of 0xA5 = 0
        bit_index = 32'd1; #10;
        check({31'd0, bit_sel_result}, 32'd0, "bit select bit1");

        // TX output: idle state (0) = high
        state = 32'd0; data_bit = 1'b0; #10;
        check({31'd0, tx_out_result}, 32'd1, "tx idle high");

        // TX output: start state (1) = low
        state = 32'd1; #10;
        check({31'd0, tx_out_result}, 32'd0, "tx start low");

        // TX output: data state (2) = data_bit
        state = 32'd2; data_bit = 1'b1; #10;
        check({31'd0, tx_out_result}, 32'd1, "tx data high");

        state = 32'd2; data_bit = 1'b0; #10;
        check({31'd0, tx_out_result}, 32'd0, "tx data low");

        // TX output: stop state (3) = high
        state = 32'd3; #10;
        check({31'd0, tx_out_result}, 32'd1, "tx stop high");

        // Busy: idle = not busy
        state = 32'd0; #10;
        check({31'd0, uart_busy_result}, 32'd0, "idle not busy");

        // Busy: data = busy
        state = 32'd2; #10;
        check({31'd0, uart_busy_result}, 32'd1, "data busy");

        // State FSM: idle + start trigger -> start
        cur_state = 32'd0; start_trigger = 1'b1; baud_tick_in = 1'b0; bit_count_in = 32'd0; #10;
        check(state_next_result, 32'd1, "idle->start");

        // State FSM: idle no trigger -> idle
        start_trigger = 1'b0; #10;
        check(state_next_result, 32'd0, "idle->idle");

        // State FSM: start + baud tick -> data
        cur_state = 32'd1; baud_tick_in = 1'b1; #10;
        check(state_next_result, 32'd2, "start->data");

        // State FSM: data + baud tick + bit7 -> stop
        cur_state = 32'd2; bit_count_in = 32'd7; #10;
        check(state_next_result, 32'd3, "data->stop");

        // State FSM: stop + baud tick -> idle
        cur_state = 32'd3; #10;
        check(state_next_result, 32'd0, "stop->idle");

        $display("");
        $display("uart_tx testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
