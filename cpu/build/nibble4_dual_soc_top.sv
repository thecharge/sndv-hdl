// nibble4_dual_soc_top.sv — Hand-written integration layer
// Instantiates ts2v-generated modules: 2x Nibble4Core + Nibble4Arbiter + Nibble4Memory + Nibble4UartTx
// Standard practice: generated RTL modules + hand-written top-level wiring
// IEEE 1800-2017 Compliant
`timescale 1ns / 1ps
`default_nettype none

module nibble4_dual_soc_top (
    input  wire logic       clk,
    input  wire logic       rst_n,
    output      logic       uart_tx,
    output      logic [3:0] led
);

    // ---- Core 0 signals ----
    logic       c0_bus_req, c0_bus_wen, c0_bus_ack, c0_halted;
    logic [7:0] c0_bus_addr;
    logic [3:0] c0_bus_wdata;

    // ---- Core 1 signals ----
    logic       c1_bus_req, c1_bus_wen, c1_bus_ack, c1_halted;
    logic [7:0] c1_bus_addr;
    logic [3:0] c1_bus_wdata;

    // ---- Arbiter → shared bus ----
    logic       arb_valid, arb_wen;
    logic [7:0] arb_addr;
    logic [3:0] arb_wdata;

    // ---- Memory ----
    logic [3:0] mem_rdata;
    logic [3:0] uart_tx_data;
    logic       uart_tx_start;
    logic [3:0] led_out;
    logic       uart_busy;

    // ---- RAM (240 nibbles) — inferred by synthesis ----
    logic [3:0] ram [0:239];

    // RAM read/write
    always_ff @(posedge clk) begin
        if (arb_valid && arb_wen && arb_addr < 8'd240)
            ram[arb_addr] <= arb_wdata;
    end

    logic [3:0] ram_rdata;
    always_comb begin
        if (arb_addr < 8'd240)
            ram_rdata = ram[arb_addr];
        else
            ram_rdata = 4'd0;
    end

    // ================================================================
    // Module Instantiations (ts2v-generated)
    // ================================================================

    Nibble4Core u_core0 (
        .clk       (clk),
        .rst_n     (rst_n),
        .enable    (1'b1),
        .bus_rdata (mem_rdata),
        .bus_ack   (c0_bus_ack),
        .bus_req   (c0_bus_req),
        .bus_addr  (c0_bus_addr),
        .bus_wdata (c0_bus_wdata),
        .bus_wen   (c0_bus_wen),
        .halted    (c0_halted)
    );

    Nibble4Core u_core1 (
        .clk       (clk),
        .rst_n     (rst_n),
        .enable    (1'b1),
        .bus_rdata (mem_rdata),
        .bus_ack   (c1_bus_ack),
        .bus_req   (c1_bus_req),
        .bus_addr  (c1_bus_addr),
        .bus_wdata (c1_bus_wdata),
        .bus_wen   (c1_bus_wen),
        .halted    (c1_halted)
    );

    Nibble4Arbiter u_arbiter (
        .clk       (clk),
        .rst_n     (rst_n),
        .req_0     (c0_bus_req),
        .addr_0    (c0_bus_addr),
        .wdata_0   (c0_bus_wdata),
        .wen_0     (c0_bus_wen),
        .req_1     (c1_bus_req),
        .addr_1    (c1_bus_addr),
        .wdata_1   (c1_bus_wdata),
        .wen_1     (c1_bus_wen),
        .ack_0     (c0_bus_ack),
        .ack_1     (c1_bus_ack),
        .bus_addr  (arb_addr),
        .bus_wdata (arb_wdata),
        .bus_wen   (arb_wen),
        .bus_valid (arb_valid)
    );

    Nibble4Memory u_memory (
        .clk           (clk),
        .rst_n         (rst_n),
        .addr          (arb_addr),
        .wdata         (arb_wdata),
        .wen           (arb_wen),
        .valid         (arb_valid),
        .uart_busy     (uart_busy),
        .rdata         (mem_rdata),
        .uart_tx_data  (uart_tx_data),
        .uart_tx_start (uart_tx_start),
        .led_out       (led_out)
    );

    Nibble4UartTx u_uart (
        .clk       (clk),
        .rst_n     (rst_n),
        .tx_data   (uart_tx_data),
        .tx_start  (uart_tx_start),
        .tx_pin    (uart_tx),
        .tx_busy   (uart_busy)
    );

    assign led = led_out;

endmodule
`default_nettype wire
