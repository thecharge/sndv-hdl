; multicore_uart.asm - Multi-core UART demo for nibble4
; Each core acquires mutex, sends its core ID over UART, releases mutex
; Demonstrates multi-threaded execution with shared resource protection

; Core 0 sends 'A' (0x41), Core 1 sends 'B' (0x42),
; Core 2 sends 'C' (0x43), Core 3 sends 'D' (0x44)

; All 4 cores run the SAME program simultaneously.
; They differentiate by reading core ID from 0xF3.

; Memory map:
;   0xF0 = UART TX data (write low nibble, then high nibble)
;   0xF1 = UART TX status (bit 0 = busy)
;   0xF3 = Core ID (0-3, read-only)
;   0xF4 = Mutex (read = test-and-set, write = release)

; --- Program ---

start:
    ; Step 1: Try to acquire mutex
acquire:
    LDI R1, 0x4          ; R1 = 0x4 (mutex addr low nibble)
    LDI R2, 0xF          ; R2 = 0xF (peripheral addr high nibble)
    LD  R0, [R2, R1]     ; read mutex -> R0 (test-and-set)
    ; If R0 = 0, we got the lock. If R0 = 1, someone else has it.
    JZ  got_lock          ; zero means we acquired it
    JMP acquire           ; spin until free

got_lock:
    ; Step 2: Read our core ID
    LDI R1, 0x3          ; R1 = 0x3 (core ID addr low nibble)
    LD  R0, [R2, R1]     ; R0 = core ID (0-3)

    ; Step 3: Compute ASCII = 0x41 + core_id
    ; Low nibble: 0x1 + core_id
    LDI R3, 0x1
    ADD R0, R3            ; R0 = 1 + core_id (low nibble of ASCII)

    ; Step 4: Send low nibble to UART
    LDI R1, 0x0          ; R1 = 0x0 (UART data addr low)
    OUT R0, R1            ; write low nibble to 0xF0

    ; Step 5: Send high nibble (0x4 for all: 'A'-'D' = 0x41-0x44)
    LDI R0, 0x4
    OUT R0, R1            ; write high nibble to 0xF0 (triggers TX)

    ; Step 6: Wait for UART TX to complete
wait_uart:
    LDI R1, 0x1          ; UART status addr low
    LD  R0, [R2, R1]     ; read UART busy flag
    JZ  uart_done         ; not busy = done
    JMP wait_uart

uart_done:
    ; Step 7: Release mutex
    LDI R1, 0x4          ; mutex addr
    LDI R0, 0x0          ; write 0 = release
    ST  R0, [R2, R1]     ; release mutex

    ; Step 8: Delay then repeat
    LDI R3, 0xF
delay:
    LDI R1, 0x1
    SUB R3, R1
    JZ  start
    JMP delay
