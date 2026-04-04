# Constraints — cpu-and-soc-extensions

---

## Compiler Limitation Budget

CPU and SoC designs are the most demanding consumers of the compiler. They frequently hit
known limitations. The following constraints apply when writing CPU/SoC hardware source:

**LogicArray indexed sequential access (not supported):**
- Do NOT write `this.registers[this.pc]` in `@Sequential`
- Use `if (this.pc === 0) { this.reg0 = ...; } else if (this.pc === 1) { ... }`
- The maximum number of registers is limited by readability; document the count

**Parameterised modules (not supported):**
- Do NOT write `class CPU<WORD_WIDTH extends number>`
- Use a shared `_constants.ts` file for design parameters; accept hard-coding for now

**No `@InOut` / tristate:**
- For USB PD CC lines or any bidirectional I/O: split into separate `@Input`/`@Output`
  and handle multiplexing externally

**Enum global namespace (multi-file design):**
- Every enum member name must be unique across ALL enums in the entire compiled directory
- Prefix every member with the enum type name or module abbreviation

**Private helper method variable naming:**
- `let` with the same name in multiple helper methods collide when inlined
- Use unique names across all helper methods, or avoid `let` in helpers entirely
- Reference `this.X` registers directly inside helpers instead

---

## Scope Boundary

The CPU and SoC capability covers digital logic designs implemented in the ts2v TypeScript
subset. It does NOT cover:
- Processor-like designs implemented in any other language
- Soft-core CPUs sourced from external IP cores (all source must be TypeScript)
- Designs that require closed-source synthesis tools
- Any FPGA family not in the verified OSS toolchain

---

## Complexity Warning

Large CPU designs with many modules and FSMs are the primary scenario where compiler
limitations are encountered. Before starting a large CPU design:
1. Read `CLAUDE.md` "Known Compiler Limitations" section completely
2. Identify which patterns your design will need
3. Determine if any required patterns have no workaround
4. File a proposal to add the missing compiler feature if needed
