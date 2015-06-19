  /*jslint node: true */
'use strict';

/**
 * Example script for sending and receiving mesh messages
 */

var UBeaconUARTController = require('../uBeaconUARTController').UBeaconUARTController;
var UBeaconMeshSettingsRegister = require('../uBeaconUARTController').UBeaconMeshSettingsRegister;
var program = require('commander');
var async = require('async');


program
  .version('0.0.1')
  .option('-s, --serial-port [port]', 'Serial port to use (eg. "COM10" od "/dev/tty.usbmodem1"' ,'/dev/tty.usbserial-A5026UEU')
  .option('-e, --enable-mesh', 'Tries to enable mesh if it is disabled on connected device')
  .option('-a, --destination-address [address]', 'Destination address of the device (as integer)', 12337)
  .parse(process.argv);

var ubeacon = new UBeaconUARTController(program.serialPort, 115200);
// ubeacon.setUARTRawInputLoggingEnabled(true);
// ubeacon.setUARTLoggingEnabled(true);

var msgCounter = 0;
var meshSettings = new UBeaconMeshSettingsRegister();

ubeacon.on(ubeacon.EVENTS.UART_READY, function(){

  async.waterfall([
    //Check if mesh is enabled
    function(callback){
      ubeacon.getMeshSettingsRegisterObject( function(data, error){

        if( error === null ){
          meshSettings.setFrom( data );
          console.log( 'meshSettings: ', meshSettings );
          if( meshSettings.enabled === false && program.enableMesh === false ){
            return callback(new Error('Mesh is disabled on device. Enable it before running.'))
          }
          return callback(null);
        }else{
          return callback(error);
        }
      });
    },

    //Try to enable mesh if launch parameter has been specified
    function(callback){
      if( meshSettings.enabled === false && program.enableMesh === true ){
        console.log( 'Mesh disabled on device. Enabling.' );
        meshSettings.enabled = true;
        ubeacon.setMeshSettingsRegisterObject( meshSettings, function(data, error){
          if( error === null ){
            meshSettings.setFrom( data );
          }
          callback(error);
        });
      }else{
        callback(null);
      }
    },

    //Get device address and print it
    function(callback){
      ubeacon.getMeshDeviceId( function( deviceAddress ){
        console.log( '[ubeacon] Device address is: ', parseInt(deviceAddress,16) + ' (0x' + deviceAddress + ')' );
        callback(null);
      });
    },

    //Send message - works until script is terminated
    function(callback){
      console.log( 'Start sending messages... ');
      setInterval(function(){
        msgCounter++;
        var msg = 'Hello #' + msgCounter + ' from node.js';
        console.log( '[ubeacon] Sending "' +msg+ '" to device: ' + program.destinationAddress );
        ubeacon.sendMeshGenericMessage( program.destinationAddress, msg, function( response ){
          console.log( '[ubeacon] Mesh message #' + msgCounter + ' sent. Response: ' + response );
        });
      }, 5000);
    },
  ], function(error, response){
    if( error != null ){
      console.log( error );
      process.exit(1);
    }
  });

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

