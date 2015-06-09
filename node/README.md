# node-uBeacon-uart-lib

## Introduction

The following files provide a node.js library, allowing to communicate with [uBeacon v2.0](http://ubudu.com/) devices over USB-UART cable, provided with the devices. 

The communication allows to adjust various settings of the device, as well as sending and receiving messages, over mesh supported from the 2.0 version.

## Installation

```
npm install node-ubeacon-uart-lib
```

## Usage

Refer to scripts in examples folder for demonstration of using the library.

To launch the scripts you will need to specify identifier of the serial port to use. Depending on your specific configuration and platform it will be something similar to the following:

**OSX/Linux:**

```
node basic-reader.js --serial-port=/dev/tty.usbserial-A703JWRZ
```

**Windows:**

```
node basic-reader.js --serial-port=COM1
```

To determine the identifier of your serial port for OSX open terminal and type:

```
ls /dev/tty.*
```

It will result in a list similar to the following:

```
$ ls /dev/tty.*
/dev/tty.Bluetooth-Incoming-Port	/dev/tty.usbserial-A703JWRZ
/dev/tty.Bluetooth-Modem		
```

To determine the identifier for Windows you will need to go into device manager and look an entry named "*USB Serial Port (COMX)*" under "*Ports (COM and LPT)*" section.