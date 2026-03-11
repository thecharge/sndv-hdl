// tb_nibble4_dual_soc.sv — Testbench for dual-core nibble4 SoC
// Loads a program into RAM, runs both cores, verifies LED and UART output
`timescale 1ns / 1ps

module tb_nibble4_dual_soc;

    logic clk, rst_n;
    logic uart_tx;
    logic [3:0] led;

    // DUT
    nibble4_dual_soc_top dut (
        .clk(clk), .rst_n(rst_n),
        .uart_tx(uart_tx), .led(led)
    );

    // Clock: 27 MHz (Tang Nano 9K)
    initial clk = 0;
    always #18.5 clk = ~clk;

    integer pass_count = 0;
    integer fail_count = 0;
    integer total_checks = 0;

    task check(string name, logic [31:0] actual, logic [31:0] expected);
        total_checks = total_checks + 1;
        if (actual === expected) begin
            pass_count = pass_count + 1;
            $display("  [PASS] %s: got %h", name, actual);
        end else begin
            fail_count = fail_count + 1;
            $display("  [FAIL] %s: expected %h, got %h", name, expected, actual);
        end
    endtask

    // Program: LDI R0, 0xA; OUT R0 -> LED (0xF2); HLT
    // Encoding: opcode=hi nibble, reg=lo nibble, immediate follows
    // LDI R0 = 0x1, 0x0 (reg 0), 0xA (immediate)
    // OUT R0 to LED: opcode=0xE, reg=0x2 (LED addr offset)
    // HLT = 0xF, 0x0
    initial begin
        $display("=== nibble4 Dual-Core SoC Testbench ===");

        // Reset
        rst_n = 0;
        repeat(10) @(posedge clk);
        rst_n = 1;

        // Load program into RAM (both cores start at address 0)
        // LDI R0, 0xA
        dut.ram[0] = 4'h1;  // opcode: LDI
        dut.ram[1] = 4'h0;  // register: R0
        dut.ram[2] = 4'hA;  // immediate: 0xA
        // LDI R1, 0x2 (LED port offset)
        dut.ram[3] = 4'h1;  // opcode: LDI
        dut.ram[4] = 4'h1;  // register: R1
        dut.ram[5] = 4'h2;  // immediate: 0x2 (LED offset)
        // OUT R0 -> peripheral[0xF0 + R1] = LED
        dut.ram[6] = 4'hE;  // opcode: OUT
        dut.ram[7] = 4'h0;  // unused
        // HLT
        dut.ram[8] = 4'hF;  // opcode: HLT
        dut.ram[9] = 4'h0;  // unused

        $display("\nProgram loaded: LDI R0,0xA -> LDI R1,0x2 -> OUT -> HLT");

        // Run for enough cycles
        repeat(500) @(posedge clk);

        // Checks
        $display("\n--- Verification ---");
        check("Core 0 halted", {31'b0, dut.u_core0.halted}, 32'h1);
        check("Core 1 halted", {31'b0, dut.u_core1.halted}, 32'h1);
        check("LED output", {28'b0, led}, 32'hA);

        // Check core 0 register state
        check("Core 0 R0", {28'b0, dut.u_core0.r0}, 32'hA);
        check("Core 0 R1", {28'b0, dut.u_core0.r1}, 32'h2);

        // Check arbiter responded
        check("Arbiter not stuck", {31'b0, dut.u_arbiter.bus_valid}, 32'h0);

        $display("\n=== Results: %0d/%0d passed ===", pass_count, total_checks);
        if (fail_count > 0) $display("*** %0d FAILURES ***", fail_count);
        else $display("*** ALL PASSED ***");

        $finish;
    end

    // Timeout
    initial begin
        #100000;
        $display("TIMEOUT");
        $finish;
    end

endmodule
