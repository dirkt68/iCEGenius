using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Reflection.Metadata.Ecma335;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;
using mcp2210_dll_m;
// using MCP2210;

public sealed class Program
{
    // default PID and UID
    public const ushort DEFAULT_VID = 0x4D8;
    public const ushort DEFAULT_PID = 0xDE;

    public static void Main(string[] args)
    {
        IUsbToSpiDevice device = new UsbToSpiDevice();
        device.Connect();

        string output = device.NonVolatileRam.ProductName;

        device.Disconnect();
        //// make sure bitstream exists
        //if (args.Length != 1)
        //{
        //    Console.WriteLine("Usage: iCEGenius-prog /path/to/.bin");
        //    return;
        //}
    
        //// try and open the bitstream binary file
        //byte[] bitstream;
        //try
        //{
        //    bitstream = File.ReadAllBytes(args[0]);
        //}
        //catch (Exception e)
        //{
        //    Console.WriteLine("Could not open .bin file!");
        //    Console.WriteLine("Exception: " + e);
        //    return;
        //}
    
        //// check to see if any mcp2210s are connected
        //int devCount = MCP2210.M_Mcp2210_GetConnectedDevCount(DEFAULT_VID, DEFAULT_PID);
        //if (devCount == 0)
        //{
        //    Console.WriteLine("No iCEGenius connected...");
        //    return;
        //}
        //else if (devCount > 1) // only allow one device to be connected
        //{
        //    Console.WriteLine("Multiple devices connected, remove all except one iCEGenius and rerun...");
        //    return;
        //}
    
        //// if so, try to connect to the first one
        //IntPtr devHandle = MCP2210.M_Mcp2210_OpenByIndex(DEFAULT_VID, DEFAULT_PID, 0, null);
        //if (devHandle == MCP2210.M_E_ERR_INVALID_HANDLE_VALUE)
        //{
        //    Console.WriteLine("Could not open iCEGenius!");
        //    Console.WriteLine("Error Code: " + MCP2210.M_Mcp2210_GetLastError());
        //}
    
        //// check if device has been previously configured
        //StringBuilder productString = new();
        //int result_code = MCP2210.M_Mcp2210_GetProductString(devHandle, productString);
        //if (productString.ToString() != "iCEGenius")
        //{
        //    ConfigureFirstTime(devHandle);
        //}
    
        //// set gpio1 to high
        //uint retPinVal = 0;
        //result_code = MCP2210.M_Mcp2210_SetGpioPinVal(devHandle, 0x02, ref retPinVal);
        //if (result_code != MCP2210.M_E_SUCCESS)
        //{
        //    Console.WriteLine("Error Code: " + result_code);
        //    return;
        //}
    
        //// send erase command to flash
    
    
    
    
        //result_code = MCP2210.M_Mcp2210_SetGpioPinVal(devHandle, 0x00, ref retPinVal);
        
        //// wait until chip is done
        //// send write enable
        //// loop through bitstream in sizes of 256 
        ////  addr starts at 0 increments by 256 as well
        ////  send write command, 3 addr bytes, then 256 data bytes
        //// release spi bus
        //// set gpio 1 to low
    
    }
    
    //public static void ConfigureFirstTime(IntPtr devHandle)
    //{
    //    // set up cs and gpio pins: pin 0 = cs, pin 1 - 8 = gpio, output, zero
    //    // set product name to iCEGenius and manufacturer name to TTU
    //    Console.WriteLine("Configuring device for first time use!");
    
    //    int result_code = 0;
    
    //    // set names 
    //    result_code = MCP2210.M_Mcp2210_SetProductString(devHandle, "iCEGenius");
    //    if (result_code != MCP2210.M_E_SUCCESS)
    //    {
    //        Console.WriteLine("Error Code: " + result_code);
    //        return;
    //    }
    //    result_code = MCP2210.M_Mcp2210_SetManufacturerString(devHandle, "TTU");
    //    if (result_code != MCP2210.M_E_SUCCESS)
    //    {
    //        Console.WriteLine("Error Code: " + result_code);
    //        return;
    //    }
    
