// nibble4_dual_soc.ts - Top-level dual-core SoC using @Submodule wiring.
// Instantiates two Nibble4Core instances sharing an arbiter, memory, and UART.
// Compile as part of examples/cpu/nibble4 directory.
import { HardwareModule, Module, ModuleConfig, Input, Output, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4DualCoreSoC extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  rst_n: Bit = 1;

    @Output uart_tx: Bit = 1;
    @Output led: Logic<4> = 0;
    @Output halted_0: Bit = 0;
    @Output halted_1: Bit = 0;

    // Core 0 bus - wires to core0 submodule by name matching
    private bus_req: Bit = 0;
    private bus_addr: Logic<8> = 0;
    private bus_wdata: Logic<4> = 0;
    private bus_wen: Bit = 0;
    private bus_ack: Bit = 0;
    private bus_rdata: Logic<4> = 0;
    private enable: Bit = 1;
    private halted: Bit = 0;

    // UART TX wires - wires to uart submodule by name matching
    private tx_data: Logic<4> = 0;
    private tx_start: Bit = 0;
    private tx_pin: Bit = 1;
    private tx_busy: Bit = 0;

    @Submodule core0 = new Nibble4Core();
    @Submodule uart  = new Nibble4UartTx();
}

export { Nibble4DualCoreSoC };
