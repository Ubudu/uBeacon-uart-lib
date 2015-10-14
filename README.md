# uBeacon-uart-lib

This repository contains libraries which can be used to communicate with uBeacon devices using USB-UART cable which is shipped along [uBeacon devices](http://ubudu.com/).

## Supported platforms

All platforms and devices which support USB host functionality and have FTDI drivers support can be used. This includes Linux, OSX, Windows platforms running on classical PC hardware or some more raw devices like Raspberry Pi, BeagleBone.

For convienience and reference node.js libraries with examples have been provided in [node folder](https://github.com/Ubudu/uBeacon-uart-lib/tree/master/node).

## How it works

To start using the code examples provided in this repository you will need to connect the host side (eg. PC) with a uBeacon device using the USB-UART cable. 

If the OS you're using doesn't have FTDI drivers pre-installed go to [FTDI website](http://www.ftdichip.com/Drivers/VCP.htm) and install drivers for the platform you want to work on.

If the driver has been installed successfuly you will notice a new "USB Serial Port" in your system (eg. "*COM1*" on Windows, "*/dev//dev/tty.usbserial-A703JWRZ*"). This is the one which should be used to run examples contained in this repository.

## Extending beyond USB-UART cable

If you are comfortable with hardware you can interface the uBeacon device with your own equippment by connecting the USB lines directly to your hardware if it supports UART communication (eg. Arduino). The pinout for USB connector on uBeacon is:

| USB pin | uBeacon USB pin | Host GPIO | 
| --- | --- | --- | 
| VCC | VCC + charge | VCC (3V3-5V) | 
| D-  | TX  | RX |
| D+  | RX  | TX |
| GND | GND | GND |

For UART communication only GND, RX, TX pins need to be connected. The VCC pin is used only for charging and power supply.

Communication baud rate is 115200.
