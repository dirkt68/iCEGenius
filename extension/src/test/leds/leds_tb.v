//-------------------------------------------------------------------
//-- leds_tb.v
//-- Testbench
//-------------------------------------------------------------------
//-- Juan Gonzalez (Obijuan)
//-- Jesus Arroyo Torrens
//-- GPL license
//-------------------------------------------------------------------
`timescale 1ns / 1ps

module leds_tb();

//-- Leds portD
wire l0, l1, l2, l3, l4;

//-- Instantiate the unit to test
leds UUT (
           .LED0(l0),
           .LED1(l1),
           .LED2(l2),
           .LED3(l3),
           .LED4(l4)
         );

initial begin
  $dumpfile("test.vcd");
  $dumpvars(0, leds_tb);
  #10000;

  $finish;
end

endmodule

