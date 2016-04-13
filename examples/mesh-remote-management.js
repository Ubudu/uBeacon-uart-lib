  /*jslint node: true */
'use strict';

/**
 * Example script for sending mesh remote management messages
 */

var UBeaconUARTController = require('../uBeaconUARTController').UBeaconUARTController;
var program = require('commander');
var async = require('async');


program
  .version('0.0.1')
  .option('-s, --serial-port [port]', 'Serial port to use (eg. "COM10" od "/dev/tty.usbmodem1"' ,'/dev/tty.usbserial-A5026UEU')
  .option('-a, --destination-address [address]', 'Destination address of the device', 12337)
  .parse(process.argv);

var ubeacon = new UBeaconUARTController(program.serialPort, 115200);

ubeacon.on(ubeacon.EVENTS.UART_READY, function(){

  async.series([
    //Enable mesh
    function(callback){
      ubeacon.setMeshSettingsRegister( 0x01, 0x00, function(data){
        callback();
      });
    },
    //Build LED-on message and send it
    function(callback){
      var msg = ubeacon.getCommandString( false, ubeacon.uartCmd.led, new Buffer('03','hex') , false );
      ubeacon.sendMeshRemoteManagementMessage( program.destinationAddress, msg.toString(), null);
      setTimeout(callback, 2000);
    },
    //Build LED-off message and send it
    function(callback){
      var msg = ubeacon.getCommandString( false, ubeacon.uartCmd.led, new Buffer('00','hex') , false );
      ubeacon.sendMeshRemoteManagementMessage( program.destinationAddress, msg.toString(), null);
      setTimeout(callback, 2000);
    },
    //Disable mesh
    function(callback){
      ubeacon.setMeshSettingsRegister( 0x00, 0x00, function(data){
        callback();
      });
    },
    function(callback){
      console.log('Sending finished. Waiting for incoming messages.');
      callback();
    }
  ]);
});

/*
 * Log an ACK message
 */
ubeacon.on(ubeacon.EVENTS.MESH_MSG__ACK, function(dstAddr, msgType, status, checksum){
  console.log('[mesh] Received ACK from device=' + dstAddr + ', status=' + status);
});
