/*jslint node: true */
'use strict';

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var dataUtils = require('./dataUtils.js');

util.inherits(UBeaconUARTController, EventEmitter);


module.exports.UBeaconUARTController = UBeaconUARTController;


var uartLoggingEnabled = false;
var uartRawInputLoggingEnabled = false;
var uartMeshMessageType = {
  none: 0x00,
  ack: 0x01,
  userMessage: 0x02,
  remoteManagement: 0x03
};

//////////////////////////////////////////////////////////////////////////////
// Public functions
//////////////////////////////////////////////////////////////////////////////

/**
 *
 */
function UBeaconUARTController( serialPort , baudRate )
{
  var self = this;
  this.ready = false;
  this.devices = {};

  this._callbacks = [];
  this._timeoutMs = 5000;
  this.cmdGetPrefixByte =         0x67;
  this.cmdSetPrefixByte =         0x73;
  this.cmdResponsePrefixByte =    0x72; 
  this.delimiterByte =            0x3A;

  /**
   * Events emitted by this library
   */
  this.EVENTS = {
    UART_READY:                   'uart_ready',
    ERROR:                        'error',
    UBEACON_READY:                'board_ready',
    CONNECTED:                    'connected',
    ALARM:                        'alarm',
    BUTTON:                       'button',
    BATTERY_THRESHOLD:            'battery_threshold',
    MESH_MSG__ACK:                'mesh-ack',
    MESH_MSG__USER:               'mesh-user',
    MESH_MSG__REMOTE_MANAGEMENT:  'mesh-remote-management',
    MSG:                          'message',
  };


  //Available commands
  this.uartCmd = {

    none:                   0xFF,   //
    protocolVersion:        0x30,   //'0'
    firmwareVersion:        0x31,   //'1'
    hardwareModel:          0x32,   //'2'
    hardwareVersion:        0x33,   //'3'
    bdaddr:                 0x34,   //'4'
    serialNumber:           0x37,   //'7'
    connectable:            0x75,   //'u'
    connectionInfo:         0x79,   //'y'
    ledSettingsRegister:    0x6c,   //'l'
    uartSettingsRegister:   0x6f,   //'o'
    txPower:                0x35,   //'5'
    batteryLevel:           0x38,   //'8'
    RTCAlarmEnabled:        0x6b,   //'k'
    RTCSettingsRegister:    0x6a,   //'j'
    RTCTime:                0x77,   //'w'
    RTCSchedule:            0x72,   //'r'
    advertising:            0x74,   //'t'
    advertisingInterval:    0x69,   //'i'
    uuid:                   0x61,   //'a'
    major:                  0x66,   //'f'
    minor:                  0x67,   //'g'
    measuredStrength:       0x76,   //'v'
    serviceId:              0x62,   //'b'
    led:                    0x68,   //'h'
    command:                0x63,   //'l'
    meshSettingsRegister:   0x6d,   //'m'
    meshNetworkUUID:        0x78,   //'x'
    meshDeviceId:           0x7a,   //'z'

    eventReady:             0x21,   //'!'
    eventConnected:         0x40,   //'@'
    eventButton:            0x24,   //'$'
    eventMeshMessage:       0x5e,   //'^'
  };

  //
  this.serialPort = new SerialPort( serialPort, { 
    baudrate: baudRate, 
    parser: serialport.parsers.readline('\r\n')
  });

  this.serialPort.on('open', function(){
      
    self.serialPort.flush(function(err){
    });

    self.serialPort.on('data', function(data) {
      //filter incoming UART responses data 
      var tmp = /(r:.*$)/.exec(data);
      if( uartRawInputLoggingEnabled === true ){
        console.log( 'Incoming UART data: ' , data );
      }

      if( tmp != null && tmp.length >= 1 ){
        self.emit( 'data' , tmp[1] );
        self.parseIncomingSerialData( tmp[1] );
      }
    });
    
    self.ready = true;
    self.emit( self.EVENTS.UART_READY );
    
  });
}

/**
 *
 */
UBeaconUARTController.prototype.flushSerial = function()
{
  this.serialPort.flush(function(err){
  });
};

/**
 *
 */
UBeaconUARTController.prototype.setUARTRawInputLoggingEnabled = function(enabled)
{
  uartRawInputLoggingEnabled = enabled;
};

/**
 *
 */
UBeaconUARTController.prototype.setUARTLoggingEnabled = function(enabled)
{
  uartLoggingEnabled = enabled;
};

