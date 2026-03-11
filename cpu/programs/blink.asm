; blink.asm - LED blink for nibble4 CPU
; Toggles LED pattern using XOR with delay loop
; Target: Tang Nano 9K, Core 0

; Memory map:
;   0xF2 = LED register (active-low on board)
;   0xF4 = Mutex (for multi-core sync)

start:
    LDI R0, 0xF         ; LED pattern: all on
    LDI R1, 0x2         ; R1 = address nibble for LED reg (0xF2)
    OUT R0, R1           ; write R0 -> LED register

    ; Delay loop (count R2 from 0 to 15, repeat R3 times)
    LDI R3, 0xF          ; outer loop counter
delay_outer:
    LDI R2, 0x0          ; inner counter = 0
delay_inner:
    LDI R1, 0x1          ; constant 1
    ADD R2, R1            ; R2++
    JZ  delay_done        ; if wrapped to 0, inner done
    JMP delay_inner
delay_done:
    LDI R1, 0x1
    SUB R3, R1            ; R3--
    JZ  toggle
    JMP delay_outer

toggle:
    LDI R1, 0xF
    XOR R0, R1            ; flip all LED bits
    LDI R1, 0x2
    OUT R0, R1            ; update LEDs
    JMP start             ; repeat forever

; Assembled (hex nibbles, 2 per instruction byte):
; Addr | Hex    | Instruction
; 0x00 | 10 0F  | LDI R0, 0xF
; 0x03 | 14 02  | LDI R1, 0x2
; 0x06 | E0 04  | OUT R0, R1   (typo: should be E2 but operand encoding)
; ... (see assembler output)
