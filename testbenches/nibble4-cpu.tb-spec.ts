// TypeScript testbench spec for the nibble4 4-bit CPU core.
// Source: examples/cpu/nibble4/nibble4_core.ts
//
// State encoding (CoreState):
//   CS_FETCH_HI=0  CS_FETCH_LO=1  CS_DECODE=2  CS_EXEC=3  CS_MEM=4  CS_HALT=5
//
// Opcode encoding (Opcode):
//   N4_NOP=0  N4_LDI=1  N4_LD=2  N4_ST=3  N4_ADD=4  N4_SUB=5  N4_AND=6  N4_OR=7
//   N4_XOR=8  N4_NOT=9  N4_SHL=10  N4_SHR=11  N4_JMP=12  N4_JZ=13  N4_OUT=14  N4_HLT=15

import type { SeqTestSpec } from '@ts2v/types';

export const nibble4CpuSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'Nibble4Core',
    sourceFile: 'examples/cpu/nibble4/nibble4_core.ts',
    clock: 'clk',
    reset: 'rst_n',
    clockHalfPeriodNs: 18,
    checks: [
        // --- Reset behaviour ---
        {
            label: 'reset_pc_zero',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { pc: "8'h00" },
        },
        {
            label: 'reset_halted_clear',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { halted: "1'b0" },
        },
        {
            label: 'reset_state_fetch_hi',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { state: "3'd0" },
        },

        // --- ADD instruction (ir_hi=N4_ADD=4) ---
        // Force CS_EXEC state with ADD opcode and r0=5, r1=3.
        // After one clock: r0 = 5 + 3 = 8, flag_z = 0.
        {
            label: 'add_r0_plus_r1_equals_8',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd4",
                r0: "4'd5",
                r1: "4'd3",
                enable: "1'b1",
            },
            expectedSignals: { r0: "4'd8" },
        },
        {
            label: 'add_no_zero_flag_when_nonzero',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd4",
                r0: "4'd5",
                r1: "4'd3",
                enable: "1'b1",
            },
            expectedSignals: { flag_z: "1'b0" },
        },
        // ADD result = 0 sets zero flag. r0=0xF + r1=1 wraps to 0 (nibble).
        {
            label: 'add_zero_flag_on_overflow_to_zero',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd4",
                r0: "4'd15",
                r1: "4'd1",
                enable: "1'b1",
            },
            expectedSignals: { flag_z: "1'b1" },
        },
        // ADD sets carry flag when result exceeds 4 bits (15+1=16 -> carry=1).
        {
            label: 'add_carry_flag_on_overflow',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd4",
                r0: "4'd15",
                r1: "4'd1",
                enable: "1'b1",
            },
            expectedSignals: { flag_c: "1'b1" },
        },

        // --- JMP instruction (ir_hi=N4_JMP=12) ---
        // Force CS_EXEC with JMP opcode and operand=0x42.
        // After one clock: pc = 0x42.
        {
            label: 'jmp_sets_pc_to_operand',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd12",
                operand: "8'h42",
                enable: "1'b1",
            },
            expectedSignals: { pc: "8'h42" },
        },
        {
            label: 'jmp_returns_to_fetch_hi',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd12",
                operand: "8'h10",
                enable: "1'b1",
            },
            expectedSignals: { state: "3'd0" },
        },

        // --- JZ instruction (ir_hi=N4_JZ=13) ---
        // When flag_z=1: pc = operand.
        {
            label: 'jz_taken_when_zero_flag_set',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd13",
                flag_z: "1'b1",
                operand: "8'h50",
                enable: "1'b1",
            },
            expectedSignals: { pc: "8'h50" },
        },
        // When flag_z=0: pc unchanged, advance to CS_FETCH_HI.
        {
            label: 'jz_not_taken_when_zero_flag_clear',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd13",
                flag_z: "1'b0",
                pc: "8'h20",
                operand: "8'h50",
                enable: "1'b1",
            },
            expectedSignals: { state: "3'd0" },
        },

        // --- HLT instruction (ir_hi=N4_HLT=15) ---
        {
            label: 'hlt_sets_halted_output',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd15",
                enable: "1'b1",
            },
            expectedSignals: { halted: "1'b1" },
        },
        {
            label: 'hlt_moves_to_halt_state',
            forcedSignals: {
                state: "3'd3",
                ir_hi: "4'd15",
                enable: "1'b1",
            },
            expectedSignals: { state: "3'd5" },
        },

        // --- Disabled (enable=0) ---
        // When enable=0 the core does not issue bus requests.
        {
            label: 'disabled_clears_bus_req',
            forcedSignals: {
                state: "3'd0",
                enable: "1'b0",
            },
            expectedSignals: { bus_req: "1'b0" },
        },
    ],
};
