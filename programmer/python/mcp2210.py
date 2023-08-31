#########################################################################################
#                                                                                       #
# ©2015 Microchip Technology Inc.and its subsidiaries.You may use this software and any #
# derivatives exclusively with Microchip products.                                      #
#                                                                                       #
# THIS SOFTWARE IS SUPPLIED BY MICROCHIP "AS IS".NO WARRANTIES, WHETHER EXPRESS,        #
# IMPLIED OR STATUTORY, APPLY TO THIS SOFTWARE, INCLUDING ANY IMPLIED WARRANTIES OF     #
# NON - INFRINGEMENT, MERCHANTABILITY, AND FITNESS FOR A PARTICULAR PURPOSE, OR ITS     #
# INTERACTION WITH MICROCHIP PRODUCTS, COMBINATION WITH ANY OTHER PRODUCTS, OR          #
# USE IN ANY APPLICATION.                                                               #
#                                                                                       #
# IN NO EVENT WILL MICROCHIP BE LIABLE FOR ANY INDIRECT, SPECIAL, PUNITIVE, INCIDENTAL  #
# OR CONSEQUENTIAL LOSS, DAMAGE, COST OR EXPENSE OF ANY KIND WHATSOEVER RELATED         #
# TO THE SOFTWARE, HOWEVER CAUSED, EVEN IF MICROCHIP HAS BEEN ADVISED OF THE            #
# POSSIBILITY OR THE DAMAGES ARE FORESEEABLE.TO THE FULLEST EXTENT ALLOWED BY           #
# LAW, MICROCHIP'S TOTAL LIABILITY ON ALL CLAIMS IN ANY WAY RELATED TO THIS SOFTWARE    #
# WILL NOT EXCEED THE AMOUNT OF FEES, IF ANY, THAT YOU HAVE PAID DIRECTLY TO            #
# MICROCHIP FOR THIS SOFTWARE.                                                          #
#                                                                                       #
# MICROCHIP PROVIDES THIS SOFTWARE CONDITIONALLY UPON YOUR ACCEPTANCE OF THESE          #
# TERMS.                                                                                #
#                                                                                       #
#########################################################################################

print ("MCP2210 demo using unmanaged DLL from python.")
print ("Please connect one MCP2210 evaluation kit (ADM00420) and make sure that LED jumpers are conncted")

# import the mcp2210 unmanaged DLL
from ctypes import *
import os
import sys

dirname = os.path.dirname(sys.argv[0])
mcp2210 = windll.LoadLibrary(dirname + "\\mcp2210_dll_um_x64.dll")
#mcp2210 = windll.LoadLibrary("mcp2210_dll_um_x86.dll")

Mcp2210_GetLastError            = mcp2210.Mcp2210_GetLastError
Mcp2210_GetConnectedDevCount    = mcp2210.Mcp2210_GetConnectedDevCount
Mcp2210_OpenBySN                = mcp2210.Mcp2210_OpenBySN
Mcp2210_Close                   = mcp2210.Mcp2210_Close

Mcp2210_GetManufacturerString   = mcp2210.Mcp2210_GetManufacturerString
Mcp2210_GetSpiConfig            = mcp2210.Mcp2210_GetSpiConfig
Mcp2210_SetSpiConfig            = mcp2210.Mcp2210_SetSpiConfig
Mcp2210_GetGpioConfig           = mcp2210.Mcp2210_GetGpioConfig
Mcp2210_SetGpioConfig           = mcp2210.Mcp2210_SetGpioConfig
Mcp2210_xferSpiData             = mcp2210.Mcp2210_xferSpiData
Mcp2210_xferSpiDataEx           = mcp2210.Mcp2210_xferSpiDataEx

Mcp2210_OpenBySN.restype    = c_void_p

#VID and PID of the MCP2210 devices
vid = c_ushort(0x4d8)
pid = c_ushort(0xde)

