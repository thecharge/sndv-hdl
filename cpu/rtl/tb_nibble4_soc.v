// Testbench for nibble4 SoC
// Loads firmware directly into RAM (bypassing flash) and runs
`timescale 1ns / 1ps

module tb_nibble4_soc;
    reg  clk = 0;
    reg  rst_n = 0;
    wire uart_tx;
    wire [3:0] led;
    wire flash_sclk, flash_cs_n, flash_mosi;
    reg  flash_miso = 0;

    always #18.5 clk = ~clk; // ~27 MHz

    nibble4_soc #(
        .CLK_FREQ(27_000_000),
        .BAUD_RATE(115200),
        .FW_SIZE(64)
    ) uut (
        .clk(clk), .rst_n(rst_n),
        .uart_tx(uart_tx),
        .led(led),
        .flash_sclk(flash_sclk),
        .flash_cs_n(flash_cs_n),
        .flash_mosi(flash_mosi),
        .flash_miso(flash_miso)
    );

    // Test program:
    // LDI R0, 5      -> 0x10, 0x05
    // LDI R1, 3      -> 0x14, 0x03
    // ADD R0, R1      -> 0x41 (R0 = R0 + R1 = 8)
    // OUT R0, R2      -> 0xE2 (output R0 to UART at addr F0+R2=F0)
    // ST  R0, [R0,R1] -> 0x31 (store to LED reg if addr=0xF2)
    // HLT             -> 0xF0

    initial begin
        $dumpfile("nibble4.vcd");
        $dumpvars(0, tb_nibble4_soc);

        // Wait for flash boot to finish, then force-load program
        #100;
        rst_n = 1;

        // Wait for boot_done (skip flash for testbench - load directly)
        // Force boot_done and load RAM manually
        force uut.boot_done = 1;

        // Load program into RAM
        // Byte 0: 0x1 (LDI opcode high nibble), Byte 1: 0x0 (reg_a=0, reg_b=0)
        uut.u_mem.ram[0]  = 4'h1; // LDI upper
        uut.u_mem.ram[1]  = 4'h0; // LDI lower (R0, -)
        uut.u_mem.ram[2]  = 4'h5; // immediate = 5

        uut.u_mem.ram[3]  = 4'h1; // LDI upper
        uut.u_mem.ram[4]  = 4'h4; // LDI lower (R1, -)
        uut.u_mem.ram[5]  = 4'h3; // immediate = 3

        uut.u_mem.ram[6]  = 4'h4; // ADD upper
        uut.u_mem.ram[7]  = 4'h1; // ADD lower (R0, R1)

        uut.u_mem.ram[8]  = 4'hF; // HLT upper
        uut.u_mem.ram[9]  = 4'h0; // HLT lower

        // Run for a while
        #50000;

        // Check: R0 in core 0 should be 5+3=8
        if (uut.cores[0].u_core.regs[0] == 4'd8)
            $display("PASS: R0 = %d (expected 8)", uut.cores[0].u_core.regs[0]);
        else
            $display("FAIL: R0 = %d (expected 8)", uut.cores[0].u_core.regs[0]);

        if (uut.cores[0].u_core.halted)
            $display("PASS: Core 0 halted");
        else
            $display("FAIL: Core 0 not halted");

        $display("LED output: %b", led);
        $finish;
    end

    // Timeout
    initial begin
        #1_000_000;
        $display("TIMEOUT");
        $finish;
    end

endmodule
