  /*jslint node: true */
'use strict';

var UBeaconUARTController = require('../uBeaconUARTController').UBeaconUARTController;
var program = require('commander');
var async = require('async');

program
  .version('0.0.1')
  .option('-s, --serial-port [port]', 'Serial port to use (eg. "COM10" od "/dev/tty.usbmodem1"' ,'/dev/tty.usbserial-A5026UEU')
  .option('-b, --baud-rate [baud]', 'Baud rate', parseInt, 115200)
  .parse(process.argv);

var ubeacon = new UBeaconUARTController(program.serialPort, program.baudRate);
// ubeacon.setUARTRawInputLoggingEnabled(true);
// ubeacon.setUARTLoggingEnabled(true);
var ledOn = true;

ubeacon.on(ubeacon.EVENTS.UART_READY, function(){
  console.log('ubeacon UART ready');

  async.series([
    function(callback){
      console.log( 'Set led state to ' + ledOn);
      ubeacon.setLED( ledOn , function(ledState, error ){
        console.log( '[ubeacon] Received led state: ' + ledState );
        console.log( 'Waiting 2 seconds.');
        setTimeout(function(){
          callback();
        }, 2000);
      });
    },
    function(callback){
      ledOn = !ledOn;
      console.log( 'Set led state to ' , ledOn);
      ubeacon.setLED( ledOn , function(ledState, error ){
        console.log( '[ubeacon] Received led state: ' , ledState );
        callback();
      });
    },
    function(callback){
      ubeacon.getUARTProtocolVersion( function( version , error ){
        console.log( '[ubeacon] Received protocol version' , version );
        callback();
      });
    },
    function(callback){
      ubeacon.getFirmwareVersion( function( version, error ){
        console.log( '[ubeacon] Received firmware version' , version );
        callback();
      });
    },
    function(callback){
      ubeacon.getHardwareModel( function( model, error ){
        console.log( '[ubeacon] Received hardware model' , model );
        callback();
      });
    },
    function(callback){
      ubeacon.getHardwareVersion( function( version, error ){
        console.log( '[ubeacon] Received hardware version' , version );
        callback();
      });
    },
    function(callback){
      ubeacon.getMacAddress( function( address, error ){
        console.log( '[ubeacon] Received macAddress' , address );
        callback();
      });
    },
    function(callback){
      ubeacon.getTXPower( function( txPower, error ){
        console.log( '[ubeacon] Received txPower' , txPower );
        callback();
      });
    },
    function(callback){
      ubeacon.getSerialNumber( function( serialNumber, error ){
        console.log( '[ubeacon] Received serial number' , serialNumber );
        callback();
      });
    },
    function(callback){
      ubeacon.getBatteryLevel( function( batteryLevel, error ){
        console.log( '[ubeacon] Received battery level' , batteryLevel );
        callback();
      });
    },
    function(callback){
      ubeacon.getRTCTime( function( BCDDate, error ){
        console.log( '[ubeacon] Received RTC bcd' , BCDDate );
        callback();
      });
    },
    function(callback){
      ubeacon.getOpenDaySchedule( function( openDaySchedule, error ) {
        console.log( '[ubeacon] Received open day schedule', openDaySchedule );
        callback();
      });
    },
    function(callback){
      ubeacon.getAdvertisingState( function( advertisingState, error ){
        console.log( '[ubeacon] Received advertisingState' , advertisingState );
        callback();
      });
    },
    function(callback){
      ubeacon.getAdvertisingInterval( function( advertisingInterval, error ){
        console.log( '[ubeacon] Received advertisingInterval' , 
          advertisingInterval );
        callback();
      });
    },
    function(callback){
      ubeacon.getProximityUUID( function( proximityUUID, error ){
        console.log( '[ubeacon] Received proximityUUID' , proximityUUID );
        callback();
      });
    },
    function(callback){
      ubeacon.getMajor( function( major, error ){
        console.log( '[ubeacon] Received major' , major );
        callback();
      });
    },
    function(callback){
      ubeacon.getMinor( function( minor, error ){
        console.log( '[ubeacon] Received minor' , minor );
        callback();
      });
    },
    function(callback){
      ubeacon.getConnectionInfo( function( connectionInfo, error ){
        console.log('[ubeacon] Received connection info', connectionInfo );
        callback();
      });
    },
    function(callback){
      console.log('Done. Waiting for events (eg. button press)');
    }

  ]);
  
});


ubeacon.on(ubeacon.EVENTS.UBEACON_READY, function(isReady){
  console.log('UBEACON_READY');
});

ubeacon.on(ubeacon.EVENTS.CONNECTED, function(isConnected, macAddress){
  console.log('CONNECTED::', 'isConnected: ', isConnected, 'macAddress: ', macAddress);
});

ubeacon.on(ubeacon.EVENTS.BUTTON, function(isPressed, eventType){
  console.log('BUTTON::', 'Pressed: ', isPressed, 'eventType: ', eventType);
});

ubeacon.on(ubeacon.EVENTS.MESH_MSG__ACK, function(srcAddr,msgType,success, crc16){
  console.log('ubeacon.EVENTS.MESH_MSG__ACK', srcAddr, msgType, success, crc16);
});

ubeacon.on(ubeacon.EVENTS.MESH_MSG__USER, function(srcAddr,msgType,data,error){
  console.log('ubeacon.EVENTS.MESH_MSG__USER', srcAddr, msgType, data, error);
});

ubeacon.on(ubeacon.EVENTS.MESH_MSG__REMOTE_MANAGEMENT, function(srcAddr,msgType,data,error){
  console.log('ubeacon.EVENTS.MESH_MSG__REMOTE_MANAGEMENT', srcAddr, msgType, data, error);
});
