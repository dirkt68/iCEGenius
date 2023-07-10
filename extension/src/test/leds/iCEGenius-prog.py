import usb
import time
import sys
from mcp2210 import Mcp2210, Mcp2210GpioDesignation, Mcp2210GpioDirection

def main(payload):
    # default vendor and product IDs for mcp2210s
    DEFAULT_VID = 0x4D8
    DEFAULT_PID = 0xDE
    
    # access raw info about any connected mcp2210s
    usb_raw_device = usb.core.find(idVendor=DEFAULT_VID, idProduct=DEFAULT_PID)
    
    # if nothing there, exit program
    if not usb_raw_device:
        print ("No MCP2210 device found")
        return
    
    # pull serial number to connect to
    serial_number = usb.util.get_string(usb_raw_device, usb_raw_device.iSerialNumber)
    
    # connect to device
    mcp = Mcp2210(serial_number=serial_number)
    
    # configure spi timing
    mcp.configure_spi_timing(0,0,0) # set all delays to minimum values
    mcp.set_spi_mode(0) # set spi mode to 0 for standard spi
    
    # configure useful pins
    mcp.set_gpio_designation(0, Mcp2210GpioDesignation.CHIP_SELECT)
    mcp.set_gpio_designation(1, Mcp2210GpioDesignation.GPIO)
    mcp.set_gpio_direction(1, Mcp2210GpioDirection.OUTPUT)
    
    # disable the rest of the pins to save power
    for pin in range(2, 9):
        mcp.set_gpio_designation(pin, Mcp2210GpioDesignation.GPIO)
        mcp.set_gpio_direction(pin, Mcp2210GpioDirection.OUTPUT)
        mcp.set_gpio_output_value(pin, False)
    
    # set pin 1 high to pull down creset_b line to disable ice40
    mcp.set_gpio_output_value(1, True)
    time.sleep(0.2) # sleep for a little to make sure its off
    
   # upload bitstream
    print("Uploading bitstream...")
    mcp.spi_exchange(payload, 0)

    print("Upload complete!")
    
    # allow ice40 to turn on again
    mcp.set_gpio_output_value(1, False)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: iCEGenius-prog /path/to/file.bin")
        # return

    with open(sys.argv[1], 'rb') as file:
        bitstream = file.read()
        
    main(bitstream)