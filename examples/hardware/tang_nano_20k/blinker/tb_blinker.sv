// Testbench: Blinker — Tang Nano 20K deterministic LED walker
//
// Verifies the sequential walking LED pattern: one LED active-low at a time,
// stepping through phases 0–5 as the 25-bit counter rolls over.
//
// Simulation strategy:
//   - Force internal signals directly (Icarus Verilog hierarchical access)
//   - Drive a single clock edge after each force to observe outputs
//   - Verify led output matches expected active-low pattern per phase
//
// Compile and run (requires iverilog):
//   bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/blinker/blinker.ts \
//     --board boards/tang_nano_20k.board.json --out build/blinker
//   iverilog -g2012 -s tb_blinker -o build/tb_blinker \
//     build/blinker/blinker.sv examples/hardware/tang_nano_20k/blinker/tb_blinker.sv
//   vvp build/tb_blinker
`timescale 1ns / 1ps

module tb_blinker;
    integer pass_count = 0;
    integer fail_count = 0;

    task check_led(input [5:0] actual, input [5:0] expected, input [255:0] label);
        if (actual === expected) begin
            pass_count = pass_count + 1;
        end else begin
            $display("FAIL %0s: led got 6'h%02h, expected 6'h%02h", label, actual, expected);
            fail_count = fail_count + 1;
        end
    endtask

    reg clk;
    wire [5:0] led;

    Blinker dut(.clk(clk), .led(led));

    initial clk = 1'b0;
    always #5 clk = ~clk; // 100 MHz simulation clock

    task tick;
        @(posedge clk); #1;
    endtask

    task drive_phase(input [2:0] ph, input [24:0] cnt);
        // Force DUT internals and apply one clock edge to see led output.
        force tb_blinker.dut.phase   = ph;
        force tb_blinker.dut.counter = cnt;
        tick;
        release tb_blinker.dut.phase;
        release tb_blinker.dut.counter;
    endtask

    initial begin
        // Wait for reset
        repeat(4) @(posedge clk); #1;

        // Phase 0: LED0 on  → led = 6'b111110 = 0x3E
        drive_phase(3'd0, 25'd0);
        check_led(led, 6'h3E, "phase0_led0");

        // Phase 1: LED1 on  → led = 6'b111101 = 0x3D
        drive_phase(3'd1, 25'd0);
        check_led(led, 6'h3D, "phase1_led1");

        // Phase 2: LED2 on  → led = 6'b111011 = 0x3B
        drive_phase(3'd2, 25'd0);
        check_led(led, 6'h3B, "phase2_led2");

        // Phase 3: LED3 on  → led = 6'b110111 = 0x37
        drive_phase(3'd3, 25'd0);
        check_led(led, 6'h37, "phase3_led3");

        // Phase 4: LED4 on  → led = 6'b101111 = 0x2F
        drive_phase(3'd4, 25'd0);
        check_led(led, 6'h2F, "phase4_led4");

        // Phase 5: LED5 on  → led = 6'b011111 = 0x1F
        drive_phase(3'd5, 25'd0);
        check_led(led, 6'h1F, "phase5_led5");

        $display("");
        $display("blinker testbench: %0d passed, %0d failed", pass_count, fail_count);
        if (fail_count > 0) $finish(1);
        $finish(0);
    end
endmodule