    //    // set gpio pin designations
    //    // pin 0 = chip select
    //    // pin 1 - 8 = gpio
    //    byte[] gpioPinDes =
    //    {
    //        (byte)MCP2210.M_MCP2210_PIN_DES_CS,
    //        (byte)MCP2210.M_MCP2210_PIN_DES_GPIO,
    //        (byte)MCP2210.M_MCP2210_PIN_DES_GPIO,
    //        (byte)MCP2210.M_MCP2210_PIN_DES_GPIO,
    //        (byte)MCP2210.M_MCP2210_PIN_DES_GPIO,
    //        (byte)MCP2210.M_MCP2210_PIN_DES_GPIO,
    //        (byte)MCP2210.M_MCP2210_PIN_DES_GPIO,
    //        (byte)MCP2210.M_MCP2210_PIN_DES_GPIO,
    //        (byte)MCP2210.M_MCP2210_PIN_DES_GPIO
    //    };
    
    //    // set power up defaults 
    //    result_code = MCP2210.M_Mcp2210_SetGpioConfig(devHandle,
    //        (byte)MCP2210.M_MCP2210_NVRAM_CONFIG,
    //        gpioPinDes,
    //        0x00, // all gpios should be zero when idling
    //        0xFF, // all outputs
    //        (byte)MCP2210.M_MCP2210_REMOTE_WAKEUP_DISABLED,
    //        (byte)MCP2210.M_MCP2210_INT_MD_CNT_NONE,
    //        (byte)MCP2210.M_MCP2210_SPI_BUS_RELEASE_ENABLED
    //    );
    //    if (result_code != MCP2210.M_E_SUCCESS)
    //    {
    //        Console.WriteLine("Error Code: " + result_code);
    //        return;
    //    }
    
    //    // set current values
    //    result_code = MCP2210.M_Mcp2210_SetGpioConfig(devHandle,
    //        (byte)MCP2210.M_MCP2210_VM_CONFIG,
    //        gpioPinDes,
    //        0x00, // all gpios should be zero when idling
    //        0xFF, // all outputs
    //        (byte)MCP2210.M_MCP2210_REMOTE_WAKEUP_DISABLED,
    //        (byte)MCP2210.M_MCP2210_INT_MD_CNT_NONE,
    //        (byte)MCP2210.M_MCP2210_SPI_BUS_RELEASE_ENABLED
    //    );
    //    if (result_code != MCP2210.M_E_SUCCESS)
    //    {
    //        Console.WriteLine("Error Code: " + result_code);
    //        return;
    //    }
    
    //    // set spi values
    //    // first for power up
    //    uint pbaudRate = 1_000_000;
    //    uint pidleCsVal = 0xFFFFFFFF; // 32-bit idle cs values, set all high
    //    uint pactiveCsVal = 0xFFFFFFFE; // 32-bit active cs values, pin 0 is cs
    //    uint pCsToDataDly = 0; // delays are all 0
    //    uint pdataToCsDly = 0;
    //    uint pdataToDataDly = 0;
    //    uint ptxferSize = 0xFFFF; // max transfer size for right now
    //    byte pspiMd = (byte)MCP2210.M_MCP2210_SPI_MODE0;
        
    //    // assign spi to power on defaults
    //    result_code = MCP2210.M_Mcp2210_SetSpiConfig(devHandle,
    //        (byte)MCP2210.M_MCP2210_NVRAM_CONFIG,
    //        ref pbaudRate,
    //        ref pidleCsVal,
    //        ref pactiveCsVal,
    //        ref pCsToDataDly,
    //        ref pdataToCsDly,
    //        ref pdataToDataDly,
    //        ref ptxferSize,
    //        ref pspiMd
    //    );
    //    if (result_code != MCP2210.M_E_SUCCESS)
    //    {
    //        Console.WriteLine("Error Code: " + result_code);
    //        return;
    //    }
    
    //    // assign spi to current values
    //    result_code = MCP2210.M_Mcp2210_SetSpiConfig(devHandle,
    //        (byte)MCP2210.M_MCP2210_VM_CONFIG,
    //        ref pbaudRate,
    //        ref pidleCsVal,
    //        ref pactiveCsVal,
    //        ref pCsToDataDly,
    //        ref pdataToCsDly,
    //        ref pdataToDataDly,
    //        ref ptxferSize,
    //        ref pspiMd
    //    );
    //    if (result_code != MCP2210.M_E_SUCCESS)
    //    {
    //        Console.WriteLine("Error Code: " + result_code);
    //        return;
    //    }
    
    
    
    //}

}