#error codes dictionary
errors_dict = {    0:'E_SUCCESS',                             -1:'E_ERR_UNKOWN_ERROR',            -2:'E_ERR_INVALID_PARAMETER',\
                 -10:'E_ERR_NULL',                           -20:'E_ERR_MALLOC',                 -30:'E_ERR_INVALID_HANDLE_VALUE',\
                -100:'E_ERR_FIND_DEV',                      -101:'E_ERR_NO_SUCH_INDEX',         -103:'E_ERR_DEVICE_NOT_FOUND',\
                -104:'E_ERR_INTERNAL_BUFFER_TOO_SMALL',     -105:'E_ERR_OPEN_DEVICE_ERROR',     -106:'E_ERR_CONNECTION_ALREADY_OPENED',\
                -107:'E_ERR_CLOSE_FAILED',                  -108:'E_ERR_NO_SUCH_SERIALNR',      -110:'E_ERR_HID_RW_TIMEOUT',\
                -111:'E_ERR_HID_RW_FILEIO',                 -200:'E_ERR_CMD_FAILED',            -201:'E_ERR_CMD_ECHO',\
                -202:'E_ERR_SUBCMD_ECHO',                   -203:'E_ERR_SPI_CFG_ABORT',         -204:'E_ERR_SPI_EXTERN_MASTER',\
                -205:'E_ERR_SPI_TIMEOUT',                   -206:'E_ERR_SPI_RX_INCOMPLETE',     -207:'E_ERR_SPI_XFER_ONGOING',\
                -300:'E_ERR_BLOCKED_ACCESS',                -301:'E_ERR_EEPROM_WRITE_FAIL',     -350:'E_ERR_NVRAM_LOCKED',\
                -351:'E_ERR_WRONG_PASSWD',                  -352:'E_ERR_ACCESS_DENIED',         -353:'E_ERR_NVRAM_PROTECTED',\
                -354:'E_ERR_PASSWD_CHANGE',                 -400:'E_ERR_STRING_DESCRIPTOR',     -401:'E_ERR_STRING_TOO_LARGE'    }

#######################################################################################
# SPI transfer function definition
#######################################################################################
def spi_xfer_ex_data(dev_handle):
    "this function performs SPI traffic: blink the LEDs and read/write the EEPROM"
    err_code = 0                # return error code
    cfgsel = c_ubyte(0)         # config selector - 0=VM, 1=NVRAM
    nrpages = 8                 # EEPROM pages to access
    pagesize = 16               # EEPROM page size
    # the size of the following buffers should be at least nrpages*pagesize + 2
    bufsz = nrpages*pagesize + 2
    pdataTx1 = (c_ubyte*bufsz)()  # SPI Tx data buffer
    pdataRx1 = (c_ubyte*bufsz)()  # SPI Rx data buffer
    pdataRx2 = (c_ubyte*bufsz)()  # SPI Rx data buffer
    pdataRx3 = create_string_buffer(bufsz)

    #save the device SPI config    
    pbaudRate1      = c_uint(0)
    pidleCsVal1     = c_uint(0)
    pactiveCsVal1   = c_uint(0)
    pcsToDataDly1   = c_uint(0)
    pdataToDataDly1 = c_uint(0)
    pdataToCsDly1   = c_uint(0)
    ptxferSize1     = c_uint(0)
    pspiMd1         = c_ubyte(0)
    
    err_code = Mcp2210_GetSpiConfig(dev_handle, cfgsel, byref(pbaudRate1), byref(pidleCsVal1), \
                                    byref(pactiveCsVal1), byref(pcsToDataDly1), byref(pdataToCsDly1), byref(pdataToDataDly1), \
                                    byref(ptxferSize1), byref(pspiMd1))
    if err_code != 0: return err_code
    print ("\nSPI values:")
    print ("pbaudRate1: %d" % pbaudRate1.value)
    print ("pidleCsVal1: 0x%8.8X" % pidleCsVal1.value)
    print ("pactiveCsVal1: 0x%8.8X" % pactiveCsVal1.value)
    print ("pcsToDataDly1: %d" % pcsToDataDly1.value)
    print ("pdataToCsDly1: %d" % pdataToCsDly1.value)
    print ("pdataToDataDly1: %d" % pdataToDataDly1.value)
    print ("ptxferSize1: %d" % ptxferSize1.value)
    print ("pspiMd1: 0x%2.2X" % pspiMd1.value)

    #save the device GPIO config
    gpio_des1   = (c_ubyte*9)(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff)
    gpio_out1   = c_uint(0)
    gpio_dir1   = c_uint(0)
    wkup1       = c_ubyte(0)
    intmdcnt1   = c_ubyte(0)
    spibusen1   = c_ubyte(0)
    
    err_code = Mcp2210_GetGpioConfig(dev_handle, cfgsel, gpio_des1, byref(gpio_out1), \
                                     byref(gpio_dir1), byref(wkup1), byref(intmdcnt1), byref(spibusen1))
    if err_code != 0: return err_code
    print ("\nGPIO values:")
    print ("gpio_des1:", gpio_des1[:])
    print ("gpio_out1: 0x%8.8X" % gpio_out1.value)
    print ("gpio_dir1: 0x%8.8X" % gpio_dir1.value)
    print ("wkup1: 0x%2.2X" % wkup1.value)
    print ("intmdcnt1: 0x%2.2X" % intmdcnt1.value)
    print ("spibusen1: 0x%2.2X" % spibusen1.value)

