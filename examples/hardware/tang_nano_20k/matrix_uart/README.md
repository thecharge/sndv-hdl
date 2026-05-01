# matrix_uart - 4x4 Matrix Multiply over UART

Performs a 4x4 8-bit matrix multiply on the FPGA. Send two flattened matrices as 64 bytes; receive the 16-element 16-bit result as 32 bytes.

## Hardware Design

| Module | File | Purpose |
|--------|------|---------|
| `MatrixTop` | `hw/matrix_top.ts` | Top-level: receives A and B, triggers engine, sends result |
| `MatrixEngine` | `hw/matrix_engine.ts` | Combinational 4x4 multiply; 16-bit outputs (`c0..c15`) |
| `MatrixUartRx` | `hw/matrix_uart_rx.ts` | 8N1 UART receiver, 115200 baud, 27 MHz |
| `MatrixUartTx` | `hw/matrix_uart_tx.ts` | 8N1 UART transmitter, 115200 baud, 27 MHz |

The engine computes all 16 dot products combinationally in one clock after both matrices arrive. `MatrixTop` orchestrates three states: receive A (16 bytes), receive B (16 bytes), send result (32 bytes).

## UART Protocol

**Baud rate:** 115200, 8N1, no flow control.

**Send (host → FPGA):** 64 bytes — matrix A row-major then matrix B row-major, each element as a single `uint8`.

**Receive (FPGA → host):** 32 bytes — result matrix C row-major, each element as a little-endian `uint16` (low byte first, high byte second).

```
C[i][j] = sum_k( A[i][k] * B[k][j] )   (8-bit inputs, 16-bit result)
```

Example: identity × identity returns 32 bytes encoding the 4x4 identity matrix of `uint16`.

## Flash and Run

```bash
./examples/hardware/tang_nano_20k/matrix_uart/flash.sh
```

After flash completes, unplug and replug USB to power-cycle the board. Then:

```bash
./examples/hardware/tang_nano_20k/matrix_uart/run.sh [/dev/ttyUSBn]
```

The client reads JSON from stdin:

```json
{"a": [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],
 "b": [[2,3,0,0],[0,1,0,0],[0,0,4,0],[0,0,0,5]]}
```

Output:

```json
{"a":[[1,0,0,0],...], "b":[[2,3,0,0],...], "result":[[2,3,0,0],[0,1,0,0],[0,0,4,0],[0,0,0,5]], "ms":3}
```

## Example Session

```
$ echo '{"a":[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]],"b":[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]}' | ./run.sh
{"a":[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]],"b":[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],"result":[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]],"ms":4}
```

## Hardware-Verified Results

Tested on Tang Nano 20K (GW2AR-18C, 27 MHz):

- identity × identity = identity PASS
- A × identity = A PASS
- diag(2,3,5,7) × diag(4,6,8,9) = diag(8,18,40,63) PASS

## Ports (tang_nano_20k.board.json)

| Signal | Pin | Direction |
|--------|-----|-----------|
| `clk` | 4 | input (27 MHz) |
| `uart_rx` | 70 | input (BL616 UART TX) |
| `uart_tx` | 69 | output (BL616 UART RX) |
| `led[0..5]` | 15-20 | output (active-low: ON during result send) |
