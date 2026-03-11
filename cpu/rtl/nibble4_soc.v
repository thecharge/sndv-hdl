// nibble4 SoC: 4-core 4-bit CPU with UART, Flash, LEDs
// Target: Tang Nano 9K (27 MHz clock)
`timescale 1ns / 1ps
`default_nettype none

module nibble4_soc #(
    parameter CLK_FREQ  = 27_000_000,
    parameter BAUD_RATE = 115200,
    parameter FW_SIZE   = 64,
    parameter NUM_CORES = 4
)(
    input  wire       clk,
    input  wire       rst_n,
    // UART
    output wire       uart_tx,
    // LEDs
    output wire [3:0] led,
    // SPI Flash
    output wire       flash_sclk,
    output wire       flash_cs_n,
    output wire       flash_mosi,
    input  wire       flash_miso
);

    // --- Wires: core <-> arbiter ---
    wire        req   [0:3];
    wire        ack   [0:3];
    wire [7:0]  addr  [0:3];
    wire [3:0]  wdata [0:3];
    wire        wen   [0:3];
    wire [3:0]  bus_rdata;
    wire        halted [0:3];

    // --- Shared bus ---
    wire [7:0]  bus_addr;
    wire [3:0]  bus_wdata;
    wire        bus_wen;
    wire        bus_valid;

    // --- Peripherals ---
    wire [3:0]  uart_tx_data;
    wire        uart_tx_start;
    wire        uart_tx_busy;
    wire [3:0]  led_reg;
    wire [3:0]  flash_cmd;
    wire        flash_cmd_start;
    wire [3:0]  flash_rdata;
    wire        flash_busy;
    wire        boot_done;

    // --- Flash boot: RAM write port ---
    wire [7:0]  flash_ram_addr;
    wire [3:0]  flash_ram_wdata;
    wire        flash_ram_wen;

    // --- Core enable: all cores start after boot ---
    wire core_enable = boot_done;

    // --- Instantiate 4 cores ---
    genvar gi;
    generate
        for (gi = 0; gi < NUM_CORES; gi = gi + 1) begin : cores
            nibble4_core #(.CORE_ID(gi)) u_core (
                .clk(clk), .rst_n(rst_n),
                .enable(core_enable),
                .bus_req(req[gi]),    .bus_ack(ack[gi]),
                .bus_addr(addr[gi]),  .bus_wdata(wdata[gi]),
                .bus_rdata(bus_rdata),
                .bus_wen(wen[gi]),
                .halted(halted[gi])
            );
        end
    endgenerate

    // --- Bus arbiter ---
    nibble4_arbiter u_arbiter (
        .clk(clk), .rst_n(rst_n),
        .req_0(req[0]), .ack_0(ack[0]), .addr_0(addr[0]), .wdata_0(wdata[0]), .wen_0(wen[0]),
        .req_1(req[1]), .ack_1(ack[1]), .addr_1(addr[1]), .wdata_1(wdata[1]), .wen_1(wen[1]),
        .req_2(req[2]), .ack_2(ack[2]), .addr_2(addr[2]), .wdata_2(wdata[2]), .wen_2(wen[2]),
        .req_3(req[3]), .ack_3(ack[3]), .addr_3(addr[3]), .wdata_3(wdata[3]), .wen_3(wen[3]),
        .bus_addr(bus_addr), .bus_wdata(bus_wdata), .bus_wen(bus_wen), .bus_valid(bus_valid)
    );

    // --- Memory + peripheral decoder ---
    nibble4_memory u_mem (
        .clk(clk), .rst_n(rst_n),
        .addr(boot_done ? bus_addr : flash_ram_addr),
        .wdata(boot_done ? bus_wdata : flash_ram_wdata),
        .rdata(bus_rdata),
        .wen(boot_done ? (bus_wen & bus_valid) : flash_ram_wen),
        .valid(boot_done ? bus_valid : flash_ram_wen),
        .uart_tx_data(uart_tx_data),
        .uart_tx_start(uart_tx_start),
        .uart_tx_busy(uart_tx_busy),
        .led_reg(led_reg),
        .flash_cmd(flash_cmd),
        .flash_start(flash_cmd_start),
        .flash_rdata(flash_rdata),
        .flash_busy(flash_busy),
        .boot_done(boot_done)
    );

    // --- UART TX ---
    nibble4_uart_tx #(
        .CLK_FREQ(CLK_FREQ),
        .BAUD_RATE(BAUD_RATE)
    ) u_uart (
        .clk(clk), .rst_n(rst_n),
        .tx_data(uart_tx_data),
        .tx_start(uart_tx_start),
        .tx_busy(uart_tx_busy),
        .tx_pin(uart_tx)
    );

    // --- Flash controller (boot loader) ---
    nibble4_flash #(
        .CLK_DIV(4),
        .FW_SIZE(FW_SIZE)
    ) u_flash (
        .clk(clk), .rst_n(rst_n),
        .boot_done(boot_done),
        .ram_addr(flash_ram_addr),
        .ram_wdata(flash_ram_wdata),
        .ram_wen(flash_ram_wen),
        .spi_sclk(flash_sclk),
        .spi_cs_n(flash_cs_n),
        .spi_mosi(flash_mosi),
        .spi_miso(flash_miso),
        .cmd(flash_cmd),
        .cmd_start(flash_cmd_start),
        .cmd_rdata(flash_rdata),
        .busy(flash_busy)
    );

    // --- LED output (active-low for Tang Nano 9K) ---
    assign led = ~led_reg;

endmodule

`default_nettype wire