# use the I/O expander (mcp23s08) to blink the LEDs
    print("\nWatch now the blinking LEDs...:")
    # set the SPI xfer params for I/O expander
    pbaudRate2      = c_uint(1000000)
    pidleCsVal2     = c_uint(0x1ff)
    pactiveCsVal2   = c_uint(0x1ee) # GP4 and GP0 set as active low CS
    pcsToDataDly2   = c_uint(0)
    pdataToDataDly2 = c_uint(0)
    pdataToCsDly2   = c_uint(0)
    ptxferSize2     = c_uint(4)     # I/O expander xfer size set to 4
    pspiMd2         = c_ubyte(0)
    csmask4         = c_uint(0x10)  # set GP4 as CS
    # set the expander config params
    pdataTx1[0] = 0x40
    pdataTx1[1] = 0x0A
    pdataTx1[2] = 0xff
    pdataTx1[3] = 0x00
    # send the data
    # use the extended SPI xfer API first time in order to set all the parameters
    # the subsequent xfers with the same device may use the simple API in order to save CPU cycles
    ret_code = Mcp2210_xferSpiDataEx(dev_handle, pdataTx1, pdataRx1, \
                                            byref(pbaudRate2), byref(ptxferSize2), csmask4, \
                                            byref(pidleCsVal2), byref(pactiveCsVal2), byref(pcsToDataDly2), \
                                            byref(pdataToCsDly2), byref(pdataToDataDly2), byref(pspiMd2))
    if err_code != 0: return err_code

    ptxferSize2.value = 3           # set the txfer size to 3 -> don't write to mcp23s08 IODIR again
    csmask_nochange = c_uint(0x10000000)    # preserve the CS selection and skip the GP8CE fix -> data xfer optimization
    for i in range(0,256):
        pdataTx1[2] = i
        # we don't need to change all SPI params so we can start using the faster xfer API
        ret_code = Mcp2210_xferSpiData(dev_handle, pdataTx1, pdataRx1, \
                                            byref(pbaudRate2), byref(ptxferSize2), csmask_nochange)
        if err_code != 0: return err_code
    # turn off the leds -> set the mcp23s08 iodir to 0xFF;
    pdataTx1[0] = 0x40;
    pdataTx1[1] = 0x00;
    pdataTx1[2] = 0xFF;
    ret_code = Mcp2210_xferSpiData(dev_handle, pdataTx1, pdataRx1, \
                                        byref(pbaudRate2), byref(ptxferSize2), csmask_nochange)
    if err_code != 0: return err_code

    print ("\nSPI values after LED blink:")
    print ("pbaudRate2: %d" % pbaudRate2.value)
    print ("pidleCsVal2: 0x%8.8X" % pidleCsVal2.value)
    print ("pactiveCsVal2: 0x%8.8X" % pactiveCsVal2.value)
    print ("pcsToDataDly2: %d" % pcsToDataDly2.value)
    print ("pdataToCsDly2: %d" % pdataToCsDly2.value)
    print ("pdataToDataDly2: %d" % pdataToDataDly2.value)
    print ("ptxferSize2: %d" % ptxferSize2.value)
    print ("pspiMd2: 0x%2.2X" % pspiMd2.value)
    print ("csmask4: 0x%8.8X" % csmask4.value)

    #get the device GPIO config
    gpio_des3   = (c_ubyte*9)(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff)
    gpio_out3   = c_uint(0)
    gpio_dir3   = c_uint(0)
    wkup3       = c_ubyte(0)
    intmdcnt3   = c_ubyte(0)
    spibusen3   = c_ubyte(0)
    
    err_code = Mcp2210_GetGpioConfig(dev_handle, cfgsel, gpio_des3, byref(gpio_out3), \
                                     byref(gpio_dir3), byref(wkup3), byref(intmdcnt3), byref(spibusen3))
    if err_code != 0: return err_code
    print ("\nGPIO values after LED blink:")
    print ("gpio_des3:", gpio_des3[:])
    print ("gpio_out3: 0x%8.8X" % gpio_out3.value)
    print ("gpio_dir3: 0x%8.8X" % gpio_dir3.value)
    print ("wkup3: 0x%2.2X" % wkup3.value)
    print ("intmdcnt3: 0x%2.2X" % intmdcnt3.value)
    print ("spibusen3: 0x%2.2X" % spibusen3.value)    

