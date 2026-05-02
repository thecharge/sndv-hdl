## ADDED Requirements

### Requirement: tpu_uart directory structure mirrors calc_uart
The `examples/hardware/tang_nano_20k/tpu_uart/` directory SHALL contain the same top-level layout as calc_uart: `hw/` (TypeScript hardware source), `client/` (Bun TypeScript CLI client), `flash.sh`, `run.sh`, and `README.md`.

#### Scenario: tpu_uart directory layout is correct
- **WHEN** the `tpu_uart/` directory is listed
- **THEN** `hw/`, `client/`, `flash.sh`, `run.sh`, and `README.md` are all present

### Requirement: FPGA hardware implements a 4-element TPU with dot-product, accumulate, and ReLU
The hardware design under `tpu_uart/hw/` SHALL implement a tensor processing unit supporting three operations on 4-element 8-bit integer vectors:
- `dot`: dot product of two 4-element vectors, returning a 16-bit scalar result.
- `mac`: multiply-accumulate - multiply two 4-element vectors element-wise and accumulate into an internal 16-bit accumulator register; return the current accumulator value.
- `relu`: apply ReLU (max(0, x)) element-wise to a 4-element 8-bit input vector; return the 4-element result.
The design receives an operation code and operand bytes over UART and replies with the result over UART.

#### Scenario: dot product produces correct scalar
- **WHEN** the FPGA receives `op=dot`, vector A = [1, 2, 3, 4], vector B = [4, 3, 2, 1]
- **THEN** the FPGA replies with the 16-bit value 20 (1*4 + 2*3 + 3*2 + 4*1)

#### Scenario: mac accumulates across calls
- **WHEN** two successive `mac` operations are sent with [1,1,1,1] and [1,1,1,1]
- **THEN** the first reply is 4, the second reply is 8 (accumulator persists between calls)

#### Scenario: ReLU zeroes negative-equivalent values
- **WHEN** the FPGA receives `op=relu`, vector = [0, 255, 128, 64]
- **THEN** the FPGA replies with [0, 255, 128, 64] (all values >= 0 in unsigned 8-bit pass through)

#### Scenario: accumulator reset operation
- **WHEN** the FPGA receives `op=reset_acc`
- **THEN** the accumulator is cleared to 0 and the FPGA replies with 0

### Requirement: tpu_uart hardware uses UART framing matching calc_uart
The hw UART TX and RX modules SHALL use 8-N-1 framing at 115200 baud (27 MHz clock), matching calc_uart.

#### Scenario: tpu_uart compiles at correct baud
- **WHEN** the hw directory is compiled for Tang Nano 20K
- **THEN** the generated SV contains the correct baud divisor constant for 115200 baud at 27 MHz

### Requirement: tpu_uart flash.sh compiles and flashes
`flash.sh` SHALL invoke `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/tpu_uart/hw --board boards/tang_nano_20k.board.json --out .artifacts/tpu_uart --flash` and print a post-flash reminder.

#### Scenario: flash.sh runs without error
- **WHEN** `./examples/hardware/tang_nano_20k/tpu_uart/flash.sh` is executed on a connected Tang Nano 20K
- **THEN** it exits 0 and prints "Flash complete."

### Requirement: tpu_uart run.sh auto-detects UART port
`run.sh` SHALL use the same auto-detect logic as calc_uart and `exec bun` the client CLI.

#### Scenario: run.sh with explicit port passes port to client
- **WHEN** `./examples/hardware/tang_nano_20k/tpu_uart/run.sh /dev/ttyUSB1` is called
- **THEN** the Bun client is launched with `/dev/ttyUSB1` as the port argument

### Requirement: Bun CLI client accepts JSON TPU operations
The `client/tpu.ts` CLI SHALL accept one JSON object per line on stdin with the shape `{ "op": "dot" | "mac" | "relu" | "reset_acc", "a": number[], "b"?: number[] }`, send the encoded command to the FPGA, receive the result, and print a JSON response `{ "op": ..., "result": number | number[], "ms": number }`.

#### Scenario: client sends dot product and receives scalar
- **WHEN** the user inputs `{"op": "dot", "a": [1,2,3,4], "b": [4,3,2,1]}`
- **THEN** the client prints `{"op":"dot","a":[1,2,3,4],"b":[4,3,2,1],"result":20,"ms":<n>}`

#### Scenario: client sends relu and receives vector
- **WHEN** the user inputs `{"op": "relu", "a": [0, 255, 128, 64]}`
- **THEN** the client prints `{"op":"relu","a":[0,255,128,64],"result":[0,255,128,64],"ms":<n>}`

#### Scenario: client includes round-trip latency
- **WHEN** any operation completes
- **THEN** the JSON response includes an `"ms"` field with the measured round-trip time in milliseconds

### Requirement: tpu_uart has a UVM testbench spec
A `SeqTestSpec` SHALL exist at `testbenches/tpu-uart.tb-spec.ts` covering: reset behavior, dot product with known result, mac accumulation across two calls, and ReLU passthrough.

#### Scenario: tpu-uart testbench passes
- **WHEN** `bun run test:uvm` is executed
- **THEN** the tpu-uart suite runs and all four scenarios produce PASS

### Requirement: tpu_uart listed in README
The tpu_uart example SHALL be listed in README.md examples section and in `docs/guides/examples-matrix.md` with a one-line description and the flash/run commands.

#### Scenario: README references tpu_uart
- **WHEN** README.md is read
- **THEN** it contains a reference to `examples/hardware/tang_nano_20k/tpu_uart/` with a description
