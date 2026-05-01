// i2c_scan.ts - I2C bus scanner for Tang Nano 20K
// Iterates through I2C addresses 0x08..0x77, attempts a 1-byte read from each.
// LEDs show the last found address (lower 6 bits, active-low).
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/i2c-scan \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/i2c-scan

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { I2cController } from './I2cController';

const SCAN_START_ADDR  = 0x08;
const SCAN_END_ADDR    = 0x77;
const SCAN_INTER_DELAY = 0xFFFF;

enum ScanSt { SCAN_IDLE = 0, SCAN_PROBE = 1, SCAN_WAIT = 2, SCAN_NEXT = 3 }

@Module
@ModuleConfig('resetSignal: "no_rst"')
class I2cScan extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  scl_in: Bit = 1;
    @Input  sda_in: Bit = 1;
    @Output scl: Bit = 1;
    @Output sda_out: Bit = 1;
    @Output sda_oe: Bit = 0;
    @Output led: Logic<6> = 0x3F;

    private start: Bit = 0;
    private addr: Logic<7> = SCAN_START_ADDR;
    private rw: Bit = 1;
    private tx_data: Logic<8> = 0;
    private done: Bit = 0;
    private ack_err: Bit = 0;
    private rx_data: Logic<8> = 0;

    private state: Logic<3> = ScanSt.SCAN_IDLE;
    private delay: Logic<16> = 0;
    private cur_addr: Logic<7> = SCAN_START_ADDR;

    @Submodule i2c = new I2cController();

    @Sequential('clk')
    tick(): void {
        this.start = 0;
        switch (this.state) {
            case ScanSt.SCAN_IDLE: {
                this.cur_addr = SCAN_START_ADDR;
                this.state = ScanSt.SCAN_PROBE;
                break;
            }
            case ScanSt.SCAN_PROBE: {
                this.addr = this.cur_addr;
                this.start = 1;
                this.state = ScanSt.SCAN_WAIT;
                break;
            }
            case ScanSt.SCAN_WAIT: {
                if (this.done === 1) {
                    if (this.ack_err === 0) {
                        this.led = ~this.cur_addr & 0x3F;
                    }
                    this.delay = 0;
                    this.state = ScanSt.SCAN_NEXT;
                }
                break;
            }
            case ScanSt.SCAN_NEXT: {
                this.delay = this.delay + 1;
                if (this.delay === SCAN_INTER_DELAY) {
                    if (this.cur_addr >= SCAN_END_ADDR) {
                        this.state = ScanSt.SCAN_IDLE;
                    } else {
                        this.cur_addr = this.cur_addr + 1;
                        this.state = ScanSt.SCAN_PROBE;
                    }
                }
                break;
            }
            default: {
                this.state = ScanSt.SCAN_IDLE;
                break;
            }
        }
    }
}

export { I2cScan };