# read/modify/write mcp25LC020 EEPROM and check the data
    # access nrpages*pagesize EEPROM
    # pdataRx2 is the data reference
    print("\nRead/modify/write the first %d pages of %d bytes from EEPROM:" % (nrpages, pagesize))

    #change the SPI xfer params for EEPROM access
    pbaudRate2.value = 3000000
    ptxferSize2.value = 2 + (nrpages * pagesize)    # write cmd, addr, return bytes
    csmask0 = c_uint(0x1)   # set GP0 as CS

    #read the EEPROM nrpages*pagesize -> pdataRx2 buffer
    for i in range(0, ptxferSize2.value): pdataTx1[i] = 0    #clear the tx buff
    pdataTx1[0] = 0x03;
    pdataTx1[1] = 0x00;
    # use the extended SPI xfer API first time in order to set all the parameters
    # the subsequent xfers with the same device may use the simple API in order to save CPU cycles
    ret_code = Mcp2210_xferSpiDataEx(dev_handle, byref(pdataTx1), byref(pdataRx2), \
                                            byref(pbaudRate2), byref(ptxferSize2), csmask0, \
                                            byref(pidleCsVal2), byref(pactiveCsVal2), byref(pcsToDataDly2), \
                                            byref(pdataToCsDly2), byref(pdataToDataDly2), byref(pspiMd2))
    if err_code != 0: return err_code
    print("EEPROM content:")
    for i in range(0, nrpages):
        for j in range(0, pagesize):
            print("\t0x%2.2X" % (pdataRx2[(i * pagesize) + j + 2]), end='')
        print()

    print ("\nSPI values after EEPROM read:")
    print ("pbaudRate2: %d" % pbaudRate2.value)
    print ("pidleCsVal2: 0x%8.8X" % pidleCsVal2.value)
    print ("pactiveCsVal2: 0x%8.8X" % pactiveCsVal2.value)
    print ("pcsToDataDly2: %d" % pcsToDataDly2.value)
    print ("pdataToCsDly2: %d" % pdataToCsDly2.value)
    print ("pdataToDataDly2: %d" % pdataToDataDly2.value)
    print ("ptxferSize2: %d" % ptxferSize2.value)
    print ("pspiMd2: 0x%2.2X" % pspiMd2.value)
    print ("csmask0: 0x%8.8X" % csmask0.value)

    #get the device GPIO config
    gpio_des2   = (c_ubyte*9)(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff)
    gpio_out2   = c_uint(0)
    gpio_dir2   = c_uint(0)
    wkup2       = c_ubyte(0)
    intmdcnt2   = c_ubyte(0)
    spibusen2   = c_ubyte(0)
    
    err_code = Mcp2210_GetGpioConfig(dev_handle, cfgsel, gpio_des2, byref(gpio_out2), \
                                     byref(gpio_dir2), byref(wkup2), byref(intmdcnt2), byref(spibusen2))
    if err_code != 0: return err_code
    print ("\nGPIO values after EEPROM read:")
    print ("gpio_des2:", gpio_des2[:])
    print ("gpio_out2: 0x%8.8X" % gpio_out2.value)
    print ("gpio_dir2: 0x%8.8X" % gpio_dir2.value)
    print ("wkup2: 0x%2.2X" % wkup2.value)
    print ("intmdcnt2: 0x%2.2X" % intmdcnt2.value)
    print ("spibusen2: 0x%2.2X" % spibusen2.value)
    
    #write data into EEPROM
    #read EEPROM status
    ptxferSize2.value = 2   # write cmd, return 1 byte
    csmask_nochange = c_uint(0x10000000)    # preserve the CS selection and skip the GP8CE fix -> data xfer optimization
    pdataTx1[0] = 5
    pdataTx1[1] = 0
    pdataRx1[0] = pdataRx1[1] = 0
    # we don't need to change all SPI params so we can start using the faster xfer API
    ret_code = Mcp2210_xferSpiData(dev_handle, pdataTx1, pdataRx1, \
                                            byref(pbaudRate2), byref(ptxferSize2), csmask_nochange)

    if err_code != 0: return err_code
    print("EEPROM status register:", pdataRx1[1])
    
    #disable EEPROM write protection
    #set the write enable latch 
    ptxferSize2.value = 1   # WREN cmd, only 1 byte
    pdataTx1[0] = 0x6
    pdataRx1[0] = 0
    ret_code = Mcp2210_xferSpiData(dev_handle, pdataTx1, pdataRx1, \
                                        byref(pbaudRate2), byref(ptxferSize2), csmask_nochange)        
    if err_code != 0: return err_code
    #disable the block protection
    ptxferSize2.value = 2   # write cmd, and 1 byte
    pdataTx1[0] = 1
    pdataTx1[1] = 0         # BP1 = BP0 = 0 - no write protection
    pdataRx1[0] = pdataRx1[1] = 0   
    ret_code = Mcp2210_xferSpiData(dev_handle, pdataTx1, pdataRx1, \
                                            byref(pbaudRate2), byref(ptxferSize2), csmask_nochange)    
    if err_code != 0: return err_code
    #read EEPROM status
    ptxferSize2.value = 2   # write cmd, return 1 byte
    pdataTx1[0] = 5
    pdataTx1[1] = 0
    pdataRx1[0] = pdataRx1[1] = 0
    ret_code = Mcp2210_xferSpiData(dev_handle, pdataTx1, pdataRx1, \
                                            byref(pbaudRate2), byref(ptxferSize2), csmask_nochange)    
    if err_code != 0: return err_code
    print("EEPROM status register after write protection disable:", pdataRx1[1])

    #write EEPROM
    for pcnt in range(0, nrpages):
        #set the write enable latch
        ptxferSize2.value = 1   # WREN cmd, only 1 byte
        pdataTx1[0] = 0x6
        pdataRx1[0] = 0
        ret_code = Mcp2210_xferSpiData(dev_handle, pdataTx1, pdataRx1, \
                                            byref(pbaudRate2), byref(ptxferSize2), csmask_nochange)        
        if err_code != 0: return err_code

        ptxferSize2.value = 2 + pagesize   # write cmd + addr + page size
        pdataTx1[0] = 0x2   #write cmd
        pdataTx1[1] = c_ubyte(pcnt * pagesize)    # address of page
        #just increment the initial data in memory
        for p in range(0, pagesize): pdataTx1[p + 2] = c_ubyte(pdataRx2[(pcnt * pagesize) + p + 2] + (pcnt + 1)) 
        ret_code = Mcp2210_xferSpiData(dev_handle, pdataTx1, pdataRx1, \
                                            byref(pbaudRate2), byref(ptxferSize2), csmask_nochange)
        if err_code != 0: return err_code

    #read again EEPROM and compare the data
    print("\nRead again the first %d pages of %d bytes from EEPROM:" % (nrpages, pagesize))
    ptxferSize2.value = 2 + (nrpages * pagesize)    # write cmd, addr, return bytes
    #read the EEPROM nrpages*pagesize -> pdataRx2 buffer
    for i in range(0, ptxferSize2.value): pdataTx1[i] = 0    #clear the tx buff -> not really required
    pdataTx1[0] = 0x03;
    pdataTx1[1] = 0x00;
    ret_code = Mcp2210_xferSpiData(dev_handle, pdataTx1, pdataRx1, \
                                            byref(pbaudRate2), byref(ptxferSize2), csmask_nochange)    
    if err_code != 0: return err_code
    print("EEPROM content:")
    rx1 = c_ubyte(0)
    rx2 = c_ubyte(0)
    cmp = 0;
    for i in range(0, nrpages):
        for j in range(0, pagesize):
            print("\t0x%2.2X" % (pdataRx1[(i * pagesize) + j + 2]), end='')
            rx1 = c_ubyte(pdataRx1[(i * pagesize) + j + 2])
            rx2 = c_ubyte(pdataRx2[(i * pagesize) + j + 2] + (i + 1))
            if rx1.value != rx2.value: cmp = 1
        print()
    if cmp == 1:
        print("EEPROM write FAILURE")
    else:
        print("EEPROM write OK")
    
    #restore the SPI config
    err_code = Mcp2210_SetSpiConfig(dev_handle, cfgsel, byref(pbaudRate1), byref(pidleCsVal1), \
                            byref(pactiveCsVal1), byref(pcsToDataDly1), byref(pdataToCsDly1), byref(pdataToDataDly1), \
                            byref(ptxferSize1), byref(pspiMd1))
    if err_code != 0: return err_code
    print ("\nSPI restored values:")
    print ("pbaudRate1: %d" % pbaudRate1.value)
    print ("pidleCsVal1: 0x%8.8X" % pidleCsVal1.value)
    print ("pactiveCsVal1: 0x%8.8X" % pactiveCsVal1.value)
    print ("pcsToDataDly1: %d" % pcsToDataDly1.value)
    print ("pdataToCsDly1: %d" % pdataToCsDly1.value)
    print ("pdataToDataDly1: %d" % pdataToDataDly1.value)
    print ("ptxferSize1: %d" % ptxferSize1.value)
    print ("pspiMd1: 0x%2.2X" % pspiMd1.value)

    #restore the GPIO config
    err_code = Mcp2210_SetGpioConfig(dev_handle, cfgsel, gpio_des1, gpio_out1, \
                                     gpio_dir1, wkup1, intmdcnt1, spibusen1)
    if err_code != 0: return err_code
    err_code = Mcp2210_GetGpioConfig(dev_handle, cfgsel, gpio_des1, byref(gpio_out1), \
                                     byref(gpio_dir1), byref(wkup1), byref(intmdcnt1), byref(spibusen1))
    if err_code != 0: return err_code
    print ("\nGPIO restored values:")
    print ("gpio_des1:", gpio_des1[:])
    print ("gpio_out1: 0x%8.8X" % gpio_out1.value)
    print ("gpio_dir1: 0x%8.8X" % gpio_dir1.value)
    print ("wkup1: 0x%2.2X" % wkup1.value)
    print ("intmdcnt1: 0x%2.2X" % intmdcnt1.value)
    print ("spibusen1: 0x%2.2X" % spibusen1.value)   
    
    return err_code

