# Vivado non-project mode synthesis for ts2v output.
# Usage: vivado -mode batch -source scripts/vivado_synth.tcl -tclargs <top_module> <build_dir>

set top_module [lindex $argv 0]
set build_dir  [lindex $argv 1]

# Read all generated Verilog
foreach f [glob ${build_dir}/*.v] {
    read_verilog $f
}

# Synthesize
synth_design -top $top_module -part xc7a35tcpg236-1

# Reports
report_utilization -file ${build_dir}/${top_module}_utilization.rpt
report_timing_summary -file ${build_dir}/${top_module}_timing.rpt

# Write checkpoint
write_checkpoint -force ${build_dir}/${top_module}_synth.dcp

puts "Synthesis complete: ${top_module}"
puts "Utilization: ${build_dir}/${top_module}_utilization.rpt"
puts "Timing:      ${build_dir}/${top_module}_timing.rpt"
