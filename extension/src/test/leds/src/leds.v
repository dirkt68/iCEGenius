//------------------------------------------------------------------
//-- Hello world example
//-- Turn on all the leds
//-- This example has been tested on the following boards:
//--   * Lattice icestick
//--   * Icezum alhambra (https://github.com/FPGAwars/icezum)
//------------------------------------------------------------------

`timescale 1ns/1ps

module leds(output LED0);
//             output wire LED0,
//             output wire LED1,
//             output wire LED2,
//             output wire LED3,
//             output wire LED4);

assign LED0 = 0;

// assign LED0 = 1;
// assign LED1 = 0;
// assign LED2 = 1;
// assign LED3 = 0;
// assign LED4 = 1;

endmodule
