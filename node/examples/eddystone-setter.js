  /*jslint node: true */
'use strict';

var program = require('commander');
var async = require('async');


/**
 * Example script for setting an Eddystone-URL value into the beacon
 */

var UBeaconUARTController = require('../uBeaconUARTController').UBeaconUARTController;
var UBeaconAdvertisingSettingsRegister = require('../uBeaconUARTController.js').UBeaconAdvertisingSettingsRegister;

program
  .version('0.0.1')
  .option('-s, --serial-port [port]', 'Serial port to use (eg. "COM10" od "/dev/tty.usbmodem1"' ,'/dev/tty.usbserial-A5026UEU')
  .option('-u, --url [url]', 'URL to be advertised', 'http://ubudu.com')
  .parse(process.argv);

var ubeacon = new UBeaconUARTController(program.serialPort, 115200);
// ubeacon.setUARTRawInputLoggingEnabled(true);
// ubeacon.setUARTLoggingEnabled(true);
var ledOn = true;

ubeacon.on(ubeacon.EVENTS.UART_READY, function(){
  console.log('ubeacon UART ready');

  async.waterfall([
  	//Set new url 
  	function(callback){
  		ubeacon.setEddystoneURL( program.url , function(data, error){
  			console.log('Set URL to', data );
  			callback(error);
  		});
  	},
  	//
  	function(callback){
  		var reg = new UBeaconAdvertisingSettingsRegister();
  		reg.setEddystoneEnabled(true);
  		ubeacon.setAdvertisingSettings( reg, function(regData, error){
  			console.log( 'Enabled Eddystone-URL advertisements: ' , regData.isEddystoneEnabled() );
  			callback(error);
  		});
  	}
	], function(error, response){
    if( error != null ){
      console.log( error );
    }
    process.exit(1);
  });
});

ubeacon.on(ubeacon.EVENTS.ERROR, function(error){
	console.log('Error: ', error);
});