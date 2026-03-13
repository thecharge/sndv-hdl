`ifndef UVM_LITE_MACROS_SVH
`define UVM_LITE_MACROS_SVH

`define uvm_info(TAG, MSG, VERBOSITY) \
  $display("[UVM_INFO][%0s] %0s", TAG, MSG)

`define uvm_error(TAG, MSG) \
  $display("[UVM_ERROR][%0s] %0s", TAG, MSG)

`define uvm_fatal(TAG, MSG) begin \
  $display("[UVM_FATAL][%0s] %0s", TAG, MSG); \
  $finish(1); \
end

`endif
