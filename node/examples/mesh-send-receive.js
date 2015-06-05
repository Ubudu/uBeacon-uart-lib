  /*jslint node: true */
'use strict';

var UBeaconUARTController = require('../uBeaconUARTController').UBeaconUARTController;
var program = require('commander');
var async = require('async');


program
  .version('0.0.1')
  .option('-s, --serial-port [port]', 'Serial port to use (eg. "COM10" od "/dev/tty.usbmodem1"' ,'/dev/tty.usbserial-A5026UEU')
  .option('-a, --destination-address [address]', 'Destination address of the device', 12337)
  .option('-b, --baud-rate [baud]', 'Baud rate', parseInt, 115200)
  .parse(process.argv);

var ubeacon = new UBeaconUARTController(program.serialPort, program.baudRate);
// ubeacon.setUARTRawInputLoggingEnabled(true);
// ubeacon.setUARTLoggingEnabled(true);


ubeacon.on(ubeacon.EVENTS.UART_READY, function(){

  async.series([
    //Enable mesh
    function(callback){
      ubeacon.setMeshSettingsRegister( 0x01, 0x00, function(data){
        callback();
      });
    },
    //Send message
    function(callback){
      ubeacon.sendMeshGenericMessage( program.destinationAddress, "Hello from node.js", function( response ){
        console.log( '[ubeacon] Mesh message sent' );
        callback();
      });
    },
    //Disable mesh
    function(callback){
      ubeacon.setMeshSettingsRegister( 0x00, 0x00, function(data){
        callback();
      });
    },
  ]);

});


/*
 * Log an ACK message
 */
ubeacon.on(ubeacon.EVENTS.MESH_MSG__ACK, function(dstAddr, msgType, status, checksum){
  console.log('[mesh] Received ACK from device=' + dstAddr + ', status=' + status);
});

/*
 * Log message received via the node connected through UART cable
 */
ubeacon.on(ubeacon.EVENTS.MESH_MSG__USER, function(dstAddr, msgType, msg){
  console.log('[mesh] Received message from device=' + dstAddr + ', data=' + msg);
});

/*
 * Log a BLE connection event (connect/disconnect)
 */
ubeacon.on(ubeacon.EVENTS.CONNECTED, function(connected, connectionInfo){
  console.log( 'Connected: ', connected );
  console.log( 'connectionInfo: ', connectionInfo );
});

