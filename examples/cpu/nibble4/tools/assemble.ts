#!/usr/bin/env bun
// assemble.ts - nibble4 assembler.
// Usage: bun run tools/assemble.ts programs/counter.n4asm
// Output: prints nibble array (hex) and writes .bin file alongside the .n4asm file.
//
// nibble4 ISA:
//   NOP                   - 2 nibbles: [0, 0]
//   LDI r<n>, <imm4>      - 3 nibbles: [1, n, imm]
//   LD  r<n>              - 2 nibbles: [2, n]  (addr = r0)
//   ST  r<n>              - 2 nibbles: [3, n]  (addr = r0, data = r1)
//   ADD                   - 2 nibbles: [4, 0]  (r0 = r0 + r1)
//   SUB                   - 2 nibbles: [5, 0]  (r0 = r0 - r1)
//   AND                   - 2 nibbles: [6, 0]  (r0 = r0 & r1)
//   OR                    - 2 nibbles: [7, 0]  (r0 = r0 | r1)
//   XOR                   - 2 nibbles: [8, 0]  (r0 = r0 ^ r1)
//   NOT                   - 2 nibbles: [9, 0]  (r0 = ~r0 & 0xF)
//   SHL                   - 2 nibbles: [A, 0]  (r0 <<= 1)
//   SHR                   - 2 nibbles: [B, 0]  (r0 >>= 1)
//   JMP <label|imm4>      - 3 nibbles: [C, 0, target]
//   JZ  <label|imm4>      - 3 nibbles: [D, 0, target] (jumps if flag_z == 1)
//   OUT                   - 2 nibbles: [E, 0]  (write r0 to 0xF0+r1)
//   HLT                   - 2 nibbles: [F, 0]
//
// Registers: r0, r1, r2, r3 (LDI only; all ALU ops use r0/r1 fixed).
// Labels: <name>: on its own line or before an instruction.
// Comments: ; to end of line.
// JMP/JZ targets: labels or 4-bit literals (0..15). Addresses > 15 cause an error.

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const OPCODES: Record<string, number> = {
    NOP: 0, LDI: 1, LD: 2, ST: 3,
    ADD: 4, SUB: 5, AND: 6, OR: 7,
    XOR: 8, NOT: 9, SHL: 10, SHR: 11,
    JMP: 12, JZ: 13, OUT: 14, HLT: 15,
};

const REG: Record<string, number> = { r0: 0, r1: 1, r2: 2, r3: 3 };

function parseImm(tok: string, labels: Record<string, number>): number {
    if (tok in labels) {
        const target = labels[tok];
        if (target > 15) throw new Error(`Label '${tok}' resolves to address ${target} which exceeds 4-bit range (max 15)`);
        return target;
    }
    const v = tok.startsWith('0x') ? parseInt(tok, 16) : parseInt(tok, 10);
    if (isNaN(v) || v < 0 || v > 15) throw new Error(`Immediate '${tok}' out of 4-bit range`);
    return v;
}

function assemble(src: string): Uint8Array {
    // Strip comments, split into tokens per line, collect labels.
    const lines = src.split('\n').map(l => l.replace(/;.*/, '').trim()).filter(Boolean);

    // First pass: collect labels (nibble addresses).
    const labels: Record<string, number> = {};
    let nibbleAddr = 0;
    for (const line of lines) {
        const labelMatch = line.match(/^(\w+):(.*)$/);
        if (labelMatch) {
            labels[labelMatch[1]] = nibbleAddr;
            const rest = labelMatch[2].trim();
            if (!rest) continue;
            // fall through to size the instruction
            const tokens = rest.toUpperCase().split(/\s+|,\s*/);
            nibbleAddr += instrSize(tokens[0]);
        } else {
            const tokens = line.toUpperCase().split(/\s+|,\s*/);
            nibbleAddr += instrSize(tokens[0]);
        }
    }

    // Second pass: emit nibbles.
    const nibbles: number[] = [];
    for (const line of lines) {
        const labelMatch = line.match(/^(\w+):(.*)$/);
        const instrStr = labelMatch ? labelMatch[2].trim() : line;
        if (!instrStr) continue;

        const tokens = instrStr.split(/\s+|,\s*/);
        const mnemonic = tokens[0].toUpperCase();
        const opcode = OPCODES[mnemonic];
        if (opcode === undefined) throw new Error(`Unknown mnemonic: ${mnemonic}`);

        switch (mnemonic) {
            case 'NOP': case 'ADD': case 'SUB': case 'AND': case 'OR': case 'XOR':
            case 'NOT': case 'SHL': case 'SHR': case 'OUT': case 'HLT':
                nibbles.push(opcode, 0);
                break;
            case 'LDI': {
                const reg = REG[tokens[1].toLowerCase()];
                if (reg === undefined) throw new Error(`Unknown register: ${tokens[1]}`);
                const imm = parseImm(tokens[2], labels);
                nibbles.push(opcode, reg, imm);
                break;
            }
            case 'LD': case 'ST': {
                const reg = REG[tokens[1].toLowerCase()];
                if (reg === undefined) throw new Error(`Unknown register: ${tokens[1]}`);
                nibbles.push(opcode, reg);
                break;
            }
            case 'JMP': case 'JZ': {
                const target = parseImm(tokens[1], labels);
                nibbles.push(opcode, 0, target);
                break;
            }
        }
    }

    if (nibbles.length > 32) {
        throw new Error(`Program too large: ${nibbles.length} nibbles (max 32)`);
    }

    return new Uint8Array(nibbles);
}

function instrSize(mnemonic: string): number {
    switch (mnemonic.toUpperCase()) {
        case 'LDI': case 'JMP': case 'JZ': return 3;
        default: return 2;
    }
}

const asmFile = process.argv[2];
if (!asmFile) {
    console.error('Usage: bun run tools/assemble.ts <file.n4asm>');
    process.exit(1);
}

const src = readFileSync(resolve(asmFile), 'utf8');
let nibbles: Uint8Array;
try {
    nibbles = assemble(src);
} catch (e: any) {
    console.error(`Assembly error: ${e.message}`);
    process.exit(1);
}

const hex = Array.from(nibbles).map(n => n.toString(16).toUpperCase().padStart(1, '0')).join(' ');
console.log(`Assembled ${nibbles.length} nibbles: ${hex}`);

const outPath = resolve(asmFile).replace(/\.n4asm$/, '.bin');
writeFileSync(outPath, nibbles);
console.log(`Written: ${outPath}`);
