// Testbench: i2c — combinational I2C protocol building blocks
// Compile and run (requires iverilog):
//   bun run apps/cli/src/index.ts compile examples/i2c/i2c.ts --out build/i2c
//   iverilog -g2012 -o build/tb_i2c build/i2c/i2c.sv examples/i2c/tb_i2c.sv && vvp build/tb_i2c
`timescale 1ns / 1ps

module tb_i2c;
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

    // -- i2c_address_match --
    reg  [31:0] rcvd_addr, dev_addr;
    wire        addr_match_result;
    i2c_address_match uut_addr(.received_address(rcvd_addr), .device_address(dev_addr), .result(addr_match_result));

    // -- i2c_is_read_operation --
    reg  [31:0] addr_byte;
    wire        read_op_result;
    i2c_is_read_operation uut_rw(.address_byte(addr_byte), .result(read_op_result));

    // -- i2c_is_ack --
    reg         sda_val;
    wire        ack_result;
    i2c_is_ack uut_ack(.sda_value(sda_val), .result(ack_result));

    // -- i2c_bit_counter_next --
    reg  [31:0] bit_cnt;
    reg         scl_rise;
    wire [31:0] bit_cnt_next;
    i2c_bit_counter_next uut_bitcnt(.current_count(bit_cnt), .scl_rising(scl_rise), .result(bit_cnt_next));

    // -- i2c_byte_complete --
    wire byte_done;
    i2c_byte_complete uut_bytedone(.bit_counter(bit_cnt), .result(byte_done));

    // -- i2c_scl_divider_tick --
    reg  [31:0] div_cnt, div_lim;
    wire        scl_tick;
    i2c_scl_divider_tick uut_tick(.divider_counter(div_cnt), .divider_limit(div_lim), .result(scl_tick));

    // -- i2c_start_detected --
    reg  sda_cur, sda_prev, scl_cur;
    wire start_det;
    i2c_start_detected uut_start(.sda_current(sda_cur), .sda_previous(sda_prev), .scl_current(scl_cur), .result(start_det));

    // -- i2c_stop_detected --
    wire stop_det;
    i2c_stop_detected uut_stop(.sda_current(sda_cur), .sda_previous(sda_prev), .scl_current(scl_cur), .result(stop_det));

    initial begin
        // Address match: 7-bit masked comparison
        rcvd_addr = 32'h50; dev_addr = 32'h50; #10;
        check({31'd0, addr_match_result}, 32'd1, "addr match 0x50");

        rcvd_addr = 32'h51; dev_addr = 32'h50; #10;
        check({31'd0, addr_match_result}, 32'd0, "addr no match");

        // Mask test: only lower 7 bits compared
        rcvd_addr = 32'h150; dev_addr = 32'h50; #10;
        check({31'd0, addr_match_result}, 32'd1, "addr match masked");

        // Read/write bit: LSB of address byte
        addr_byte = 32'h01; #10;
        check({31'd0, read_op_result}, 32'd1, "read bit=1");

        addr_byte = 32'h00; #10;
        check({31'd0, read_op_result}, 32'd0, "write bit=0");

        // ACK: SDA low = ACK
        sda_val = 1'b0; #10;
        check({31'd0, ack_result}, 32'd1, "ack when sda=0");

        sda_val = 1'b1; #10;
        check({31'd0, ack_result}, 32'd0, "nack when sda=1");

        // Bit counter: advance on SCL rising
        bit_cnt = 32'd3; scl_rise = 1'b1; #10;
        check(bit_cnt_next, 32'd4, "bit cnt advance");

        bit_cnt = 32'd8; scl_rise = 1'b1; #10;
        check(bit_cnt_next, 32'd0, "bit cnt wrap at 8 (ACK)");

        bit_cnt = 32'd5; scl_rise = 1'b0; #10;
        check(bit_cnt_next, 32'd5, "bit cnt hold without SCL");

        // Byte complete: 8 bits received
        bit_cnt = 32'd8; #10;
        check({31'd0, byte_done}, 32'd1, "byte complete at 8");

        bit_cnt = 32'd7; #10;
        check({31'd0, byte_done}, 32'd0, "byte not complete at 7");

        // SCL divider tick: at limit
        div_cnt = 32'd100; div_lim = 32'd100; #10;
        check({31'd0, scl_tick}, 32'd1, "scl tick at limit");

        div_cnt = 32'd99; #10;
        check({31'd0, scl_tick}, 32'd0, "scl no tick");

        // START: SDA falls while SCL is high
        sda_cur = 1'b0; sda_prev = 1'b1; scl_cur = 1'b1; #10;
        check({31'd0, start_det}, 32'd1, "start condition");

        // STOP: SDA rises while SCL is high
        sda_cur = 1'b1; sda_prev = 1'b0; scl_cur = 1'b1; #10;
        check({31'd0, stop_det}, 32'd1, "stop condition");

        // No start with SCL low
        sda_cur = 1'b0; sda_prev = 1'b1; scl_cur = 1'b0; #10;
        check({31'd0, start_det}, 32'd0, "no start with scl=0");

        $display("");
        $display("i2c testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