/**
 *
 * Get protocol version supported by the tested device
 *
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.getUARTProtocolVersion = function( callback )
{
  this.sendGetCommand(this.uartCmd.protocolVersion, null, callback);
};


/**
 *
 * Get version of firmware running on the tested device
 *
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.getFirmwareVersion = function( callback )
{
  this.sendGetCommand(this.uartCmd.firmwareVersion, null, callback);
};


/**
 *
 * Get hardware model of the tested device
 *
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.getHardwareModel = function( callback )
{
  this.sendGetCommand(this.uartCmd.hardwareModel, null, callback);
};


/**
 *
 * Get hardware version of the tested device
 *
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.getHardwareVersion = function( callback )
{
  this.sendGetCommand(this.uartCmd.hardwareVersion, null, callback);
};


/**
 *
 * Get mac address (Bluetooth device address) of the tested device
 *
 * @param function    function( responseData ) - will be called
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.getMacAddress = function( callback )
{
  this.sendGetCommand(this.uartCmd.bdaddr, null, callback);
};

/**
 *
 */
UBeaconUARTController.prototype.getConnectionInfo = function( callback )
{
  this.sendGetCommand(this.uartCmd.connectionInfo, null, callback);
};

/**
 *
 * Set TXPower set on the tested device
 *
 * @param txPower     Value to set
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.setTXPower = function( txPower, callback )
{
  var data = dataUtils.uint8ToHex( txPower );
  this.sendSetCommand(this.uartCmd.txPower, new Buffer(data), callback);
};


/**
 *
 * Get TXPower set on the tested device
 *
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.getTXPower = function( callback )
{
  this.sendGetCommand(this.uartCmd.txPower, null, callback);
};


/**
 *
 * Get serial number of the tested device
 *
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.getSerialNumber = function( callback )
{
  this.sendGetCommand(this.uartCmd.serialNumber, null, callback);
};

/**
 *
 * Get battery level (0-100%) on the tested device
 *
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.getBatteryLevel = function( callback )
{
  this.sendGetCommand(this.uartCmd.batteryLevel, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getScheduleSettingsRegister = function( callback )
{
  this.sendGetCommand(this.uartCmd.RTCSettingsRegister, null, callback);
};

/**
 *
 */
UBeaconUARTController.prototype.setScheduleSettingsRegister = function( registerValue, callback )
{
  this.sendSetCommand(this.uartCmd.RTCSettingsRegister, registerValue, callback);
};

/**
 *
 * Get RTC time on the tested device. Data returned into responseData 
 * will be parsed into an object. See parseRTCData() function for more details
 *
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 * Function result is returned as native Date object into callback
 *
 */
UBeaconUARTController.prototype.getRTCTime = function( callback )
{
  this.sendGetCommand(this.uartCmd.RTCTime, null, callback);
};


/**
 * 
 *
 * @param   Date    date    Date to set in RTC
 * @param   function  callback  
 *
 */
UBeaconUARTController.prototype.setRTCTime = function( date, callback )
{
  var dateBCD = this.dateToBCDDate( date );
  this.sendSetCommand(this.uartCmd.RTCTime, new Buffer(dateBCD), callback);
};

/**
 *
 * @param   Date      onTime      On time info. hour, minute and 
 *                                second will be considered
 * @param   Date      offTime     Off time info. hour, minute and 
 *                                second will be considered
 * @param   function  callback    Callback function to execute when 
 *                                data is received
 */
UBeaconUARTController.prototype.setOpenDaySchedule = function( onTime, offTime, callback )
{
  // console.log( 'setOpenDaySchedule', onTime, offTime );
  var scheduleBCD = this.scheduleDatesToBCD( onTime, offTime );
  var data = scheduleBCD;
  // console.log( 'rawData: ', data );
  this.sendSetCommand(this.uartCmd.RTCSchedule, new Buffer(data), callback);
};


/**
 * Retrieve schedule info for provided day
 *
 * @param   number  dayId   Weekday identifier (1-sunday, 7-saturday)
 * @param   function  callback  Callback function to execute when data is received
 */
