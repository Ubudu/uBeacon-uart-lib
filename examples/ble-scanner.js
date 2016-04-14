  /*jslint node: true */
'use strict';

/**
 * Example script demonstrating BLE scanner capabilities of uBeacon FW 2.3.0+
 */

var UBeaconUARTController = require('../uBeaconUARTController').UBeaconUARTController;
var program = require('commander');
var async = require('async');

program
  .version('0.0.1')
  .option('-s, --serial-port [port]', 'Serial port to use (eg. "COM10" od "/dev/tty.usbmodem1"' ,'/dev/tty.usbserial-A5026UEU')
  .parse(process.argv);

var ubeacon = new UBeaconUARTController(program.serialPort, 115200);
ubeacon.setUARTRawInputLoggingEnabled(true);
ubeacon.setUARTLoggingEnabled(true);

ubeacon.on(ubeacon.EVENTS.UART_READY, function(){
  console.log('ubeacon UART ready');

  async.waterfall([
    function(done){
      console.log('Starting BLE scan');
      ubeacon.setBleScan( true , function(result, error){
        done(error);
      });
    },
    function(done){
      console.log('Waiting for scan data (make sure you have other beacons nearby');
      setTimeout(function(){
        done();
      }, 5000);
    },
    function(done){
      console.log('Stopping BLE scan');
      ubeacon.setBleScan( false , function(result, error){
        done(error);
      });
    },
  ], function(error, response){
    if( error ){
      console.log( error );
    }
    process.exit(1);
  });
  
});


ubeacon.on(ubeacon.EVENTS.UBEACON_READY, function(isReady){
  console.log('UBEACON_READY');
});


ubeacon.on(ubeacon.EVENTS.BLE_SCAN_REPORT, function(data){
  console.log('BLE_SCAN_REPORT', data);
});

