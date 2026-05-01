// nibble4_soc.ts - nibble4 SoC peripherals: bus arbiter, memory map, UART TX.
// Compile as part of examples/cpu/nibble4 directory.
import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Combinational } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const BAUD_DIV = 234;
const MEM_PERIPH_BASE = 0xF0;

// Bus arbiter: round-robin between 2 cores
@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4Arbiter extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  rst_n: Bit = 1;
    @Input  req_0: Bit = 0;
    @Input  addr_0: Logic<8> = 0;
    @Input  wdata_0: Logic<4> = 0;
    @Input  wen_0: Bit = 0;
    @Input  req_1: Bit = 0;
    @Input  addr_1: Logic<8> = 0;
    @Input  wdata_1: Logic<4> = 0;
    @Input  wen_1: Bit = 0;

    @Output ack_0: Bit = 0;
    @Output ack_1: Bit = 0;
    @Output bus_addr: Logic<8> = 0;
    @Output bus_wdata: Logic<4> = 0;
    @Output bus_wen: Bit = 0;
    @Output bus_valid: Bit = 0;

    private arbPrio: Bit = 0;

    @Sequential('clk')
    arbitrate(): void {
        if (this.req_0 === 1) {
            if (this.req_1 === 0) {
                this.ack_0 = 1;
                this.ack_1 = 0;
                this.bus_addr = this.addr_0;
                this.bus_wdata = this.wdata_0;
                this.bus_wen = this.wen_0;
                this.bus_valid = 1;
                this.arbPrio = 1;
            } else if (this.arbPrio === 0) {
                this.ack_0 = 1;
                this.ack_1 = 0;
                this.bus_addr = this.addr_0;
                this.bus_wdata = this.wdata_0;
                this.bus_wen = this.wen_0;
                this.bus_valid = 1;
                this.arbPrio = 1;
            } else {
                this.ack_0 = 0;
                this.ack_1 = 1;
                this.bus_addr = this.addr_1;
                this.bus_wdata = this.wdata_1;
                this.bus_wen = this.wen_1;
                this.bus_valid = 1;
                this.arbPrio = 0;
            }
        } else if (this.req_1 === 1) {
            this.ack_0 = 0;
            this.ack_1 = 1;
            this.bus_addr = this.addr_1;
            this.bus_wdata = this.wdata_1;
            this.bus_wen = this.wen_1;
            this.bus_valid = 1;
            this.arbPrio = 0;
        } else {
            this.ack_0 = 0;
            this.ack_1 = 0;
            this.bus_valid = 0;
        }
    }
}

// Shared RAM + peripheral decoder
// 0x00-0xEF: RAM, 0xF0: UART TX, 0xF1: UART status, 0xF2: LEDs, 0xF4: Mutex, 0xF5/F6: Timer
@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4Memory extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  rst_n: Bit = 1;
    @Input  addr: Logic<8> = 0;
    @Input  wdata: Logic<4> = 0;
    @Input  wen: Bit = 0;
    @Input  valid: Bit = 0;
    @Input  uart_busy: Bit = 0;

    @Output rdata: Logic<4> = 0;
    @Output uart_tx_data: Logic<4> = 0;
    @Output uart_tx_start: Bit = 0;
    @Output led_out: Logic<4> = 0;

    private mutex_locked: Bit = 0;
    private timer: Logic<8> = 0;

    @Sequential('clk')
    mem_logic(): void {
        this.uart_tx_start = 0;
        this.timer = this.timer + 1;

        if (this.valid === 1) {
            if (this.addr >= MEM_PERIPH_BASE) {
                if (this.wen === 1) {
                    if (this.addr === MEM_PERIPH_BASE) {
                        this.uart_tx_data = this.wdata;
                        this.uart_tx_start = 1;
                    } else if (this.addr === MEM_PERIPH_BASE + 2) {
                        this.led_out = this.wdata;
                    } else if (this.addr === MEM_PERIPH_BASE + 4) {
                        this.mutex_locked = 0;
                    }
                } else {
                    if (this.addr === MEM_PERIPH_BASE + 4) {
                        if (this.mutex_locked === 0) {
                            this.mutex_locked = 1;
                        }
                    }
                }
            }
        }
    }

    @Combinational
    read_mux(): void {
        if (this.addr < MEM_PERIPH_BASE) {
            this.rdata = 0;
        } else if (this.addr === MEM_PERIPH_BASE + 1) {
            this.rdata = this.uart_busy;
        } else if (this.addr === MEM_PERIPH_BASE + 2) {
            this.rdata = this.led_out;
        } else if (this.addr === MEM_PERIPH_BASE + 4) {
            this.rdata = this.mutex_locked;
        } else if (this.addr === MEM_PERIPH_BASE + 5) {
            this.rdata = this.timer & 0xF;
        } else if (this.addr === MEM_PERIPH_BASE + 6) {
            this.rdata = this.timer >> 4;
        } else {
            this.rdata = 0;
        }
    }
}

// UART TX: 8N1 serial transmitter (sends 4-bit nibble pairs as one byte)
enum UartState { US_IDLE = 0, US_WAIT_HI = 1, US_START = 2, US_DATA = 3, US_STOP = 4 }

@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4UartTx extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  rst_n: Bit = 1;
    @Input  tx_data: Logic<4> = 0;
    @Input  tx_start: Bit = 0;

    @Output tx_pin: Bit = 1;
    @Output tx_busy: Bit = 0;

    private state: Logic<3> = UartState.US_IDLE;
    private low_nibble: Logic<4> = 0;
    private shift_reg: Logic<8> = 0;
    private bit_idx: Logic<4> = 0;
    private baud_cnt: Logic<16> = 0;

    @Sequential('clk')
    uart_fsm(): void {
        switch (this.state) {
            case UartState.US_IDLE:
                this.tx_pin = 1;
                if (this.tx_start === 1) {
                    this.low_nibble = this.tx_data;
                    this.state = UartState.US_WAIT_HI;
                }
                break;

            case UartState.US_WAIT_HI:
                if (this.tx_start === 1) {
                    this.shift_reg = (this.tx_data << 4) | this.low_nibble;
                    this.tx_busy = 1;
                    this.baud_cnt = 0;
                    this.state = UartState.US_START;
                }
                break;

            case UartState.US_START:
                this.tx_pin = 0;
                if (this.baud_cnt === BAUD_DIV) {
                    this.baud_cnt = 0;
                    this.bit_idx = 0;
                    this.state = UartState.US_DATA;
                } else {
                    this.baud_cnt = this.baud_cnt + 1;
                }
                break;

            case UartState.US_DATA:
                this.tx_pin = this.shift_reg & 1;
                if (this.baud_cnt === BAUD_DIV) {
                    this.baud_cnt = 0;
                    this.shift_reg = this.shift_reg >> 1;
                    if (this.bit_idx === 7) {
                        this.state = UartState.US_STOP;
                    } else {
                        this.bit_idx = this.bit_idx + 1;
                    }
                } else {
                    this.baud_cnt = this.baud_cnt + 1;
                }
                break;

            case UartState.US_STOP:
                this.tx_pin = 1;
                if (this.baud_cnt === BAUD_DIV) {
                    this.baud_cnt = 0;
                    this.tx_busy = 0;
                    this.state = UartState.US_IDLE;
                } else {
                    this.baud_cnt = this.baud_cnt + 1;
                }
                break;

            default:
                this.state = UartState.US_IDLE;
                break;
        }
    }
}

export { Nibble4Arbiter, Nibble4Memory, Nibble4UartTx };
