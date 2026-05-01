import { HardwareModule, Input, Module, ModuleConfig, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// AsyncFifo: dual-clock async FIFO with gray-code pointers.
// SV emitted as a pre-defined template when instantiated via @Submodule.
// Default DATA_WIDTH=8, DEPTH=16 (change constants before use).

@Module
@ModuleConfig('resetSignal: "rst_n"')
class AsyncFifo extends HardwareModule {
  @Input wr_clk: Bit = 0;
  @Input rd_clk: Bit = 0;
  @Input rst_n: Bit = 0;
  @Input wr_en: Bit = 0;
  @Input wr_data: Logic<8> = 0;
  @Input rd_en: Bit = 0;
  @Output rd_data: Logic<8> = 0;
  @Output full: Bit = 0;
  @Output empty: Bit = 1;

  private wr_ptr: Logic<5> = 0;
  private rd_ptr: Logic<5> = 0;
  private wr_gray: Logic<5> = 0;
  private rd_gray: Logic<5> = 0;
  private wr_gray_sync1: Logic<5> = 0;
  private wr_gray_sync2: Logic<5> = 0; // synced to rd_clk domain
  private rd_gray_sync1: Logic<5> = 0;
  private rd_gray_sync2: Logic<5> = 0; // synced to wr_clk domain

  // Write domain logic: advance write pointer and sync read pointer.
  @Sequential('wr_clk')
  wrDomain(): void {
    if (this.wr_en === 1) {
      this.wr_ptr = this.wr_ptr + 1;
      this.wr_gray = (this.wr_ptr + 1) ^ ((this.wr_ptr + 1) >> 1);
    }
    this.rd_gray_sync1 = this.rd_gray;
    this.rd_gray_sync2 = this.rd_gray_sync1;
    // full: write gray would equal inverted MSBs of synced read gray
    this.full = this.wr_gray === this.rd_gray_sync2 ? 1 : 0;
  }

  // Read domain logic: advance read pointer and sync write pointer.
  @Sequential('rd_clk')
  rdDomain(): void {
    if (this.rd_en === 1) {
      this.rd_ptr = this.rd_ptr + 1;
      this.rd_gray = (this.rd_ptr + 1) ^ ((this.rd_ptr + 1) >> 1);
    }
    this.wr_gray_sync1 = this.wr_gray;
    this.wr_gray_sync2 = this.wr_gray_sync1;
    // empty: read gray equals synced write gray
    this.empty = this.rd_gray === this.wr_gray_sync2 ? 1 : 0;
  }
}

export { AsyncFifo };
