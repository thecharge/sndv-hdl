# matrix-multiply-uart Specification

## Purpose
TBD - created by archiving change platform-expansion-v1. Update Purpose after archive.
## Requirements
### Requirement: matrix_uart directory structure mirrors calc_uart
The `examples/hardware/tang_nano_20k/matrix_uart/` directory SHALL contain exactly the same top-level layout as calc_uart: `hw/` (TypeScript hardware source), `client/` (Bun TypeScript CLI client), `flash.sh`, `run.sh`, and `README.md`.

#### Scenario: matrix_uart directory layout is correct
- **WHEN** the `matrix_uart/` directory is listed
- **THEN** `hw/`, `client/`, `flash.sh`, `run.sh`, and `README.md` are all present

### Requirement: FPGA hardware performs 4x4 8-bit integer matrix multiplication
The hardware design under `matrix_uart/hw/` SHALL implement a 4x4 matrix multiplier for 8-bit unsigned integer operands. The multiply-accumulate result SHALL be 16-bit per element. The design receives two flattened matrices (32 bytes each) over UART, computes the product, and returns the 16-element result (32 bytes) over UART.

#### Scenario: matrix multiply produces correct result
- **WHEN** the FPGA receives two identity matrices encoded as 32 bytes each
- **THEN** the FPGA replies with the 32-byte encoding of the identity matrix result within 100 ms

#### Scenario: matrix multiply result is 16-bit per element
- **WHEN** two matrices with values 0xFF are multiplied
- **THEN** each output element is 16-bit wide and no overflow truncation occurs in the SV output

### Requirement: matrix_uart hardware uses UART framing matching calc_uart
The hw UART TX and RX modules SHALL use 8-N-1 framing at a baud rate matching the calc_uart example (115200 baud), enabling the same USB serial port setup.

#### Scenario: matrix_uart compiles at correct baud
- **WHEN** the hw directory is compiled for Tang Nano 20K
- **THEN** the generated SV contains the correct baud divisor constant for 115200 baud at 27 MHz

### Requirement: matrix_uart flash.sh compiles and flashes
`flash.sh` SHALL invoke `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/matrix_uart/hw --board boards/tang_nano_20k.board.json --out .artifacts/matrix_uart --flash` and print a post-flash reminder identical in style to calc_uart.

#### Scenario: flash.sh runs without error
- **WHEN** `./examples/hardware/tang_nano_20k/matrix_uart/flash.sh` is executed on a connected Tang Nano 20K
- **THEN** it exits 0 and prints "Flash complete."

### Requirement: matrix_uart run.sh auto-detects UART port
`run.sh` SHALL use the same auto-detect logic as calc_uart (exactly two ttyUSB devices -> select second; otherwise require explicit port argument) and `exec bun` the client CLI.

#### Scenario: run.sh with explicit port passes port to client
- **WHEN** `./examples/hardware/tang_nano_20k/matrix_uart/run.sh /dev/ttyUSB1` is called
- **THEN** the Bun client is launched with `/dev/ttyUSB1` as the port argument

### Requirement: Bun CLI client accepts JSON matrix input
The `client/matrix.ts` CLI SHALL accept one JSON object per line on stdin with the shape `{ "a": number[][], "b": number[][] }` (4x4 arrays), send the encoded operands to the FPGA, receive the result, and print a JSON response `{ "a": ..., "b": ..., "result": number[][], "ms": number }`.

#### Scenario: client multiplies two 4x4 matrices
- **WHEN** the user inputs `{"a": [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]], "b": [[2,0,0,0],[0,2,0,0],[0,0,2,0],[0,0,0,2]]}`
- **THEN** the client prints a JSON response with `"result": [[2,0,0,0],[0,2,0,0],[0,0,2,0],[0,0,0,2]]`

#### Scenario: client includes round-trip latency
- **WHEN** a matrix multiplication completes
- **THEN** the JSON response includes an `"ms"` field with the measured round-trip time in milliseconds

### Requirement: matrix_uart has a UVM testbench spec
A `SeqTestSpec` SHALL exist at `testbenches/matrix-uart.tb-spec.ts` covering: reset behavior, identity matrix multiply, and a non-trivial 4x4 multiply with known result.

#### Scenario: matrix-uart testbench passes
- **WHEN** `bun run test:uvm` is executed
- **THEN** the matrix-uart suite runs and all three scenarios produce PASS

### Requirement: matrix_uart listed in README
The matrix_uart example SHALL be listed in README.md examples section and in `docs/guides/examples-matrix.md` with a one-line description and the flash/run commands.

#### Scenario: README references matrix_uart
- **WHEN** README.md is read
- **THEN** it contains a reference to `examples/hardware/tang_nano_20k/matrix_uart/` with a description

