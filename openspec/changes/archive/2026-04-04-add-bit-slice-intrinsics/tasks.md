## 1. Runtime Helper

- [x] 1.1 Add `Bits` namespace to `packages/runtime/src/types.ts` with `slice(signal: number, msb: number, lsb: number): number` and `bit(signal: number, i: number): number` as runtime no-ops (return `0`); add JSDoc noting these are compiler intrinsics
- [x] 1.2 Re-export `Bits` from `packages/runtime/src/index.ts`

## 2. AST

- [x] 2.1 In `packages/core/src/compiler/parser/ast.ts`, add `SliceAccess` expression node: `{ kind: AstNodeKind.SliceAccess; source: ExpressionNode; msb: ExpressionNode; lsb: ExpressionNode }`
- [x] 2.2 Add `SliceAccess` to the `ExpressionNode` union type

## 3. Parser

- [x] 3.1 In the expression parser (or `class-stmt-parser.ts`), detect a `CallExpression` with callee matching `Bits.slice` or `Bits.bit` and produce the appropriate `SliceAccess` or `ArrayAccess` AST node respectively
- [x] 3.2 Emit a warning diagnostic when the identifier `Bits` is declared as a property or variable in a hardware class

## 4. Typechecker

- [x] 4.1 In `packages/core/src/compiler/typechecker/expression-checker.ts`, add a case for `AstNodeKind.SliceAccess`: when both `msb` and `lsb` are `NumericLiteral` nodes, set `bit_width = msb.value - lsb.value + 1`; otherwise set `bit_width: 1` conservatively
- [x] 4.2 Verify `source` expression is typed as a `logic` type (not an array)

## 5. Expression Emitter

- [x] 5.1 In `packages/core/src/compiler/codegen/expression-emitter.ts`, add a case for `AstNodeKind.SliceAccess` that renders `${renderExpression(node.source)}[${renderExpression(node.msb)}:${renderExpression(node.lsb)}]`

## 6. Example

- [x] 6.1 Create `examples/hardware/tang_nano_20k/bus_splitter/bus_splitter.ts` with a module that uses `Bits.slice` in a `@Combinational` method to split a wide input bus into named sub-fields
- [x] 6.2 Verify `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/bus_splitter --board boards/tang_nano_20k.board.json --out /tmp/bus_out` generates `.sv` with `[msb:lsb]` expressions

## 7. Quality Gate

- [x] 7.1 Run `bun run quality` and confirm it passes
- [x] 7.2 Run `bun run test:uvm` and confirm no regressions
