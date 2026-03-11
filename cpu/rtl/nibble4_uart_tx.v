// UART TX: sends 8-bit bytes (two nibbles) over serial
// Protocol: 8N1 (8 data bits, no parity, 1 stop bit)
// Usage: write low nibble to 0xF0, then high nibble to 0xF0
//        The peripheral assembles and transmits a full byte.
`timescale 1ns / 1ps
`default_nettype none

module nibble4_uart_tx #(
    parameter CLK_FREQ  = 27_000_000,
    parameter BAUD_RATE = 115200
)(
    input  wire       clk,
    input  wire       rst_n,
    input  wire [3:0] tx_data,
    input  wire       tx_start,
    output reg        tx_busy,
    output reg        tx_pin
);

    localparam BAUD_DIV = CLK_FREQ / BAUD_RATE;

    reg [15:0] baud_counter;
    reg [3:0]  bit_index;
    reg [8:0]  shift_reg;  // start + 8 data bits
    reg        nibble_phase; // 0=waiting for low, 1=waiting for high
    reg [3:0]  low_nibble;

    localparam S_IDLE  = 2'd0;
    localparam S_START = 2'd1;
    localparam S_DATA  = 2'd2;
    localparam S_STOP  = 2'd3;

    reg [1:0] state;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state        <= S_IDLE;
            tx_pin       <= 1'b1;  // idle high
            tx_busy      <= 1'b0;
            baud_counter <= 16'd0;
            bit_index    <= 4'd0;
            shift_reg    <= 9'd0;
            nibble_phase <= 1'b0;
            low_nibble   <= 4'd0;
        end else begin
            case (state)
                S_IDLE: begin
                    tx_pin <= 1'b1;
                    if (tx_start) begin
                        if (!nibble_phase) begin
                            // First nibble (low)
                            low_nibble   <= tx_data;
                            nibble_phase <= 1'b1;
                            tx_busy      <= 1'b0;
                        end else begin
                            // Second nibble (high) - send full byte
                            shift_reg    <= {1'b1, tx_data, low_nibble}; // stop + high + low
                            nibble_phase <= 1'b0;
                            tx_busy      <= 1'b1;
                            baud_counter <= 16'd0;
                            state        <= S_START;
                        end
                    end
                end

                S_START: begin
                    tx_pin <= 1'b0;  // start bit
                    if (baud_counter == BAUD_DIV - 1) begin
                        baud_counter <= 16'd0;
                        bit_index    <= 4'd0;
                        state        <= S_DATA;
                    end else begin
                        baud_counter <= baud_counter + 16'd1;
                    end
                end

                S_DATA: begin
                    tx_pin <= shift_reg[bit_index];
                    if (baud_counter == BAUD_DIV - 1) begin
                        baud_counter <= 16'd0;
                        if (bit_index == 4'd7) begin
                            state <= S_STOP;
                        end else begin
                            bit_index <= bit_index + 4'd1;
                        end
                    end else begin
                        baud_counter <= baud_counter + 16'd1;
                    end
                end

                S_STOP: begin
                    tx_pin <= 1'b1;  // stop bit
                    if (baud_counter == BAUD_DIV - 1) begin
                        baud_counter <= 16'd0;
                        tx_busy      <= 1'b0;
                        state        <= S_IDLE;
                    end else begin
                        baud_counter <= baud_counter + 16'd1;
                    end
                end
            endcase
        end
    end

endmodule

`default_nettype wire
