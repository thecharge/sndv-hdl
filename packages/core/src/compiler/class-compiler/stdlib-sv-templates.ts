// Pre-defined SV module templates for stdlib CDC primitives.
// These are emitted inline when the corresponding type is instantiated via @Submodule.

export interface StdlibModuleTemplate {
    signature: {
        inputs: { name: string; bit_width: number }[];
        outputs: { name: string; bit_width: number }[];
        parameters: { name: string; bit_width: number; default_value: number }[];
    };
    sv: string;
}

export const STDLIB_CDC_PRIMITIVES: Record<string, StdlibModuleTemplate> = {
    ClockDomainCrossing: {
        signature: {
            inputs: [
                { name: 'clk_dst', bit_width: 1 },
                { name: 'rst_n', bit_width: 1 },
                { name: 'd_in', bit_width: 1 },
            ],
            outputs: [
                { name: 'd_out', bit_width: 1 },
            ],
            parameters: [],
        },
        sv: `// Two-FF CDC synchronizer (ClockDomainCrossing)
module ClockDomainCrossing (
    input  logic clk_dst,
    input  logic rst_n,
    input  logic d_in,
    output logic d_out
);
    (* ASYNC_REG = "TRUE" *) logic meta;
    always_ff @(posedge clk_dst or negedge rst_n) begin
        if (!rst_n) begin
            meta  <= 1'b0;
            d_out <= 1'b0;
        end else begin
            meta  <= d_in;
            d_out <= meta;
        end
    end
endmodule
`,
    },

    AsyncFifo: {
        signature: {
            inputs: [
                { name: 'wr_clk', bit_width: 1 },
                { name: 'rd_clk', bit_width: 1 },
                { name: 'rst_n', bit_width: 1 },
                { name: 'wr_en', bit_width: 1 },
                { name: 'wr_data', bit_width: 8 },
                { name: 'rd_en', bit_width: 1 },
            ],
            outputs: [
                { name: 'rd_data', bit_width: 8 },
                { name: 'full', bit_width: 1 },
                { name: 'empty', bit_width: 1 },
            ],
            parameters: [
                { name: 'DATA_WIDTH', bit_width: 8, default_value: 8 },
                { name: 'DEPTH', bit_width: 8, default_value: 16 },
            ],
        },
        sv: `// Dual-clock async FIFO with gray-code pointers (AsyncFifo)
module AsyncFifo #(
    parameter logic [7:0] DATA_WIDTH = 8,
    parameter logic [7:0] DEPTH = 16
) (
    input  logic wr_clk,
    input  logic rd_clk,
    input  logic rst_n,
    input  logic wr_en,
    input  logic [DATA_WIDTH-1:0] wr_data,
    input  logic rd_en,
    output logic [DATA_WIDTH-1:0] rd_data,
    output logic full,
    output logic empty
);
    localparam ADDR_W = $clog2(DEPTH);
    logic [DATA_WIDTH-1:0] mem [0:DEPTH-1];
    logic [ADDR_W:0] wr_ptr, rd_ptr;
    logic [ADDR_W:0] wr_gray, rd_gray;
    logic [ADDR_W:0] wr_gray_sync1, wr_gray_sync2;
    logic [ADDR_W:0] rd_gray_sync1, rd_gray_sync2;

    // Write domain
    always_ff @(posedge wr_clk or negedge rst_n) begin
        if (!rst_n) begin
            wr_ptr  <= '0;
            wr_gray <= '0;
        end else if (wr_en && !full) begin
            mem[wr_ptr[ADDR_W-1:0]] <= wr_data;
            wr_ptr  <= wr_ptr + 1;
            wr_gray <= (wr_ptr + 1) ^ ((wr_ptr + 1) >> 1);
        end
    end

    // Read domain
    always_ff @(posedge rd_clk or negedge rst_n) begin
        if (!rst_n) begin
            rd_ptr  <= '0;
            rd_gray <= '0;
        end else if (rd_en && !empty) begin
            rd_data <= mem[rd_ptr[ADDR_W-1:0]];
            rd_ptr  <= rd_ptr + 1;
            rd_gray <= (rd_ptr + 1) ^ ((rd_ptr + 1) >> 1);
        end
    end

    // Synchronize write pointer to read domain
    always_ff @(posedge rd_clk or negedge rst_n) begin
        if (!rst_n) begin
            wr_gray_sync1 <= '0;
            wr_gray_sync2 <= '0;
        end else begin
            wr_gray_sync1 <= wr_gray;
            wr_gray_sync2 <= wr_gray_sync1;
        end
    end

    // Synchronize read pointer to write domain
    always_ff @(posedge wr_clk or negedge rst_n) begin
        if (!rst_n) begin
            rd_gray_sync1 <= '0;
            rd_gray_sync2 <= '0;
        end else begin
            rd_gray_sync1 <= rd_gray;
            rd_gray_sync2 <= rd_gray_sync1;
        end
    end

    assign full  = (wr_gray == {~rd_gray_sync2[ADDR_W:ADDR_W-1], rd_gray_sync2[ADDR_W-2:0]});
    assign empty = (rd_gray == wr_gray_sync2);
endmodule
`,
    },
};

export const CDC_PRIMITIVE_TYPES = new Set(Object.keys(STDLIB_CDC_PRIMITIVES));
