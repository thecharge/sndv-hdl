// 4-port round-robin bus arbiter for nibble4 multi-core SoC
`timescale 1ns / 1ps
`default_nettype none

module nibble4_arbiter (
    input  wire        clk,
    input  wire        rst_n,
    // Core 0
    input  wire        req_0,   output reg         ack_0,
    input  wire [7:0]  addr_0,  input  wire [3:0]  wdata_0,
    input  wire        wen_0,
    // Core 1
    input  wire        req_1,   output reg         ack_1,
    input  wire [7:0]  addr_1,  input  wire [3:0]  wdata_1,
    input  wire        wen_1,
    // Core 2
    input  wire        req_2,   output reg         ack_2,
    input  wire [7:0]  addr_2,  input  wire [3:0]  wdata_2,
    input  wire        wen_2,
    // Core 3
    input  wire        req_3,   output reg         ack_3,
    input  wire [7:0]  addr_3,  input  wire [3:0]  wdata_3,
    input  wire        wen_3,
    // Shared bus output
    output reg  [7:0]  bus_addr,
    output reg  [3:0]  bus_wdata,
    output reg         bus_wen,
    output reg         bus_valid
);

    reg [1:0] priority_ptr;  // round-robin pointer
    reg [1:0] grant;
    reg       granted;

    wire [3:0] requests = {req_3, req_2, req_1, req_0};

    // Combinational grant logic (round-robin)
    always @(*) begin
        granted = 1'b0;
        grant   = 2'd0;
        ack_0   = 1'b0;
        ack_1   = 1'b0;
        ack_2   = 1'b0;
        ack_3   = 1'b0;
        bus_addr  = 8'd0;
        bus_wdata = 4'd0;
        bus_wen   = 1'b0;
        bus_valid = 1'b0;

        // Check each core starting from priority pointer
        if (requests[(priority_ptr + 0) % 4]) begin
            grant = (priority_ptr + 0) % 4; granted = 1'b1;
        end else if (requests[(priority_ptr + 1) % 4]) begin
            grant = (priority_ptr + 1) % 4; granted = 1'b1;
        end else if (requests[(priority_ptr + 2) % 4]) begin
            grant = (priority_ptr + 2) % 4; granted = 1'b1;
        end else if (requests[(priority_ptr + 3) % 4]) begin
            grant = (priority_ptr + 3) % 4; granted = 1'b1;
        end

        if (granted) begin
            bus_valid = 1'b1;
            case (grant)
                2'd0: begin ack_0 = 1'b1; bus_addr = addr_0; bus_wdata = wdata_0; bus_wen = wen_0; end
                2'd1: begin ack_1 = 1'b1; bus_addr = addr_1; bus_wdata = wdata_1; bus_wen = wen_1; end
                2'd2: begin ack_2 = 1'b1; bus_addr = addr_2; bus_wdata = wdata_2; bus_wen = wen_2; end
                2'd3: begin ack_3 = 1'b1; bus_addr = addr_3; bus_wdata = wdata_3; bus_wen = wen_3; end
            endcase
        end
    end

    // Advance priority pointer each cycle a grant is made
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            priority_ptr <= 2'd0;
        else if (granted)
            priority_ptr <= grant + 2'd1;
    end

endmodule

`default_nettype wire
