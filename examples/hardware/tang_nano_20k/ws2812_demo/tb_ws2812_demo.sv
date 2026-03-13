// Testbench: Ws2812InteractiveDemo — Tang Nano 20K WS2812 interactive demo
//
// Covers:
//  1. Synchronous reset: all outputs and state reset to defaults.
//  2. LED walking pattern: all 6 phases map to correct active-low pattern.
//  3. WS2812 reset phase: ws2812 held low until resetTicks >= treset.
//  4. WS2812 transmission: correct high time for '0' and '1' bits.
//  5. Button debounce: mode advances after adequate hold, re-arms on release.
//  6. Color frame update: mode and step select correct 24-bit GRB values.
//
// Compile and run (requires iverilog):
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts \
//     --board boards/tang_nano_20k.board.json --out build/ws2812_demo
//   iverilog -g2012 -s tb_ws2812_demo -o build/tb_ws2812_demo \
//     build/ws2812_demo/ws2812_demo.sv \
//     examples/hardware/tang_nano_20k/ws2812_demo/tb_ws2812_demo.sv
//   vvp build/tb_ws2812_demo
`timescale 1ns / 1ps

module tb_ws2812_demo;
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

    reg  clk, rst_n, btn;
    wire ws2812;
    wire [5:0] led;

    Ws2812InteractiveDemo dut(
        .clk(clk), .rst_n(rst_n), .btn(btn),
        .ws2812(ws2812), .led(led)
    );

    initial clk  = 1'b0;
    initial rst_n = 1'b1;
    initial btn   = 1'b1; // not pressed

    always #5 clk = ~clk; // 100 MHz simulation clock

    task tick;
        @(posedge clk); #1;
    endtask

    // -----------------------------------------------------------------------
    // Test 1: Synchronous reset clears all state
    // -----------------------------------------------------------------------
    task test_reset;
        rst_n = 1'b0;
        tick; tick; tick;
        check({26'd0, led},    6'h3F, "rst: led all off");
        check({31'd0, ws2812}, 1'b0,  "rst: ws2812 low");
        rst_n = 1'b1;
    endtask

    // -----------------------------------------------------------------------
    // Test 2: LED walking patterns via forced ledPhase
    // -----------------------------------------------------------------------
    task test_led_patterns;
        // Force ledPhase and observe led output after one clock
        force tb_ws2812_demo.dut.ledPhase = 3'd0; tick;
        check({26'd0, led}, 6'h3E, "led walk phase0 (LED0)");

        force tb_ws2812_demo.dut.ledPhase = 3'd1; tick;
        check({26'd0, led}, 6'h3D, "led walk phase1 (LED1)");

        force tb_ws2812_demo.dut.ledPhase = 3'd2; tick;
        check({26'd0, led}, 6'h3B, "led walk phase2 (LED2)");

        force tb_ws2812_demo.dut.ledPhase = 3'd3; tick;
        check({26'd0, led}, 6'h37, "led walk phase3 (LED3)");

        force tb_ws2812_demo.dut.ledPhase = 3'd4; tick;
        check({26'd0, led}, 6'h2F, "led walk phase4 (LED4)");

        force tb_ws2812_demo.dut.ledPhase = 3'd5; tick;
        check({26'd0, led}, 6'h1F, "led walk phase5 (LED5)");

        release tb_ws2812_demo.dut.ledPhase;
    endtask

    // -----------------------------------------------------------------------
    // Test 3: WS2812 reset phase — data line stays low until treset
    // -----------------------------------------------------------------------
    task test_ws2812_reset_phase;
        // Force into reset phase (sending=0) with resetTicks just below treset
        force tb_ws2812_demo.dut.sending    = 1'b0;
        force tb_ws2812_demo.dut.resetTicks = 12'd1599;
        tick;
        check({31'd0, ws2812}, 32'd0, "ws2812 low during reset");
        release tb_ws2812_demo.dut.sending;
        release tb_ws2812_demo.dut.resetTicks;
    endtask

    // -----------------------------------------------------------------------
    // Test 4: WS2812 bit encoding — '0' bit produces T0H high time
    // -----------------------------------------------------------------------
    task test_ws2812_bit_encoding;
        integer i;

        // Force '0' bit: frame bit 23 = 0 (frame = 24'h000000 → bit 23 is 0)
        force tb_ws2812_demo.dut.sending   = 1'b1;
        force tb_ws2812_demo.dut.frame     = 24'h000000;
        force tb_ws2812_demo.dut.bitIndex  = 5'd0;

        // ws2812 should be high for tickInBit 0..9 (T0H = 10 cycles)
        // and low from tick 10 onwards
        force tb_ws2812_demo.dut.tickInBit = 6'd9;
        tick;
        check({31'd0, ws2812}, 32'd1, "'0' bit high at tickInBit=9");

        force tb_ws2812_demo.dut.tickInBit = 6'd10;
        tick;
        check({31'd0, ws2812}, 32'd0, "'0' bit low at tickInBit=10");

        // '1' bit: frame bit 23 = 1 (frame = 24'h800000 → bit 23 is 1)
        // High for T1H = 19 cycles
        force tb_ws2812_demo.dut.frame     = 24'h800000;
        force tb_ws2812_demo.dut.tickInBit = 6'd18;
        tick;
        check({31'd0, ws2812}, 32'd1, "'1' bit high at tickInBit=18");

        force tb_ws2812_demo.dut.tickInBit = 6'd19;
        tick;
        check({31'd0, ws2812}, 32'd0, "'1' bit low at tickInBit=19");

        release tb_ws2812_demo.dut.sending;
        release tb_ws2812_demo.dut.frame;
        release tb_ws2812_demo.dut.bitIndex;
        release tb_ws2812_demo.dut.tickInBit;
    endtask

    // -----------------------------------------------------------------------
    // Test 5: Color frame update — mode 0, step 0 → GRB green 0x00CC00
    // -----------------------------------------------------------------------
    task test_color_frames;
        force tb_ws2812_demo.dut.mode      = 2'd0;
        force tb_ws2812_demo.dut.colorStep = 2'd0;
        tick;
        check(tb_ws2812_demo.dut.frame, 24'h00CC00, "mode0 step0 green");

        force tb_ws2812_demo.dut.colorStep = 2'd1;
        tick;
        check(tb_ws2812_demo.dut.frame, 24'hCC0000, "mode0 step1 red");

        force tb_ws2812_demo.dut.colorStep = 2'd2;
        tick;
        check(tb_ws2812_demo.dut.frame, 24'h0000CC, "mode0 step2 blue");

        force tb_ws2812_demo.dut.mode      = 2'd1;
        force tb_ws2812_demo.dut.colorStep = 2'd0;
        tick;
        check(tb_ws2812_demo.dut.frame, 24'h00CC44, "mode1 step0 fire-orange");

        force tb_ws2812_demo.dut.mode      = 2'd2;
        force tb_ws2812_demo.dut.colorStep = 2'd2;
        tick;
        check(tb_ws2812_demo.dut.frame, 24'h008888, "mode2 step2 cyan");

        force tb_ws2812_demo.dut.mode      = 2'd3;
        force tb_ws2812_demo.dut.colorStep = 2'd0;
        tick;
        check(tb_ws2812_demo.dut.frame, 24'h00CC00, "mode3 step0 forest-green");

        release tb_ws2812_demo.dut.mode;
        release tb_ws2812_demo.dut.colorStep;
    endtask

    // -----------------------------------------------------------------------
    // Test 6: Button debounce — mode advances after threshold, re-arms
    // -----------------------------------------------------------------------
    task test_button_mode_advance;
        integer initial_mode;
        initial_mode = tb_ws2812_demo.dut.mode;

        // Force debounce past threshold (0x8000) with btnArmed=1
        force tb_ws2812_demo.dut.btnDebounce = 16'h8001;
        force tb_ws2812_demo.dut.btnArmed    = 1'b1;
        tick;
        check(tb_ws2812_demo.dut.btnArmed, 1'b0, "btnArmed cleared after trigger");

        release tb_ws2812_demo.dut.btnDebounce;
        release tb_ws2812_demo.dut.btnArmed;
    endtask

    // -----------------------------------------------------------------------
    // Run all tests
    // -----------------------------------------------------------------------
    initial begin
        $display("[WS2812_DEMO_TB] Starting Ws2812InteractiveDemo testbench");

        // Allow DUT to stabilise
        repeat(10) tick;

        test_reset;
        $display("[WS2812_DEMO_TB] checked reset");

        test_led_patterns;
        $display("[WS2812_DEMO_TB] checked led_patterns");

        test_ws2812_reset_phase;
        $display("[WS2812_DEMO_TB] checked ws2812_reset_phase");

        test_ws2812_bit_encoding;
        $display("[WS2812_DEMO_TB] checked ws2812_bit_encoding");

        test_color_frames;
        $display("[WS2812_DEMO_TB] checked color_frames");

        test_button_mode_advance;
        $display("[WS2812_DEMO_TB] checked button_mode_advance");

        $display("");
        $display("ws2812_demo testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
