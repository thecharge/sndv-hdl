// Shared RAM + peripheral decoder for nibble4 SoC
// Address map:
//   0x00-0xEF : RAM (240 nibbles)
//   0xF0      : UART TX data
//   0xF1      : UART TX status (bit 0 = busy)
//   0xF2      : LED output
//   0xF3      : Core ID (read-only, set by bus grant)
//   0xF4      : Mutex (read=test-and-set, write=release)
//   0xF5      : Timer low nibble
//   0xF6      : Timer high nibble
//   0xF8-0xFB : Flash controller
//   0xFF      : Boot control
`timescale 1ns / 1ps
`default_nettype none

module nibble4_memory (
    input  wire        clk,
    input  wire        rst_n,
    // Bus interface
    input  wire [7:0]  addr,
    input  wire [3:0]  wdata,
    output reg  [3:0]  rdata,
    input  wire        wen,
    input  wire        valid,
    // UART TX
    output reg  [3:0]  uart_tx_data,
    output reg         uart_tx_start,
    input  wire        uart_tx_busy,
    // LEDs
    output reg  [3:0]  led_reg,
    // Flash SPI
    output reg  [3:0]  flash_cmd,
    output reg         flash_start,
    input  wire [3:0]  flash_rdata,
    input  wire        flash_busy,
    // Boot
    input  wire        boot_done
);

    // RAM: 240 nibbles
    reg [3:0] ram [0:239];

    // Mutex register (1 = locked)
    reg mutex_locked;

    // Timer (8-bit, increments each cycle)
    reg [7:0] timer;

    integer i;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            uart_tx_data  <= 4'd0;
            uart_tx_start <= 1'b0;
            led_reg       <= 4'd0;
            mutex_locked  <= 1'b0;
            flash_cmd     <= 4'd0;
            flash_start   <= 1'b0;
            timer         <= 8'd0;
            for (i = 0; i < 240; i = i + 1)
                ram[i] <= 4'd0;
        end else begin
            uart_tx_start <= 1'b0;
            flash_start   <= 1'b0;
            timer         <= timer + 8'd1;

            if (valid) begin
                if (addr < 8'hF0) begin
                    // RAM access
                    if (wen)
                        ram[addr] <= wdata;
                end else begin
                    // Peripheral write
                    if (wen) begin
                        case (addr)
                            8'hF0: begin uart_tx_data <= wdata; uart_tx_start <= 1'b1; end
                            8'hF2: led_reg <= wdata;
                            8'hF4: mutex_locked <= 1'b0; // write = release
                            8'hF8: begin flash_cmd <= wdata; flash_start <= 1'b1; end
                            default: ;
                        endcase
                    end else begin
                        // Peripheral read side-effects
                        if (addr == 8'hF4 && !mutex_locked)
                            mutex_locked <= 1'b1; // test-and-set
                    end
                end
            end
        end
    end

    // Read mux (combinational)
    always @(*) begin
        if (addr < 8'hF0) begin
            rdata = ram[addr];
        end else begin
            case (addr)
                8'hF0: rdata = uart_tx_data;
                8'hF1: rdata = {3'd0, uart_tx_busy};
                8'hF2: rdata = led_reg;
                8'hF3: rdata = 4'd0; // core ID filled by SoC
                8'hF4: rdata = {3'd0, mutex_locked};
                8'hF5: rdata = timer[3:0];
                8'hF6: rdata = timer[7:4];
                8'hF8: rdata = flash_rdata;
                8'hF9: rdata = {3'd0, flash_busy};
                8'hFF: rdata = {3'd0, boot_done};
                default: rdata = 4'd0;
            endcase
        end
    end

endmodule

`default_nettype wire
