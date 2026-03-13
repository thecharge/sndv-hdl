// Testbench: ws2812 — combinational WS2812 protocol building blocks
// Compile and run (requires iverilog):
//   bun run apps/cli/src/index.ts compile examples/ws2812/ws2812.ts --out build/ws2812
//   iverilog -g2012 -o build/tb_ws2812 build/ws2812/ws2812.sv examples/ws2812/tb_ws2812.sv && vvp build/tb_ws2812
`timescale 1ns / 1ps
//
// WS2812 timing reference (27 MHz = 37 ns/cycle):
//   T0H = 10 cycles (~370 ns), T1H = 19 cycles (~703 ns), Tbit = 34 cycles
//   Reset: > 50 µs low = > 1351 cycles

module tb_ws2812;
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

    // -- ws2812_bit_output: output high while counter < threshold for bit --
    reg  [31:0] cycle_cnt, t0h_cycles, t1h_cycles;
    reg         data_bit;
    wire        bit_out;
    ws2812_bit_output uut_out(
        .cycle_counter(cycle_cnt), .data_bit(data_bit),
        .cycles_t0h(t0h_cycles), .cycles_t1h(t1h_cycles), .result(bit_out));

    // -- ws2812_cycle_counter_next --
    reg  [31:0] cycles_per_bit;
    wire [31:0] cyc_next;
    ws2812_cycle_counter_next uut_cyc(
        .cycle_counter(cycle_cnt), .cycles_per_bit(cycles_per_bit), .result(cyc_next));

    // -- ws2812_bit_counter_next --
    reg  [31:0] bit_cnt;
    wire [31:0] bit_next;
    ws2812_bit_counter_next uut_bit(
        .bit_counter(bit_cnt), .cycle_counter(cycle_cnt),
        .cycles_per_bit(cycles_per_bit), .result(bit_next));

    // -- ws2812_pack_grb --
    reg  [31:0] red, green, blue;
    wire [31:0] grb_packed;
    ws2812_pack_grb uut_grb(.red(red), .green(green), .blue(blue), .result(grb_packed));

    // -- ws2812_extract_bit --
    reg  [31:0] grb_word, bit_pos;
    wire        extracted_bit;
    ws2812_extract_bit uut_ext(.grb_word(grb_word), .bit_position(bit_pos), .result(extracted_bit));

    // -- ws2812_in_reset_phase --
    reg  [31:0] reset_cnt, reset_cycles;
    wire        in_reset;
    ws2812_in_reset_phase uut_rst(.reset_counter(reset_cnt), .reset_cycles(reset_cycles), .result(in_reset));

    initial begin
        t0h_cycles = 32'd10; t1h_cycles = 32'd19; cycles_per_bit = 32'd34;

        // bit_output: '0' bit — high for 10 cycles, then low
        data_bit = 1'b0;
        cycle_cnt = 32'd0; #10;
        check({31'd0, bit_out}, 32'd1, "'0' bit high at cycle 0");

        cycle_cnt = 32'd9; #10;
        check({31'd0, bit_out}, 32'd1, "'0' bit high at cycle 9 (last)");

        cycle_cnt = 32'd10; #10;
        check({31'd0, bit_out}, 32'd0, "'0' bit low at cycle 10");

        // bit_output: '1' bit — high for 19 cycles
        data_bit = 1'b1;
        cycle_cnt = 32'd18; #10;
        check({31'd0, bit_out}, 32'd1, "'1' bit high at cycle 18");

        cycle_cnt = 32'd19; #10;
        check({31'd0, bit_out}, 32'd0, "'1' bit low at cycle 19");

        // cycle_counter_next: increment within period
        cycle_cnt = 32'd10; #10;
        check(cyc_next, 32'd11, "cycle cnt increment");

        // cycle_counter_next: wrap at cycles_per_bit
        cycle_cnt = 32'd34; #10;
        check(cyc_next, 32'd0, "cycle cnt wrap at 34");

        // bit_counter_next: advance on wrap
        bit_cnt = 32'd5; cycle_cnt = 32'd34; #10;
        check(bit_next, 32'd6, "bit cnt advance on wrap");

        // bit_counter_next: hold while not wrapping
        cycle_cnt = 32'd10; #10;
        check(bit_next, 32'd5, "bit cnt hold");

        // bit_counter_next: wrap at 23 → 0
        bit_cnt = 32'd23; cycle_cnt = 32'd34; #10;
        check(bit_next, 32'd0, "bit cnt wrap 23->0");

        // pack_grb: GRB ordering (green in MSB, red in middle, blue in LSB)
        green = 32'hAA; red = 32'hBB; blue = 32'hCC; #10;
        check(grb_packed, 32'hAABBCC, "pack GRB order");

        // pack_grb: masking — only lower 8 bits of each channel
        green = 32'h1FF; red = 32'h100; blue = 32'h000; #10;
        check(grb_packed, 32'hFF0000, "pack GRB masks to 8 bits");

        // extract_bit: MSB first — bit position 0 is MSB (bit 23)
        grb_word = 32'h800000; bit_pos = 32'd0; #10;
        check({31'd0, extracted_bit}, 32'd1, "extract MSB");

        grb_word = 32'h000001; bit_pos = 32'd23; #10;
        check({31'd0, extracted_bit}, 32'd1, "extract LSB");

        grb_word = 32'hAAAAAA; bit_pos = 32'd0; #10;
        check({31'd0, extracted_bit}, 32'd1, "extract bit 0 of 0xAAAAAA");

        // in_reset_phase: true while counter < reset_cycles
        reset_cycles = 32'd1600;
        reset_cnt = 32'd0; #10;
        check({31'd0, in_reset}, 32'd1, "in reset at 0");

        reset_cnt = 32'd1599; #10;
        check({31'd0, in_reset}, 32'd1, "in reset at 1599");

        reset_cnt = 32'd1600; #10;
        check({31'd0, in_reset}, 32'd0, "not in reset at 1600");

        $display("");
        $display("ws2812 testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