UBeaconUARTController.prototype.getOpenDaySchedule = function( callback )
{
  this.sendGetCommand(this.uartCmd.RTCSchedule, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setAdvertisingState = function( advertisingOn , callback )
{
  var boolByte = 0;
  if( advertisingOn === true ){
    boolByte = 1;
  }
  var data = dataUtils.uint8ToHex( boolByte );
  // console.log( 'setAdvertisingState', boolByte , data );
  this.sendSetCommand(this.uartCmd.advertising, new Buffer(data), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getAdvertisingState = function( callback )
{
  this.sendGetCommand(this.uartCmd.advertising, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setConnectable = function( connectableOn , callback )
{
  var boolByte = 0;
  if( connectableOn === true ){
    boolByte = 1;
  }
  var data = dataUtils.uint8ToHex( boolByte );
  this.sendSetCommand(this.uartCmd.connectable, new Buffer(data), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getConnectable = function( callback )
{
  this.sendGetCommand(this.uartCmd.connectable, null, callback);
};

/**
 *
 */
UBeaconUARTController.prototype.setLedSettingsRegister = function( settingsRegister , callback )
{
  var data = dataUtils.uint8ToHex( settingsRegister );
  this.sendSetCommand(this.uartCmd.ledSettingsRegister, new Buffer(data), callback);

};

/**
 *
 */
UBeaconUARTController.prototype.getLedSettingsRegister = function( callback )
{
  this.sendGetCommand(this.uartCmd.ledSettingsRegister, null, callback);
};

/**
 *
 */
UBeaconUARTController.prototype.setUartSettingsRegister = function( settingsRegister, callback )
{
  var data = dataUtils.uint8ToHex( settingsRegister );
  this.sendSetCommand(this.uartCmd.uartSettingsRegister, new Buffer(data), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getUartSettingsRegister = function( callback )
{
  this.sendGetCommand(this.uartCmd.uartSettingsRegister, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setAdvertisingInterval = function( advInterval, callback )
{
  var advIntervalBytesAsHex = [ dataUtils.uint8ToHex(advInterval>>8), dataUtils.uint8ToHex(advInterval&0xFF) ];
  var advIntervalAsHex = advIntervalBytesAsHex.join('');
  this.sendSetCommand(this.uartCmd.advertisingInterval, new Buffer(advIntervalAsHex), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getAdvertisingInterval = function( callback )
{
  this.sendGetCommand(this.uartCmd.advertisingInterval, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setProximityUUID = function( proximityUUID, callback )
{
  this.sendSetCommand(this.uartCmd.uuid, new Buffer(proximityUUID), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getProximityUUID = function( callback )
{
  this.sendGetCommand(this.uartCmd.uuid, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setMajor = function( major, callback )
{
  var majorBytesAsHex = [ dataUtils.uint8ToHex(major>>8), dataUtils.uint8ToHex(major&0xFF) ];
  var majorAsHex = majorBytesAsHex.join('');
  this.sendSetCommand(this.uartCmd.major, new Buffer(majorAsHex), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getMajor = function( callback )
{
  this.sendGetCommand(this.uartCmd.major, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setMinor = function( minor, callback )
{
  var minorBytesAsHex = [ dataUtils.uint8ToHex(minor>>8), dataUtils.uint8ToHex(minor&0xFF) ];
  var minorAsHex = minorBytesAsHex.join('');
  this.sendSetCommand(this.uartCmd.minor, new Buffer(minorAsHex), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getMinor = function( callback )
{
  this.sendGetCommand(this.uartCmd.minor, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setMeasuredStrength = function( measuredStrength , callback )
{
  var measuredStrengthHex = dataUtils.uint8ToHex(measuredStrength);
  this.sendSetCommand(this.uartCmd.measuredStrength, new Buffer(measuredStrengthHex), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getMeasuredStrength = function( callback )
{
  this.sendGetCommand(this.uartCmd.measuredStrength, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setLED = function( ledState, callback )
{
  if( typeof ledState === 'boolean'){
    ledState = ( ledState === false ? 0x00 : 0x01 );
  }
  var data = dataUtils.uint8ToHex(ledState);
  this.sendSetCommand(this.uartCmd.led, new Buffer(data), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getLED = function( callback )
{
  this.sendGetCommand(this.uartCmd.led, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.executeCommand = function( cmd , callback )
{
  var data = dataUtils.uint8ToHex( cmd );
  this.sendSetCommand(this.uartCmd.command, new Buffer(data), callback, false );
};


/**
 *
 */
UBeaconUARTController.prototype.setMeshSettingsRegister = function( meshSettingsRegisterByte0, meshSettingsRegisterByte1, callback )
{
  var data = dataUtils.uint8ToHex(meshSettingsRegisterByte0) + dataUtils.uint8ToHex(meshSettingsRegisterByte1);
  this.sendSetCommand(this.uartCmd.meshSettingsRegister, new Buffer(data), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getMeshSettingsRegister = function( callback )
{
  this.sendGetCommand(this.uartCmd.meshSettingsRegister, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setMeshNetworkUUID = function( meshNetworkUUID, callback )
{
  this.sendSetCommand(this.uartCmd.meshNetworkUUID, new Buffer(meshNetworkUUID), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getMeshNetworkUUID = function( callback )
{
  this.sendGetCommand(this.uartCmd.meshNetworkUUID, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setMeshDeviceId = function( meshDeviceId, callback )
{
  var meshDeviceIdBytesAsHex = [ dataUtils.uint8ToHex(meshDeviceId>>8), dataUtils.uint8ToHex(meshDeviceId&0xFF) ];
  var meshDeviceIdAsHex = meshDeviceIdBytesAsHex.join('');
  this.sendSetCommand(this.uartCmd.meshDeviceId, new Buffer(meshDeviceIdAsHex), callback);
};


/**
 *
 */
UBeaconUARTController.prototype.getMeshDeviceId = function( callback )
{
  this.sendGetCommand(this.uartCmd.meshDeviceId, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.sendMeshGenericMessage = function( dstAddr , msg , callback )
{
  var dstAddrBytesAsHex = [ dataUtils.uint8ToHex(dstAddr>>8), dataUtils.uint8ToHex(dstAddr&0xFF) ];
  var dstAddrAsHex = dstAddrBytesAsHex.join('');
  var msgType = dataUtils.uint8ToHex(uartMeshMessageType.userMessage);
  var data = new Buffer([dstAddrAsHex, msgType, dataUtils.stringToHexString(msg)].join(''));
  this.sendSetCommand(this.uartCmd.eventMeshMessage, data, callback);
};


/** 
 *
 */
UBeaconUARTController.prototype.sendMeshRemoteManagementMessage = function( dstAddr , msg , callback )
{
  var dstAddrBytesAsHex = [ dataUtils.uint8ToHex(dstAddr>>8), dataUtils.uint8ToHex(dstAddr&0xFF) ];
  var dstAddrAsHex = dstAddrBytesAsHex.join('');
  var msgType = dataUtils.uint8ToHex(uartMeshMessageType.remoteManagement);
  var data = new Buffer([dstAddrAsHex, msgType, dataUtils.stringToHexString(msg)].join(''));
  this.sendSetCommand(this.uartCmd.eventMeshMessage, data, callback);
};


//////////////////////////////////////////////////////////////////////////////
// Private functions
//////////////////////////////////////////////////////////////////////////////

/**
 * Send read command to uBeacon
 *
 * @param   byte    cmdByte   Command identifier byte 
 * @param   Buffer    data    Data to send as a buffer object
 * @param   function  callback  Callback function to execute 
 *
 */
UBeaconUARTController.prototype.sendGetCommand = function( cmdByte, data, callback )
{
  this.sendCommand( true , cmdByte , data , callback );
};


/**
 * Send set command to uBeacon
 *
 * @param   byte    cmdByte   Command identifier byte 
 * @param   Buffer    data    Data to send as a buffer object
 * @param   function  callback  Callback function to execute 
 *
 */
UBeaconUARTController.prototype.sendSetCommand = function( cmdByte, data, callback )
{
  this.sendCommand( false , cmdByte , data , callback );
};


/**
 *
 */
UBeaconUARTController.prototype.getCommandString = function( isGet, cmdByte, data )
{
  var commandTypeByte = this.cmdSetPrefixByte;
  if( isGet ){
    commandTypeByte = this.cmdGetPrefixByte;
  }

  var cmdBuffer = new Buffer([commandTypeByte, this.delimiterByte, cmdByte]);
  if( data != null ){
    cmdBuffer = Buffer.concat( [cmdBuffer, data] );
  }
  cmdBuffer = Buffer.concat( [cmdBuffer, new Buffer([0x0D, 0x0A])] );
  return cmdBuffer;
};

/**
 *
 */
UBeaconUARTController.prototype.sendCommand = function( isGet, cmdByte, data, callback, expectResponse )
{
  var cmdBuffer = this.getCommandString( isGet, cmdByte, data );
  if( uartLoggingEnabled ){
    console.log( '[UART>>] sending' , cmdBuffer.toString() , '( '+ cmdBuffer +' )');
  }
  this.removeOldCallbacks(cmdByte);
  var cb = {
    cmd: cmdByte, 
    cmdBuffer: cmdBuffer, 
    callback: callback, 
    timestamp: new Date(), 
    expectResponse: true, 
    timeout: null
  };

  if( expectResponse === false ){
    cb.expectResponse = false;
  }
  //
  var self = this;
  cb.timeout = setTimeout(function(){
    var e = new Error('Receving response for cmd=' + cmdByte + ' timed out. Is UART enabled on the board?');
    if( self._callbacks[cmdByte] != null ){
      var cb = self._callbacks[cmdByte].callback;
      self.removeOldCallbacks(cmdByte);
      if( cb != null ){
        return cb(null, e);
      }
    }
  }, self._timeoutMs);

  this._callbacks[cmdByte] = cb;
  this.serialPort.write(cmdBuffer);
};


/**
 * Parse incoming serial data buffer into useable data
 */
UBeaconUARTController.prototype.parseIncomingSerialData = function( serialDataBuffer )
{
  if( uartLoggingEnabled ){
    console.log( '[UART<<] received: ' , serialDataBuffer.toString() );
  }
  if( serialDataBuffer.length >= 3 ){
    
    if( serialDataBuffer.length < 3 || serialDataBuffer.charCodeAt(0) !== this.cmdResponsePrefixByte ){
      return;
    }
      
    var cmdByte = serialDataBuffer[2].charCodeAt();
    var data = serialDataBuffer.substr(3);

    //Handle events and commands differently
    if( cmdByte === this.uartCmd.eventReady || 
        cmdByte === this.uartCmd.eventButton || 
        cmdByte === this.uartCmd.eventMeshMessage || 
        cmdByte === this.uartCmd.eventMessage || 
        cmdByte === this.uartCmd.eventConnected ){
      this.executeIncomingEventData( cmdByte, data );
    }else{
      var responseData = this.convertIncomingResponseData( cmdByte, data );
      if( responseData !== null ){
        this.notifyResponse( cmdByte, responseData );
      }
    }
  }
};

/**
 *
 */
UBeaconUARTController.prototype.convertIncomingResponseData = function( cmdByte, data )
{
  var responseData = null;
  switch(cmdByte){
    //Commands response parsing
    case this.uartCmd.protocolVersion:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.firmwareVersion:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.hardwareModel:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.hardwareVersion:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.bdaddr:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.connectable:
      responseData = this.parseConnectableResponse( cmdByte, data );
      break;
    case this.uartCmd.ledSettingsRegister:
      responseData = data;
      break;
    case this.uartCmd.uartSettingsRegister:
      responseData = data;
      break;
    case this.uartCmd.connectionInfo:
      responseData = this.parseConnectionInfoResponse( cmdByte, data );
      break;
    case this.uartCmd.txPower:
      responseData = this.parseTXPowerResponse( cmdByte, data );
      break;
    case this.uartCmd.serialNumber:
      responseData = this.parseGeneralStringResponse( cmdByte , data );
      break;
    case this.uartCmd.batteryLevel: 
      responseData = this.parseBatteryLevelResponse( cmdByte , data );
      break;
    case this.uartCmd.temperature:
      responseData = this.parseTemperatureResponse( cmdByte, data );
      break;
    case this.uartCmd.RTCSettingsRegister:
      responseData = data;
      break;
    case this.uartCmd.RTCTime:  
      responseData = this.parseRTCDataResponse( cmdByte , data );
      break;
    case this.uartCmd.RTCSchedule:
      responseData = this.parseRTCScheduleResponse( cmdByte , data );
      break;
    case this.uartCmd.advertising:
      responseData = this.parseHexStringResponse( cmdByte , data );
      break;
    case this.uartCmd.advertisingInterval:
      responseData = this.parseAdvertisingIntervalResponse( cmdByte, data );
      break;
    case this.uartCmd.uuid:
      responseData = this.parseHexStringResponse( cmdByte, data );
      break;
    case this.uartCmd.major:
      responseData = data;
      break;
    case this.uartCmd.minor:
      responseData = data;
      break;
    case this.uartCmd.measuredStrength:
      responseData = data;
      break;
    case this.uartCmd.led:
      responseData = this.parseHexStringResponse( cmdByte, data );
      break;
    case this.uartCmd.command:
      //No response for reset should ever be received
      break;
    case this.uartCmd.meshSettingsRegister:  
      responseData = data;
      break;
    case this.uartCmd.meshNetworkUUID:
      responseData = this.parseHexStringResponse( cmdByte, data );
      break;
    case this.uartCmd.meshDeviceId:
      responseData = data;
      break;
    case this.uartCmd.none:       
      responseData = data;
      break;
    default:
      responseData = data;
      break;
  }

  return responseData;
};


/**
 *
 */
UBeaconUARTController.prototype.executeIncomingEventData = function( eventByte, data )
{
  switch(eventByte){
    //Events
    case this.uartCmd.eventReady:
      this.executeReadyEventMessage( eventByte, data );
      break;  
    case this.uartCmd.eventButton:
      this.executeButtonEventMessage( eventByte, data );
      break;
    case this.uartCmd.eventMeshMessage:
      this.executeMeshEventMessage( eventByte, data );
      break;
    case this.uartCmd.eventMessage:
      this.executeMessageEventMessage( eventByte, data );
      break;
    case this.uartCmd.eventConnected:
      this.executeConnectedEventMessage( eventByte, data );
      break;
  }
};


//////////////////////////////////////////////////////////////////////////////
// Message parsing functions
//////////////////////////////////////////////////////////////////////////////

/**
 * Parse hex string response into hex string
 */
UBeaconUARTController.prototype.parseHexStringResponse = function( cmdByte , responseData )
{
  var hexData = responseData.toString('hex');
  return hexData;
};


/**
 * Parse a raw string as bytes response into JS string
 */
UBeaconUARTController.prototype.parseGeneralStringResponse = function( cmdByte , responseData )
{
  var rawData = responseData.toString();
  return rawData;
};


/**
 *
 */
UBeaconUARTController.prototype.parseTXPowerResponse = function( cmdByte, responseData )
{
  var txPower = parseInt( responseData.substring(0,2) , 16 );
  return txPower;
};


/**
 * Parse battery info response
 */
UBeaconUARTController.prototype.parseBatteryLevelResponse = function( cmdByte, responseData )
{
  var batteryLevel = parseInt(responseData,16);
  return batteryLevel;
};


/**
 * Parse RTC time info provided from DS1337
 */
UBeaconUARTController.prototype.parseRTCDataResponse = function( cmdByte , responseData )
{
  var rtcBcdData = responseData;
  var d = this.BCDDateToObject( responseData );
  return d;
};


/**
 *
 */
UBeaconUARTController.prototype.parseRTCAlarmResponse = function( cmdByte, responseData )
{
  var alarmData = this.alarmBCDToDate( responseData );
  return alarmData;
};


/**
 *
 */
UBeaconUARTController.prototype.parseRTCScheduleResponse = function( cmdByte, responseData )
{
  var rtcBcdData = responseData;
  var d = this.scheduleBCDToDates( responseData );
  return d;
};


/**
 *
 */
UBeaconUARTController.prototype.parseConnectableResponse = function( cmdByte, responseData )
{
  var connectable = parseInt(responseData,16) === 0x01 ? true : false;
  return connectable;
};

/**
 *
 */
UBeaconUARTController.prototype.parseConnectionInfoResponse = function( cmdByte, responseData )
{
  var retVal = {
    connected: false,
    macAddress: null
  };

  retVal.connected = (parseInt(responseData.substr(0,2), 16) === 0x01);
  if( retVal.connected === true ){
    retVal.macAddress = responseData.substr(2,10);
  }
  return retVal;
}

/**
 *
 */
UBeaconUARTController.prototype.parseAdvertisingIntervalResponse = function( cmdByte, responseData )
{
  var interval = parseInt( responseData , 16 );
  return interval;
};

//////////////////////////////////////////////////////////////////////////////
// Event parsing functions
//////////////////////////////////////////////////////////////////////////////

/**
 *
 */
UBeaconUARTController.prototype.executeReadyEventMessage = function( cmdByte, responseData )
{
  var isReady = parseInt(responseData, 16) === 1;
  var self = this;
  //Small timeout after the device emits ready event
  setTimeout(function(){
    self.emit( self.EVENTS.UBEACON_READY , isReady );
  }, 200);
};


/**
 *
 */
UBeaconUARTController.prototype.executeButtonEventMessage = function( cmdByte, responseData )
{
  var isPressed = parseInt(responseData.substr(0,2), 16) === 1;
  var eventType = parseInt(responseData.substr(2,2), 16);
  this.emit( this.EVENTS.BUTTON, isPressed, eventType );
};


/**
 *
 */
UBeaconUARTController.prototype.executeMeshEventMessage = function( cmdByte, responseData )
{
  var srcAddr = parseInt(responseData.substr(0,4), 16);
  var msgType = parseInt(responseData.substr(4,2), 16);

  //console.log( 'parseMeshEventMessage' , responseData, '->' , srcAddr, msgType );
  if( msgType === uartMeshMessageType.ack ){
    var txMsgType = parseInt(responseData.substr(6,2),16);
    var success = parseInt(responseData.substr(8,2),16);
    var crc16 = parseInt(responseData.substr(10,4), 16);
    //Remove callback for mesh message after receiving an ACK to not call timeout
    this.removeOldCallbacks(this.uartCmd.eventMeshMessage);
    this.emit( this.EVENTS.MESH_MSG__ACK , srcAddr, txMsgType, success, crc16 , null );
  }
  else if( msgType === uartMeshMessageType.userMessage ){
    var data = dataUtils.hexStringToString(responseData.substr(6));
    this.emit( this.EVENTS.MESH_MSG__USER , srcAddr, msgType, data , null );
  }
  else if( msgType === uartMeshMessageType.remoteManagement ){
    //Prepare response data received over mesh to be parsed
    //Convert first 3 bytes from hex to raw data since it's the r:X part.
    //The rest of payload is response data payload (eg. info which was requested) and
    //is expected to be in hex format for parsing
    var meshPreambule = responseData.substr(0,6);
    var meshCmdByte = parseInt(responseData.substr(10,2),16);
    // var receivedResponse = dataUtils.hexStringToString(responseData.substr(6,6));// + responseData.substr(12);
    var meshResponseData = this.convertIncomingResponseData( meshCmdByte, responseData.substr(12) );
    var data = {
      cmdByte: meshCmdByte,
      responseData: meshResponseData,
      rawResponse: responseData
    };
    this.emit( this.EVENTS.MESH_MSG__REMOTE_MANAGEMENT , srcAddr , msgType, data , null );
  } 
};

/**
 *
 */
UBeaconUARTController.prototype.executeMessageEventMessage = function( cmdByte, responseData )
{
  this.emit( this.EVENTS.MSG, responseData );
}

/**
 *
 */
UBeaconUARTController.prototype.executeConnectedEventMessage = function( cmdByte, responseData )
{
  // var connected = parseInt(responseData.substr(0,2), 16);
  // var connectionInfo = responseData.substr(2);
  var info = this.parseConnectionInfoResponse( cmdByte, responseData );
  this.emit( this.EVENTS.CONNECTED, info.connected, info.macAddress );
}

//////////////////////////////////////////////////////////////////////////////
// Helper functions
//////////////////////////////////////////////////////////////////////////////


/**
 *
 */
UBeaconUARTController.prototype.removeOldCallbacks = function( cmdByte )
{
  if( this._callbacks[cmdByte] != null ){
    if( this._callbacks[cmdByte].timeout != null ){
      clearTimeout(this._callbacks[cmdByte].timeout);
    }
    delete this._callbacks[cmdByte];
  } 
};


/**
 * Perform callback for matching response
 */
UBeaconUARTController.prototype.notifyResponse = function( cmdByte , data )
{
  if( this._callbacks[cmdByte] != null ){
    if( typeof(this._callbacks[cmdByte].callback) === 'function'){
      var c = this._callbacks[cmdByte];
      this.removeOldCallbacks(cmdByte);   
      c.callback(data);
    }    
  // }else{
  //   var error = new Error('No callback was assigned for 0x' + dataUtils.uint8ToHex(cmdByte) + ' command. Received ' + data);
  //   this.emit( 'error' , error );
  }
};

//////////////////////////////////////////////////////////////////////////////
// Public util functions
//////////////////////////////////////////////////////////////////////////////

/**
 *
 */
UBeaconUARTController.prototype.BCDDateToObject = function( bcdDate )
{
  var d;
  d = {
    second: dataUtils.bcd2number( [parseInt(bcdDate.substring(0,2),16)] ),
    minute: dataUtils.bcd2number( [parseInt(bcdDate.substring(2,4),16)] ),
    hour: dataUtils.bcd2number( [parseInt(bcdDate.substring(4,6),16)] ),
    weekday: dataUtils.bcd2number( [parseInt(bcdDate.substring(6,8),16)] ),
    day: dataUtils.bcd2number( [parseInt(bcdDate.substring(8,10),16)] ),
    month: dataUtils.bcd2number( [parseInt(bcdDate.substring(10,12),16)] )-1,     //-1 since JS counts months from 0 and RTCChip from 1
    year: 2000 + dataUtils.bcd2number( [parseInt(bcdDate.substring(12,14),16)] ),
    raw: bcdDate,
    date: null
  };
  var date = new Date( d.year, d.month, d.day, d.hour, d.minute, d.second, 0 );
  return date;
};


/**
 *
 */
UBeaconUARTController.prototype.dateToBCDDate = function( date )
{
  if( date.getFullYear() < 2000 ){
    return null;
  }

  var d = [
    dataUtils.number2bcd(date.getSeconds()),
    dataUtils.number2bcd(date.getMinutes()),
    dataUtils.number2bcd(date.getHours()),
    dataUtils.number2bcd(1+(date.getDay()%7)),
    dataUtils.number2bcd(date.getDate()),
    dataUtils.number2bcd(1+date.getMonth()+1),  //+1 since JS counts months from 0 and RTCChip from 1
    dataUtils.number2bcd(date.getFullYear()-2000)
  ];

  return d.join('');
};


/**
 *
 */
UBeaconUARTController.prototype.scheduleDatesToBCD = function( onTime, offTime )
{
  var retVal = {
    onTime: this.dateToBCDAlarm( onTime ),
    offTime: this.dateToBCDAlarm( offTime )
  };                 
  return [retVal.onTime, retVal.offTime].join('');
};


/**
 * convert schedule entry to native date objects.
 * Schedule entry basically consists of DS1337 alarm two entries in one hex string
 */
UBeaconUARTController.prototype.scheduleBCDToDates = function( bcdSchedule )
{
  if( bcdSchedule.length != 16 ){  // 2x4bytes as hex since data is passed as hex
    return null;
  }

  var onTime = new Date();
  var alarmData = this.alarmBCDToDate( bcdSchedule.substr(0,8) );
  onTime.setSeconds( alarmData.second );
  onTime.setMinutes( alarmData.minute );
  onTime.setHours(  alarmData.hour );
  var offTime = new Date();
  var alarmData = this.alarmBCDToDate( bcdSchedule.substr(8,8) );
  offTime.setSeconds( alarmData.second );
  offTime.setMinutes( alarmData.minute );
  offTime.setHours( alarmData.hour );

  var type = 3;
  if( bcdSchedule.substring(2,4) == '00' ){
    type = 1;
  }
  if( bcdSchedule.substring(2,4).toUpperCase() == 'FF' ){
    type = 2;
  }

  var retVal = {
    dayId: parseInt( bcdSchedule.substring(0,2), 16 ),
    type: type,
    onTime: onTime,
    offTime: offTime
  };
  return retVal;
};


/**
 * Parse alarm data into native object. Date can't be constructed here since
 * there is no way for native JS Date object to be forced into particular
 * weekday. 
 */
UBeaconUARTController.prototype.alarmBCDToDate = function( bcdAlarm )
{
  if( bcdAlarm.length != 2*4 ){
    return null;
  }

  //Weekday data also contains DY/DT which is set to 1 so we need to get rid of it
  // to get the actual weekday value. Refer to "Table 2. Timekeeper Registers" in 
  // http://datasheets.maximintegrated.com/en/ds/DS1337-DS1337C.pdf
  //To achieve this we need to clear 6th bit of the weekday value 
  // var weekday = parseInt(bcdAlarm.substring(6,8),16);
  // weekday &= ~(1<<6 | 1<<7);

  var alarmData = {
    second: dataUtils.bcd2number([parseInt(bcdAlarm.substr(0,2),16)]),
    minute: dataUtils.bcd2number([parseInt(bcdAlarm.substr(2,2),16)]),
    hour: dataUtils.bcd2number([parseInt(bcdAlarm.substr(4,2),16)]),
  };

  return alarmData;
};

/**
 * Convert native date object to RTC alarm entry in BCD format.
 * Refer to http://datasheets.maximintegrated.com/en/ds/DS1337-DS1337C.pdf
 * "Table 2. Timekeeper Registers" for more overview of exact bit values
 * set here
 *
 * @param   Number  dayId   Identifier of the day for alarm
 * @param   Date  date  Date. Only hour:minute:seconds will be used
 *
 * @return  String      Hex string with DS1337 alarm entry
 */
UBeaconUARTController.prototype.dateToBCDAlarm = function( date )
{
  var retVal = [
    dataUtils.uint8ToHex(dataUtils.number2bcd(date.getSeconds())),
    dataUtils.uint8ToHex(dataUtils.number2bcd(date.getMinutes())),
    dataUtils.uint8ToHex(dataUtils.number2bcd(date.getHours())),
    dataUtils.uint8ToHex(0xC3), //For backwards compatibility. Overriden by FW while setting alarm 
  ];
  return retVal.join("");
};
