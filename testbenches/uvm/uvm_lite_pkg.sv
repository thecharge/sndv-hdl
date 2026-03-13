`timescale 1ns / 1ps

package uvm_lite_pkg;
  typedef int unsigned uvm_verbosity_t;
  localparam uvm_verbosity_t UVM_NONE = 0;
  localparam uvm_verbosity_t UVM_LOW = 100;
  localparam uvm_verbosity_t UVM_MEDIUM = 200;
  localparam uvm_verbosity_t UVM_HIGH = 300;

  class uvm_object;
    string name;

    function new(string name = "uvm_object");
      this.name = name;
    endfunction
  endclass

  class uvm_sequence_item extends uvm_object;
    function new(string name = "uvm_sequence_item");
      super.new(name);
    endfunction
  endclass

  class uvm_component extends uvm_object;
    uvm_component parent;

    function new(string name = "uvm_component", uvm_component parent = null);
      super.new(name);
      this.parent = parent;
    endfunction
  endclass

  class uvm_test extends uvm_component;
    function new(string name = "uvm_test", uvm_component parent = null);
      super.new(name, parent);
    endfunction

    virtual task run_phase();
    endtask
  endclass
endpackage
