// nibble4 CPU Core: 4-bit data path, 8-bit address/instruction
// Single core with 4 registers, 16-instruction ISA, flag register
`timescale 1ns / 1ps
`default_nettype none

module nibble4_core #(
    parameter CORE_ID = 0
)(
    input  wire        clk,
    input  wire        rst_n,
    input  wire        enable,
    // Memory bus (active when bus_req asserted, ack from arbiter)
    output reg         bus_req,
    input  wire        bus_ack,
    output reg  [7:0]  bus_addr,
    output reg  [3:0]  bus_wdata,
    input  wire [3:0]  bus_rdata,
    output reg         bus_wen,
    // Status
    output wire        halted
);

    // --- State machine ---
    localparam S_FETCH   = 3'd0;
    localparam S_DECODE  = 3'd1;
    localparam S_EXEC    = 3'd2;
    localparam S_MEM     = 3'd3;
    localparam S_WB      = 3'd4;
    localparam S_FETCH2  = 3'd5;  // fetch 2nd byte for LDI/JMP/JZ
    localparam S_HALT    = 3'd6;

    reg [2:0]  state;
    reg [7:0]  pc;
    reg [3:0]  regs [0:3];    // R0-R3
    reg        flag_z;        // zero flag
    reg        flag_c;        // carry flag

    // Instruction register
    reg [7:0]  ir;
    wire [3:0] opcode  = ir[7:4];
    wire [1:0] reg_a   = ir[3:2];
    wire [1:0] reg_b   = ir[1:0];

    // 2nd byte (for LDI, JMP, JZ)
    reg [7:0]  operand2;

    // ALU
    reg [4:0]  alu_result;  // 5 bits for carry detection
    reg [3:0]  alu_out;

    // Opcodes
    localparam OP_NOP = 4'h0;
    localparam OP_LDI = 4'h1;  // load immediate (2-byte)
    localparam OP_LD  = 4'h2;  // load from memory [R_b as low addr nibble]
    localparam OP_ST  = 4'h3;  // store to memory
    localparam OP_ADD = 4'h4;
    localparam OP_SUB = 4'h5;
    localparam OP_AND = 4'h6;
    localparam OP_OR  = 4'h7;
    localparam OP_XOR = 4'h8;
    localparam OP_NOT = 4'h9;
    localparam OP_SHL = 4'hA;
    localparam OP_SHR = 4'hB;
    localparam OP_JMP = 4'hC;  // unconditional jump (2-byte)
    localparam OP_JZ  = 4'hD;  // jump if zero (2-byte)
    localparam OP_OUT = 4'hE;  // write to peripheral
    localparam OP_HLT = 4'hF;

    wire needs_byte2 = (opcode == OP_LDI) || (opcode == OP_JMP) || (opcode == OP_JZ);

    assign halted = (state == S_HALT);

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state     <= S_FETCH;
            pc        <= 8'd0;
            ir        <= 8'd0;
            operand2  <= 8'd0;
            flag_z    <= 1'b0;
            flag_c    <= 1'b0;
            bus_req   <= 1'b0;
            bus_addr  <= 8'd0;
            bus_wdata <= 4'd0;
            bus_wen   <= 1'b0;
            regs[0]   <= 4'd0;
            regs[1]   <= 4'd0;
            regs[2]   <= 4'd0;
            regs[3]   <= 4'd0;
        end else if (!enable) begin
            bus_req <= 1'b0;
        end else begin
            case (state)
                S_FETCH: begin
                    bus_req  <= 1'b1;
                    bus_addr <= pc;
                    bus_wen  <= 1'b0;
                    if (bus_ack) begin
                        ir       <= {bus_rdata, 4'd0}; // upper nibble first
                        bus_req  <= 1'b1;
                        bus_addr <= pc + 8'd1;
                        state    <= S_FETCH2;
                    end
                end

                S_FETCH2: begin
                    if (bus_ack) begin
                        ir[3:0]  <= bus_rdata; // lower nibble
                        bus_req  <= 1'b0;
                        pc       <= pc + 8'd1; // point past instruction
                        state    <= S_DECODE;
                    end
                end

                S_DECODE: begin
                    if (needs_byte2) begin
                        // Fetch 2nd byte
                        bus_req  <= 1'b1;
                        bus_addr <= pc;
                        bus_wen  <= 1'b0;
                        if (bus_ack) begin
                            operand2 <= {4'd0, bus_rdata};
                            bus_req  <= 1'b0;
                            pc       <= pc + 8'd1;
                            state    <= S_EXEC;
                        end
                    end else begin
                        state <= S_EXEC;
                    end
                end

                S_EXEC: begin
                    case (opcode)
                        OP_NOP: state <= S_FETCH;

                        OP_LDI: begin
                            regs[reg_a] <= operand2[3:0];
                            flag_z <= (operand2[3:0] == 4'd0);
                            state  <= S_FETCH;
                        end

                        OP_LD: begin
                            // Address = {reg_a_val, reg_b_val} or direct
                            bus_req  <= 1'b1;
                            bus_addr <= {regs[reg_a], regs[reg_b]};
                            bus_wen  <= 1'b0;
                            state    <= S_MEM;
                        end

                        OP_ST: begin
                            bus_req   <= 1'b1;
                            bus_addr  <= {regs[reg_a], regs[reg_b]};
                            bus_wdata <= regs[reg_a];
                            bus_wen   <= 1'b1;
                            state     <= S_MEM;
                        end

                        OP_ADD: begin
                            alu_result = {1'b0, regs[reg_a]} + {1'b0, regs[reg_b]};
                            regs[reg_a] <= alu_result[3:0];
                            flag_c <= alu_result[4];
                            flag_z <= (alu_result[3:0] == 4'd0);
                            state  <= S_FETCH;
                        end

                        OP_SUB: begin
                            alu_result = {1'b0, regs[reg_a]} - {1'b0, regs[reg_b]};
                            regs[reg_a] <= alu_result[3:0];
                            flag_c <= alu_result[4];
                            flag_z <= (alu_result[3:0] == 4'd0);
                            state  <= S_FETCH;
                        end

                        OP_AND: begin
                            alu_out = regs[reg_a] & regs[reg_b];
                            regs[reg_a] <= alu_out;
                            flag_z <= (alu_out == 4'd0);
                            state  <= S_FETCH;
                        end

                        OP_OR: begin
                            alu_out = regs[reg_a] | regs[reg_b];
                            regs[reg_a] <= alu_out;
                            flag_z <= (alu_out == 4'd0);
                            state  <= S_FETCH;
                        end

                        OP_XOR: begin
                            alu_out = regs[reg_a] ^ regs[reg_b];
                            regs[reg_a] <= alu_out;
                            flag_z <= (alu_out == 4'd0);
                            state  <= S_FETCH;
                        end

                        OP_NOT: begin
                            alu_out = ~regs[reg_a];
                            regs[reg_a] <= alu_out;
                            flag_z <= (alu_out == 4'd0);
                            state  <= S_FETCH;
                        end

                        OP_SHL: begin
                            flag_c <= regs[reg_a][3];
                            regs[reg_a] <= {regs[reg_a][2:0], 1'b0};
                            flag_z <= ({regs[reg_a][2:0], 1'b0} == 4'd0);
                            state  <= S_FETCH;
                        end

                        OP_SHR: begin
                            flag_c <= regs[reg_a][0];
                            regs[reg_a] <= {1'b0, regs[reg_a][3:1]};
                            flag_z <= ({1'b0, regs[reg_a][3:1]} == 4'd0);
                            state  <= S_FETCH;
                        end

                        OP_JMP: begin
                            pc    <= operand2;
                            state <= S_FETCH;
                        end

                        OP_JZ: begin
                            if (flag_z)
                                pc <= operand2;
                            state <= S_FETCH;
                        end

                        OP_OUT: begin
                            // Write reg_a to peripheral at address in reg_b
                            bus_req   <= 1'b1;
                            bus_addr  <= {4'hF, regs[reg_b]};  // peripheral space 0xF0+
                            bus_wdata <= regs[reg_a];
                            bus_wen   <= 1'b1;
                            state     <= S_MEM;
                        end

                        OP_HLT: begin
                            state <= S_HALT;
                        end

                        default: state <= S_FETCH;
                    endcase
                end

                S_MEM: begin
                    if (bus_ack) begin
                        bus_req <= 1'b0;
                        if (!bus_wen) begin
                            // Load: write bus data to register
                            regs[reg_a] <= bus_rdata;
                            flag_z <= (bus_rdata == 4'd0);
                        end
                        bus_wen <= 1'b0;
                        state   <= S_FETCH;
                    end
                end

                S_HALT: begin
                    bus_req <= 1'b0;
                    // Stay halted until reset
                end

                default: state <= S_FETCH;
            endcase
        end
    end

endmodule

`default_nettype wire
