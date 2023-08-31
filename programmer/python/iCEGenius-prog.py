import time
import sys
from mcp2210 import MCP2210

def configure_first_time(device: MCP2210) -> None:
    # set iCEGenius name
    device.product_name = "iCEGenius"
    device.manufacturer_name = "Dirk Thieme"

    # configure default startup settings
    startup_chip_settings = device.boot_chip_settings
    startup_spi_settings = device.boot_transfer_settings

    # set gpio 0 to cs
    startup_chip_settings.pin_designations[0] = 0x01

    # set the rest to GPIOs
    for i in range(1, 10):
        startup_chip_settings.pin_designations[i] = 0x00

    # turn all GPIOs to outputs and off
    startup_chip_settings.gpio_directions = 0x00
    startup_chip_settings.gpio_outputs = 0x00
    
    # configure spi timing
    startup_spi_settings.bit_rate = 0x000F_4240 # 1MHz
    startup_spi_settings.idle_cs = 0x00
    startup_spi_settings.active_cs = 0x00
    
    # set defaults
    device.boot_chip_settings = startup_chip_settings
    device.boot_transfer_settings = startup_spi_settings

def main(bitstream):
    # default vendor and product IDs for mcp2210s
    DEFAULT_VID = 0x4D8
    DEFAULT_PID = 0xDE

    # try and open device
    try:
        device = MCP2210(DEFAULT_VID, DEFAULT_PID)
    except OSError as e:
        print("No iCEGenius found...")
        print(f"OSError: {e}")
        return

    # if device opened but unused, set defaults
    if device.product_name != "iCEGenius" and device.manufacturer_name != "Dirk Thieme":
        configure_first_time(device)

    # set pin 1 high to pull CRESET_B low
    curr_settings = device.chip_settings
    curr_settings.gpio_outputs = 0x02
    device.chip_settings = curr_settings
    
    # activate cs line
    curr_settings = device.transfer_settings
    curr_settings.active_cs = 0x01
    device.transfer_settings = curr_settings
    
    # transmit data
    device.transfer(bitstream)
    
    # deactivate cs line
    curr_settings = device.transfer_settings
    curr_settings.active_cs = 0x00
    device.transfer_settings = curr_settings

    time.sleep(1)

    # turn off pin 1
    curr_settings = device.chip_settings
    curr_settings.gpio_outputs = 0x00
    device.chip_settings = curr_settings


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: iCEGenius-prog /path/to/file.bin")
        exit(-1)

    with open(sys.argv[1], 'rb') as file:
        bitstream = file.read()
        
        if len(bitstream) > 0xFFFF:
            print("Bitstream too large to process! MCP2210 only supports a maximum transfer of 65,535 bytes!")
            exit(-1)
        elif len(bitstream) < 0xFFFF:
            bitstream += bytes(0x0) * (0xFFFF - len(bitstream))
        
        main(bitstream)
