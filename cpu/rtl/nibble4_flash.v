// SPI Flash Controller for nibble4 SoC
// Loads firmware from SPI flash into RAM at boot
// Protocol: SPI Mode 0 (CPOL=0, CPHA=0)
// Flash command: 0x03 (Read Data), 24-bit address starting at 0x000000
`timescale 1ns / 1ps
`default_nettype none

module nibble4_flash #(
    parameter CLK_DIV    = 4,       // SPI clock = clk / (2*CLK_DIV)
    parameter FW_SIZE    = 64,      // firmware size in nibbles
    parameter FLASH_BASE = 24'h000000
)(
    input  wire       clk,
    input  wire       rst_n,
    // Boot control
    output reg        boot_done,
    // RAM write port (for loading firmware)
    output reg [7:0]  ram_addr,
    output reg [3:0]  ram_wdata,
    output reg        ram_wen,
    // SPI pins
    output reg        spi_sclk,
    output reg        spi_cs_n,
    output reg        spi_mosi,
    input  wire       spi_miso,
    // Manual access from CPU
    input  wire [3:0] cmd,
    input  wire       cmd_start,
    output reg  [3:0] cmd_rdata,
    output reg        busy
);

    localparam S_IDLE       = 3'd0;
    localparam S_SEND_CMD   = 3'd1;
    localparam S_SEND_ADDR  = 3'd2;
    localparam S_READ_DATA  = 3'd3;
    localparam S_STORE      = 3'd4;
    localparam S_DONE       = 3'd5;

    reg [2:0]  state;
    reg [7:0]  byte_count;
    reg [23:0] flash_addr;
    reg [7:0]  shift_out;
    reg [7:0]  shift_in;
    reg [3:0]  bit_count;
    reg [7:0]  clk_div_counter;
    reg        spi_clk_en;

    // Boot sequence: send 0x03, 3 address bytes, then read FW_SIZE nibbles
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state          <= S_SEND_CMD;
            boot_done      <= 1'b0;
            spi_sclk       <= 1'b0;
            spi_cs_n       <= 1'b0; // assert CS at reset
            spi_mosi       <= 1'b0;
            ram_addr       <= 8'd0;
            ram_wdata      <= 4'd0;
            ram_wen        <= 1'b0;
            shift_out      <= 8'h03; // READ command
            shift_in       <= 8'd0;
            bit_count      <= 4'd0;
            byte_count     <= 8'd0;
            flash_addr     <= FLASH_BASE;
            clk_div_counter <= 8'd0;
            spi_clk_en     <= 1'b0;
            cmd_rdata      <= 4'd0;
            busy           <= 1'b1;
        end else begin
            ram_wen <= 1'b0;

            // SPI clock divider
            if (clk_div_counter < CLK_DIV - 1) begin
                clk_div_counter <= clk_div_counter + 8'd1;
            end else begin
                clk_div_counter <= 8'd0;
                spi_clk_en <= 1'b1;
            end

            if (spi_clk_en) begin
                spi_clk_en <= 1'b0;

                case (state)
                    S_SEND_CMD: begin
                        // Shift out command byte (0x03)
                        spi_mosi <= shift_out[7 - bit_count];
                        spi_sclk <= ~spi_sclk;
                        if (spi_sclk) begin // falling edge = advance
                            bit_count <= bit_count + 4'd1;
                            if (bit_count == 4'd7) begin
                                bit_count <= 4'd0;
                                shift_out <= flash_addr[23:16];
                                byte_count <= 8'd0;
                                state <= S_SEND_ADDR;
                            end
                        end
                    end

                    S_SEND_ADDR: begin
                        spi_mosi <= shift_out[7 - bit_count];
                        spi_sclk <= ~spi_sclk;
                        if (spi_sclk) begin
                            bit_count <= bit_count + 4'd1;
                            if (bit_count == 4'd7) begin
                                bit_count <= 4'd0;
                                byte_count <= byte_count + 8'd1;
                                case (byte_count)
                                    8'd0: shift_out <= flash_addr[15:8];
                                    8'd1: shift_out <= flash_addr[7:0];
                                    8'd2: begin
                                        byte_count <= 8'd0;
                                        state <= S_READ_DATA;
                                    end
                                    default: ;
                                endcase
                            end
                        end
                    end

                    S_READ_DATA: begin
                        spi_sclk <= ~spi_sclk;
                        if (!spi_sclk) begin // rising edge = sample
                            shift_in <= {shift_in[6:0], spi_miso};
                            bit_count <= bit_count + 4'd1;
                            if (bit_count == 4'd3) begin
                                // Got a nibble (4 bits)
                                ram_wdata <= {shift_in[2:0], spi_miso};
                                state <= S_STORE;
                            end
                        end
                    end

                    S_STORE: begin
                        ram_addr <= byte_count;
                        ram_wen  <= 1'b1;
                        byte_count <= byte_count + 8'd1;
                        bit_count  <= 4'd0;
                        if (byte_count >= FW_SIZE - 1) begin
                            state <= S_DONE;
                        end else begin
                            state <= S_READ_DATA;
                        end
                    end

                    S_DONE: begin
                        spi_cs_n  <= 1'b1; // deassert CS
                        spi_sclk  <= 1'b0;
                        boot_done <= 1'b1;
                        busy      <= 1'b0;
                    end

                    default: state <= S_DONE;
                endcase
            end
        end
    end

endmodule

`default_nettype wire