########################################################################################
# Application main sequence
########################################################################################
# check if there is any MCP2210 device connected
print ("looking for MCP2210 devices - VID:0x%4.4X, PID:0x%4.4X" % (vid.value, pid.value))
ret_code = Mcp2210_GetConnectedDevCount(vid, pid)
if ret_code < 0:
    print("Ooops...error code returned: ", errors_dict.get(ret_code, ret_code), ". Exiting...")
    exit()
elif ret_code == 0:
    print("No device was detected...please check the cables. Bye!")
    exit()
else:
    print("Number of MCP2210 devices detected: ", ret_code)

# input the SN of the device (e.g. "0000013866")
# deviceSN = "0000013866"
deviceSN = input("Enter the device SN (10 characters, no more, no less):")

# Open the device with supplied SN and print the windows path
print ("\nOpen the device and print the windows path: - use of Mcp2210_OpenByIndex()")
path0 = create_unicode_buffer(1)    #fake path0 buffer - first "open" call will return the needed size
pathsize0 = c_ulong(1)              #insufficient size provisioned in order to obtain the needed size

handle0 = c_void_p(Mcp2210_OpenBySN(vid, pid, deviceSN, path0, byref(pathsize0)));
ret_code = Mcp2210_GetLastError()
if ret_code != -3:  #E_ERR_BUFFER_TOO_SMALL
    print("Unexpected error code returned: ", errors_dict.get(ret_code, ret_code), ". Exiting...")
    exit()
