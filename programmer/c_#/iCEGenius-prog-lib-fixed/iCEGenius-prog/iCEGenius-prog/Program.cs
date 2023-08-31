using MCP2210;

namespace iCEGenius_prog;

internal sealed class Program
{
    private const bool DEBUG = true;

    private static void Main(string[] args)
    {
        // make sure bitstream exists
        if (args.Length != 1)
        {
            Console.WriteLine("Usage: iCEGenius-prog /path/to/.bin");
            return;
        }

        // try and open the bitstream binary file
        var bitstream = Array.Empty<byte>();
        try
        {
            var bitstreamRead = File.ReadAllBytes(args[0]); // read file
            var remainder = bitstreamRead.Length % 256; // see how far away it is from being the right length
            var padding = remainder == 0 ? 0 : 256 - remainder; // calculate how much needs to be added
            Array.Resize(ref bitstream, bitstreamRead.Length + padding); // resize the array to new length
            Array.Copy(bitstreamRead, bitstream, bitstreamRead.Length); // copy the values
        }
        catch (Exception e)
        {
            Console.WriteLine("Could not open .bin file!");
            Console.WriteLine(e);
            return;
        }

        // create device
        var device = new UsbToSpiDevice();

        // try to connect to device
        try
        {
            device.Connect();
        }
        catch (Exception e)
        {
            Console.WriteLine("Could not connect to iCEGenius");
            Console.WriteLine(e);
            return;
        }

        // check if device has been setup before
        if (device.NonVolatileRam.ProductName != "iCEGenius" || DEBUG) ConfigureFirstTime(device);

        // set pin 1 high
        var currChip = device.VolatileRam.ReadChipConfiguration();
        currChip.PinDirections = new[]
        {
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output
        };
        currChip.DefaultOutput = new[]
        {
            false,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            false
        };

        device.VolatileRam.ConfigureChip(currChip);

        // send write enable then erase command
        // write enable
        byte[] writeEnableCmd = { 0x06 };
        device.SpiDataTransfer.TransferAndRead(writeEnableCmd, 1000);

        // WaitForStatusChange(device.SpiDataTransfer);

        // send erase
        byte[] eraseCmd = { 0xC7 };
        device.SpiDataTransfer.TransferAndRead(eraseCmd, 1000);

        // WaitForStatusChange(device.SpiDataTransfer);

        // do it again
        device.SpiDataTransfer.TransferAndRead(writeEnableCmd, 1000);

        // WaitForStatusChange(device.SpiDataTransfer);

        // flash device
        var idx = 54;
        while (true)
        {
            var chunk = bitstream[(idx - 54)..idx];

            var writeCmd = new byte[60];
            writeCmd[0] = 0x02; // write command
            writeCmd[1] = (byte)((idx >> 16) & 0xFF); // msb of addr
            writeCmd[2] = (byte)((idx >> 8) & 0xFF); // addr
            writeCmd[3] = (byte)(idx & 0xFF); // addr

            for (var i = 0; i < 54; i++) writeCmd[i + 4] = chunk[i];

            device.SpiDataTransfer.TransferAndRead(writeEnableCmd, 1000);
            device.SpiDataTransfer.Transfer(writeCmd);
            
            idx += 54;
            if (idx > bitstream.Length) break;
        }
        
        // turn off pin 1
        currChip = device.VolatileRam.ReadChipConfiguration();
        currChip.PinDirections = new[]
        {
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output,
            PinDirection.Output
        };
        currChip.DefaultOutput = new[]
        {
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        };

        device.VolatileRam.ConfigureChip(currChip);


        // device.SpiDataTransfer.RequestSpiBusRelease();

        // disconnect the device
        device.Disconnect();
    }

    private static void ConfigureFirstTime(IUsbToSpiDevice device)
    {
        // set product and manufacturer name
        device.NonVolatileRam.ProductName = "iCEGenius";
        device.NonVolatileRam.ManufacterName = "TTU";

        // modify chip settings 
        var chipSettings = new ChipSettings
        {
            InterruptBitMode = DedicatedFunction.NoInterruptCounting,
            RemoteWakeUpEnabled = false,
            SpiBusReleaseEnable = true,
            // AccessControl = NramChipAccessControl.NotProtected,
            PinModes = new[]
            {
                PinMode.ChipSelects,
                PinMode.GPIO,
                PinMode.GPIO,
                PinMode.GPIO,
                PinMode.GPIO,
                PinMode.GPIO,
                PinMode.GPIO,
                PinMode.GPIO,
                PinMode.GPIO
            },
            PinDirections = new[]
            {
                PinDirection.Output,
                PinDirection.Output,
                PinDirection.Output,
                PinDirection.Output,
                PinDirection.Output,
                PinDirection.Output,
                PinDirection.Output,
                PinDirection.Output,
                PinDirection.Output
            },
            DefaultOutput = new[]
            {
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            }
        };

        // actually configure chip
        device.NonVolatileRam.ConfigureChip(chipSettings);
        device.VolatileRam.ConfigureChip(chipSettings);

        // setup spi settings
        var spiSettings = new SpiSetup
        {
            BitRate = 1_000_000,
            BytesToTransfer = 260,
            ChipSelectToDataDelay = 0,
            DataToChipSelectDelay = 0,
            BetweenDataDelay = 0,
            ActiveChipSelectValues = new[]
            {
                false,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true
            },
            IdleChipSelectValues = new[]
            {
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true
            }
        };

        // configure chip
        device.NonVolatileRam.ConfigureSpi(spiSettings);
        device.VolatileRam.ConfigureSpi(spiSettings);
    }

    // private static void WaitForStatusChange(ISpiDataTransfer bus)
    // {
    //     while (true) // stay in the loop until BUSY bit is 0
    //     {
    //         byte[] readStatusRegCmd = { 0x05, 0x00 };
    //         var
    //             statusRegOut = bus.TransferAndRead(readStatusRegCmd, 100); // byte 0 is garbage, byte 1 is status
    //         if ((statusRegOut.Data[1] & 0x01) == 0) // busy bit == 1 when performing write or erases
    //             break;
    //     }
    // }
}