else:
    print ("required pathsize: ", pathsize0.value)

del path0
path0 = create_unicode_buffer(int(pathsize0.value/sizeof(c_wchar)))
handle0 = c_void_p(Mcp2210_OpenBySN(vid, pid, deviceSN, path0, byref(pathsize0)));
ret_code = Mcp2210_GetLastError()
if ret_code != 0: #E_SUCCESS
    print("Unexpected error code returned: ", errors_dict.get(ret_code, ret_code), ". Exiting...")
    exit()
else:
    print ("Open success for MCP2210 device with SN: ", deviceSN)
    print ("device path is: ", path0.value)

# perform some SPI traffic (blink the LEDs and read/write the EEPROM on eval boad)
print("\nDo SPI traffic: blink the LEDs and read/write the EEPROM - use of Mcp2210_xferSpiDataEx()") 
ret_code = spi_xfer_ex_data(handle0)
if ret_code != 0: #E_SUCCESS
    print("Unexpected error code returned: ", errors_dict.get(ret_code, ret_code))
else:
    print ("SPI xfer completed.")

# close the MCP2210 device
print("\nClose the MCP2210 device - use of Mcp2210_Close():")
ret_code = Mcp2210_Close(handle0)
if ret_code != 0: #E_SUCCESS
    print("Unexpected error code returned: ", errors_dict.get(ret_code, ret_code))
else:
    print ("MCP2210 device close: ", errors_dict.get(ret_code, ret_code))

