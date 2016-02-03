/*jslint node: true */
'use strict';

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;
var async = require('async');
var eddystoneEncoder = require('eddystone-url-encoding');

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var dataUtils = require('./dataUtils.js');

util.inherits(UBeaconUARTController, EventEmitter);


module.exports.UBeaconUARTController = UBeaconUARTController;
module.exports.UBeaconAdvertisingSettingsRegister = UBeaconAdvertisingSettingsRegister;
module.exports.UBeaconMeshSettingsRegister = UBeaconMeshSettingsRegister;

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
function UBeaconUARTController( serialPort , baudRate , discoverDevice )
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
    DFU_ERROR:                    'dfu_error',
    DFU_WRITTEN:                  'dfu_written',
  };


  //Available commands
  this.uartCmd = {

    //{cmd: coommandByte, availability: versionOfUartProtocol}
    //If versionOfUartProtocol is null then it is available for all versions and devices
    none:                   {cmd:0xFF,availability:'0.0.0'},   //
    protocolVersion:        {cmd:0x30,availability:null},   //'0'
    firmwareVersion:        {cmd:0x31,availability:null},   //'1'
    hardwareModel:          {cmd:0x32,availability:null},   //'2'
    hardwareVersion:        {cmd:0x33,availability:null},   //'3'
    bdaddr:                 {cmd:0x34,availability:null},   //'4'
    firmwareBuild:          {cmd:0x36,availability:'0.2.0'},   //'6'
    serialNumber:           {cmd:0x37,availability:null},   //'7'
    connectable:            {cmd:0x75,availability:'0.1.0'},   //'u'
    connectionInfo:         {cmd:0x79,availability:'0.1.1'},   //'y'
    ledSettingsRegister:    {cmd:0x6c,availability:'0.1.0'},   //'l'
    uartSettingsRegister:   {cmd:0x6f,availability:'0.1.0'},   //'o'
    txPower:                {cmd:0x35,availability:'0.1.0'},   //'5'
    batteryLevel:           {cmd:0x38,availability:'0.1.0'},   //'8'
    temperature:            {cmd:0x64,availability:'0.2.0'},   //'d' 
    RTCAlarmEnabled:        {cmd:0x6b,availability:'0.1.0'},   //'k'
    RTCSettingsRegister:    {cmd:0x6a,availability:'0.1.0'},   //'j'
    RTCTime:                {cmd:0x77,availability:'0.1.0'},   //'w'
    RTCSchedule:            {cmd:0x72,availability:'0.1.0'},   //'r'
    advertising:            {cmd:0x74,availability:'0.1.0'},   //'t'
    advertisingInterval:    {cmd:0x69,availability:'0.1.0'},   //'i'
    advertisingSettings:    {cmd:0x70,availability:'0.2.1'},   //'p'
    uuid:                   {cmd:0x61,availability:'0.1.0'},   //'a'
    major:                  {cmd:0x66,availability:'0.1.0'},   //'f'
    minor:                  {cmd:0x67,availability:'0.1.0'},   //'g'
    eddystoneURL:           {cmd:0x65,availability:'0.2.1'},   //'e'
    measuredStrength:       {cmd:0x76,availability:'0.1.0'},   //'v'
    serviceId:              {cmd:0x62,availability:'0.1.0'},   //'b'
    led:                    {cmd:0x68,availability:'0.1.2'},   //'h'
    command:                {cmd:0x63,availability:'0.1.0'},   //'l'
    meshSettingsRegister:   {cmd:0x6d,availability:'0.1.0'},   //'m'
    meshNetworkUUID:        {cmd:0x78,availability:'0.1.0'},   //'x'
    meshDeviceId:           {cmd:0x7a,availability:'0.1.0'},   //'z'
    meshStats:              {cmd:0x73,availability:'0.1.0'},   //'s'

    eventReady:             {cmd:0x21,availability:'0.1.0'},   //'!'
    eventConnected:         {cmd:0x40,availability:'0.1.1'},   //'@'
    eventButton:            {cmd:0x24,availability:'0.1.0'},   //'$'
    eventMeshMessage:       {cmd:0x5e,availability:'0.1.0'},   //'^'
    eventDfuError:          {cmd:0x2a,availability:'0.2.0'},   //'*'
    eventDfuWritten:        {cmd:0x23,availability:'0.2.0'},   //'#'
  };

  //Basic data of the connected device
  this.deviceData = {
    hardwareModel: null,
    hardwareVersion: null,
    firmwareVersion: null,
    uartProtocolVersion: null
  };


  if( serialPort != null ){
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
          console.log( '[UART,' + (+new Date()) + ',!!]', data );
        }

        if( tmp != null && tmp.length >= 1 ){
          self.emit( 'data' , tmp[1] );
          self.parseIncomingSerialData( tmp[1] );
        }
      });
      
      if( discoverDevice === false ){
        //If no automatic discovery will be done we have to assume some UART protocol version
        self.deviceData.uartProtocolVersion = '0.1.0';
        self.ready = true;
        self.emit( self.EVENTS.UART_READY );        
      }else{
        //discover basic device info 
        self.discoverBasicDeviceData( function(data, error){
          if( error === null ){
            self.ready = true;
            self.emit( self.EVENTS.UART_READY );
          }else{
            self.emit( self.EVENTS.ERROR, error );
          }
        });
      }

      
    });
  }
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
 * Discovers basic information regarding the connected device
 */
UBeaconUARTController.prototype.discoverBasicDeviceData = function(callback)
{
  var self = this;

  async.waterfall([
    //Get uart protocol version
    function(finishedCallback){
      self.getUARTProtocolVersion(function(data,error){
        self.deviceData.uartProtocolVersion = data;
        finishedCallback(error);
      });
    },
    //Get hardware model
    function(finishedCallback){
      self.getHardwareModel(function(data,error){
        self.deviceData.hardwareModel = data;
        finishedCallback(error);
      });
    },
    //Get hardware version
    function(finishedCallback){
      self.getHardwareVersion(function(data,error){
        self.deviceData.hardwareVersion = data;
        finishedCallback(error);
      });
    },
    //Get firmware version
    function(finishedCallback){
      self.getFirmwareVersion(function(data,error){
        self.deviceData.firmwareVersion = data;
        finishedCallback(error);
      });
    },
  ], function(error, result){
    if( callback != null ){
      if( error != null ){
        return callback(null, error);
      }else{
        return callback(self.deviceData, null);
      }
    }
  });
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
UBeaconUARTController.prototype.getFirmwareBuild = function( callback )
{
  this.sendGetCommand(this.uartCmd.firmwareBuild, null, callback);
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
 * Get temperature
 *
 * @param function    function( responseData ) - will be called 
 *                    when data is received from uBeacon
 *
 */
UBeaconUARTController.prototype.getTemperature = function( callback )
{
  this.sendGetCommand(this.uartCmd.temperature, null, callback);
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
  var scheduleBCD = this.scheduleDatesToBCD( onTime, offTime );
  var data = scheduleBCD;
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
UBeaconUARTController.prototype.setAdvertisingSettings = function( advertisingSettings, callback )
{
  this.sendSetCommand(this.uartCmd.advertisingSettings, new Buffer( advertisingSettings.getBytes() ), callback);
};

/**
 *
 */
UBeaconUARTController.prototype.getAdvertisingSettings = function( callback )
{
  this.sendGetCommand(this.uartCmd.advertisingSettings, null, callback);
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
UBeaconUARTController.prototype.getEddystoneURL = function( callback )
{
  this.sendGetCommand(this.uartCmd.eddystoneURL, null, callback);
};


/**
 *
 */
UBeaconUARTController.prototype.setEddystoneURL = function( urlString, callback )
{
  //prepare value
  var encodedURL;
  if( urlString == null || urlString.trim() === '' ){
    encodedURL = new Buffer(0);
  }else{
    try{
      //Check that there's a http:// or https:// in at the beginning of a
      // non empty url. if not add it.
      var regex = /^([a-z]+)\:\/\//gi;
      if( !regex.test(urlString) ){
        urlString = 'http://' + urlString;
      }
      encodedURL = eddystoneEncoder.encode(urlString);
    }catch(e){
      if( callback != null ){
        callback(null, e);
      }
      return;
    }
  }

  var bytes = [dataUtils.uint8ToHex(0x10),dataUtils.uint8ToHex(0xea)];
  for( var i = 0 ; i < encodedURL.length ; i++ ){
    bytes.push(dataUtils.uint8ToHex(encodedURL.readUInt8(i)));
  }

  var dataHexStr = bytes.join('');
  //
  this.sendSetCommand(this.uartCmd.eddystoneURL, new Buffer(dataHexStr), callback);
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
UBeaconUARTController.prototype.setMeshSettingsRegisterObject = function( meshSettingsRegister , callback )
{
  var _callback = function( data , error ){
    if( error == null ){
      var meshSettings = new UBeaconMeshSettingsRegister();
      meshSettings.setFromBytes( data );
      callback( meshSettings , null );
    }else{
      callback( null, error );
    }
  };

  var hexStr = meshSettingsRegister.getBytes();
  this.setMeshSettingsRegister( hexStr.substr(0,2) , hexStr.substr(2,2) , _callback );
};

/**
 *
 */
UBeaconUARTController.prototype.getMeshSettingsRegisterObject = function( callback )
{
  var _callback = function( data, error ){
    if( error == null ){
      var meshSettings = new UBeaconMeshSettingsRegister();
      meshSettings.setFromBytes( data );
      callback( meshSettings , null );
    }else{
      callback( null, error );
    }
  };

  this.getMeshSettingsRegister( _callback );
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
UBeaconUARTController.prototype.getMeshStats = function( callback )
{
  this.sendGetCommand(this.uartCmd.meshStats, null, callback);
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
UBeaconUARTController.prototype.getCommandString = function( isGet, cmdByte, data , appendEndline )
{
  var commandTypeByte = this.cmdSetPrefixByte;
  if( isGet ){
    commandTypeByte = this.cmdGetPrefixByte;
  }

  var cmdBuffer = new Buffer([commandTypeByte, this.delimiterByte, cmdByte]);
  if( data != null ){
    cmdBuffer = Buffer.concat( [cmdBuffer, data] );
  }
  if( appendEndline ){
    cmdBuffer = Buffer.concat( [cmdBuffer, new Buffer([0x0D, 0x0A])] );
  }
  return cmdBuffer;
};

/**
 *
 */
UBeaconUARTController.prototype.sendCommand = function( isGet, cmdObject, data, callback, expectResponse )
{
  //Check if command is supported in current UART protocol? If not throw an error
  if( cmdObject.availability != null ){
    if( dataUtils.versionGreaterThanOrEqual(this.deviceData.uartProtocolVersion, cmdObject.availability) === false ){
      console.log('command 0x' + dataUtils.uint8ToHex(cmdObject.cmd) + ' not supported.');
      var msg = 'Command 0x' + dataUtils.uint8ToHex(cmdObject.cmd) + ' is not available for protocol version: ' + this.deviceData.uartProtocolVersion;
      msg += ' Support has been added in ' + cmdObject.availability;
      var error = new Error(msg);
      return callback(null, error);
    }
  }


  var cmdBuffer = this.getCommandString( isGet, cmdObject.cmd, data , true );
  this.removeOldCallbacks(cmdObject.cmd);
  var cb = {
    cmd: cmdObject.cmd, 
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
    var e = new Error('Receving response for cmd=0x' + dataUtils.uint8ToHex(cmdObject.cmd) + ' timed out. Is UART enabled on the board and is the board connected?');
    if( self._callbacks[cmdObject.cmd] != null ){
      var cb = self._callbacks[cmdObject.cmd].callback;
      self.removeOldCallbacks(cmdObject.cmd);
      if( cb != null ){
        return cb(null, e);
      }
    }
  }, self._timeoutMs);

  this._callbacks[cmdObject.cmd] = cb;
  this.writeRaw(cmdBuffer);
};


/**
 *
 */
UBeaconUARTController.prototype.writeRaw = function( data )
{
  if( uartLoggingEnabled ){
    console.log( '[UART,' + (+new Date()) + ',>>]' , data.toString('hex') , '/', data.toString());
  }
  this.serialPort.write( data );
};

/**
 * Parse incoming serial data buffer into useable data
 */
UBeaconUARTController.prototype.parseIncomingSerialData = function( serialDataBuffer )
{
  if( uartLoggingEnabled ){
    console.log( '[UART,' + (+new Date()) + ',<<]' , serialDataBuffer.toString() );
  }
  if( serialDataBuffer.length >= 3 ){
    
    if( serialDataBuffer.length < 3 || serialDataBuffer.charCodeAt(0) !== this.cmdResponsePrefixByte ){
      return;
    }
      
    var cmdByte = serialDataBuffer[2].charCodeAt();
    var data = serialDataBuffer.substr(3);

    //Handle events and commands differently
    if( cmdByte === this.uartCmd.eventReady.cmd || 
        cmdByte === this.uartCmd.eventButton.cmd || 
        cmdByte === this.uartCmd.eventMeshMessage.cmd || 
        cmdByte === this.uartCmd.eventConnected.cmd || 
        cmdByte === this.uartCmd.eventDfuError.cmd || 
        cmdByte === this.uartCmd.eventDfuWritten.cmd ){
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
    case this.uartCmd.protocolVersion.cmd:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.firmwareVersion.cmd:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.hardwareModel.cmd:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.hardwareVersion.cmd:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.bdaddr.cmd:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.firmwareBuild.cmd:
      responseData = this.parseGeneralStringResponse( cmdByte, data );
      break;
    case this.uartCmd.connectable.cmd:
      responseData = this.parseConnectableResponse( cmdByte, data );
      break;
    case this.uartCmd.ledSettingsRegister.cmd:
      responseData = data;
      break;
    case this.uartCmd.uartSettingsRegister.cmd:
      responseData = data;
      break;
    case this.uartCmd.connectionInfo.cmd:
      responseData = this.parseConnectionInfoResponse( cmdByte, data );
      break;
    case this.uartCmd.txPower.cmd:
      responseData = this.parseUint8( cmdByte, data );
      break;
    case this.uartCmd.serialNumber.cmd:
      responseData = this.parseGeneralStringResponse( cmdByte , data );
      break;
    case this.uartCmd.batteryLevel.cmd: 
      responseData = this.parseUint8( cmdByte , data );
      break;
    case this.uartCmd.temperature.cmd:
      responseData = this.parseTemperatureResponse( cmdByte, data );
      break;
    case this.uartCmd.RTCSettingsRegister.cmd:
      responseData = data;
      break;
    case this.uartCmd.RTCTime.cmd:  
      responseData = this.parseRTCDataResponse( cmdByte , data );
      break;
    case this.uartCmd.RTCSchedule.cmd:
      responseData = this.parseRTCScheduleResponse( cmdByte , data );
      break;
    case this.uartCmd.advertising.cmd:
      responseData = this.parseHexStringResponse( cmdByte , data );
      break;
    case this.uartCmd.advertisingInterval.cmd:
      responseData = this.parseAdvertisingIntervalResponse( cmdByte, data );
      break;
    case this.uartCmd.advertisingSettings.cmd:
      responseData = this.parseAdvertisingSettingsRegisterResponse( cmdByte, data );
      break;
    case this.uartCmd.uuid.cmd:
      responseData = this.parseHexStringResponse( cmdByte, data );
      break;
    case this.uartCmd.major.cmd:
      responseData = this.parseUint16( cmdByte, data );
      break;
    case this.uartCmd.minor.cmd:
      responseData = this.parseUint16( cmdByte, data );
      break;
    case this.uartCmd.eddystoneURL.cmd:
      responseData = this.parseEddystoneURLResponse( cmdByte, data );
      break;
    case this.uartCmd.measuredStrength.cmd:
      responseData = this.parseUint8(cmdByte, data);
      break;
    case this.uartCmd.led.cmd:
      responseData = this.parseHexStringResponse( cmdByte, data );
      break;
    case this.uartCmd.command.cmd:
      //No response for reset should ever be received
      break;
    case this.uartCmd.meshSettingsRegister.cmd:  
      responseData = data;
      break;
    case this.uartCmd.meshNetworkUUID.cmd:
      responseData = this.parseHexStringResponse( cmdByte, data );
      break;
    case this.uartCmd.meshDeviceId.cmd:
      responseData = this.parseUint16( cmdByte, data );
      break;
    case this.uartCmd.meshStats.cmd:
      responseData = this.parseMeshStats( cmdByte, data );
      break;
    case this.uartCmd.none.cmd:       
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
    case this.uartCmd.eventReady.cmd:
      this.executeReadyEventMessage( eventByte, data );
      break;  
    case this.uartCmd.eventButton.cmd:
      this.executeButtonEventMessage( eventByte, data );
      break;
    case this.uartCmd.eventMeshMessage.cmd:
      this.executeMeshEventMessage( eventByte, data );
      break;
    case this.uartCmd.eventConnected.cmd:
      this.executeConnectedEventMessage( eventByte, data );
      break;
    case this.uartCmd.eventDfuError.cmd:
      this.executeDFUErrorEventMessage( eventByte, data );
      break;
    case this.uartCmd.eventDfuWritten.cmd:
      this.executeDFUWrittenEventMessage( eventByte, data );
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

UBeaconUARTController.prototype.parseUint8 = function( cmdByte , responseData )
{
  return parseInt(responseData,16);
};

/**
 *
 */
UBeaconUARTController.prototype.parseUint16 = function( cmdByte , responseData )
{
  return parseInt(responseData,16);
};

/**
 *
 */
UBeaconUARTController.prototype.parseTemperatureResponse = function( cmdByte, responseData )
{
  var temperature = parseInt(responseData, 16);
  // <0 is represented on uint16 so -1 is 0xFFFE
  if( temperature >= 0x8000 ){
    temperature = temperature - 0xFFFF;
  }
  return temperature;
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
};

/**
 *
 */
UBeaconUARTController.prototype.parseAdvertisingSettingsRegisterResponse = function( cmdByte, responseData )
{
  var reg = new UBeaconAdvertisingSettingsRegister();
  reg.setFromBytes(responseData);
  return reg;
};

/**
 *
 */
UBeaconUARTController.prototype.parseEddystoneURLResponse = function( cmdByte, responseData )
{
  var responseBuffer = new Buffer(responseData, 'hex');
  var urlDataBuffer = new Buffer(responseBuffer.length-2);
  responseBuffer.copy(urlDataBuffer, 0, 2);
  if( urlDataBuffer.length > 0 ){
    try{
      var urlString = eddystoneEncoder.decode( new Buffer(urlDataBuffer) );
      return urlString;      
    }catch(e){
      this.emit( this.EVENTS.ERROR, e );
      return '';
    }
  }
  return '';
};

/**
 *
 */
UBeaconUARTController.prototype.parseAdvertisingIntervalResponse = function( cmdByte, responseData )
{
  var interval = parseInt( responseData , 16 );
  return interval;
};

/**
 *
 */
UBeaconUARTController.prototype.parseMeshStats = function( cmdByte, responseData )
{
  var stats = new UBeaconMeshStats();
  stats.setFromBytes( responseData );
  return stats;
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
};

/**
 *
 */
UBeaconUARTController.prototype.executeConnectedEventMessage = function( cmdByte, responseData )
{
  // var connected = parseInt(responseData.substr(0,2), 16);
  // var connectionInfo = responseData.substr(2);
  var info = this.parseConnectionInfoResponse( cmdByte, responseData );
  this.emit( this.EVENTS.CONNECTED, info.connected, info.macAddress );
};

/**
 *
 */
UBeaconUARTController.prototype.executeDFUErrorEventMessage = function( cmdByte, responseData )
{
  this.emit( this.EVENTS.DFU_ERROR, responseData );  
};

/**
 *
 */
UBeaconUARTController.prototype.executeDFUWrittenEventMessage = function( cmdByte, responseData )
{
  var controlValue = parseInt(responseData, 16);
  this.emit( this.EVENTS.DFU_WRITTEN, controlValue );    
};

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
      c.callback(data, null);
    }    
  }else{
    // var error = new Error('No callback was assigned for 0x' + dataUtils.uint8ToHex(cmdByte) + ' command. Received ' + data);
    // this.emit( 'error' , error );
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
    dataUtils.number2bcd(1+date.getMonth()),  //+1 since JS counts months from 0 and RTCChip from 1
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

//////////////////////////////////////////////////////////////////////////////
// Advertising settings register object
//////////////////////////////////////////////////////////////////////////////

var _defaultScanResponseValue = 0x03;

/**
 * 
 */
function UBeaconAdvertisingSettingsRegister()
{
  //Not all attributes are yet supported
  this.scanResponseInterval = _defaultScanResponseValue;
  this.eddystoneInterval = 0x00;
  this.iBeaconInterval = 0x01;
}

/**
 *
 */
UBeaconAdvertisingSettingsRegister.prototype.setFromBytes = function( bytesHexString )
{
  var bytes = [
    parseInt(bytesHexString.substr(0,2), 16),
    parseInt(bytesHexString.substr(2,2), 16),
    parseInt(bytesHexString.substr(4,2), 16),
    parseInt(bytesHexString.substr(6,2), 16)
  ];

  this.eddystoneInterval = bytes[0];
  this.scanResponseInterval = _defaultScanResponseValue;
  this.iBeaconInterval = bytes[2];
};

/**
 *
 */
UBeaconAdvertisingSettingsRegister.prototype.setFrom = function( advertisingSettingsRegister )
{
  this.scanResponseInterval = advertisingSettingsRegister.scanResponseInterval;
  this.eddystoneInterval = advertisingSettingsRegister.eddystoneInterval;
  this.iBeaconInterval = advertisingSettingsRegister.iBeaconInterval;
};

/**
 *
 */
UBeaconAdvertisingSettingsRegister.prototype.setEddystoneEnabled = function( enable )
{
  this.eddystoneInterval = (enable === true ? 0x02 : 0x00);
};

/**
 *
 */
UBeaconAdvertisingSettingsRegister.prototype.isEddystoneEnabled = function()
{
  return this.eddystoneInterval === 0x02;
};

/**
 *
 */
UBeaconAdvertisingSettingsRegister.prototype.getBytes = function()
{
  var bytes = [];
  //We currently don't allow to disable scan response
  this.scanResponseInterval = _defaultScanResponseValue;
  bytes.push(dataUtils.zeroPad(this.eddystoneInterval.toString(16),2));
  bytes.push(dataUtils.zeroPad(this.scanResponseInterval.toString(16),2));
  bytes.push(dataUtils.zeroPad(this.iBeaconInterval.toString(16),2));
  bytes.push(dataUtils.zeroPad(0x00,2));
  var bytesHexStr = bytes.join('');

  return bytesHexStr;
};
//////////////////////////////////////////////////////////////////////////////
// Mesh register object conversion functions
//////////////////////////////////////////////////////////////////////////////

/**
 *
 */
function UBeaconMeshSettingsRegister()
{
  this.enabled = false;
  this.allow_non_auth_connections = false;
  this.always_connectable = false;
  this.enable_mesh_window = false;
  this.mesh_window_on_hour = 0;
  this.mesh_window_duration = 0;
}

/**
 *
 */
UBeaconMeshSettingsRegister.prototype.setFromBytes = function( bytesHexString )
{
  var byte0 = parseInt(bytesHexString.substr(0,2), 16);
  var byte1 = parseInt(bytesHexString.substr(2,2), 16);

  if( byte0 === 0xFF && byte1 === 0xFF ){
    this.enabled = false;
    this.allow_non_auth_connections = false;
    this.always_connectable = false;
    this.enable_mesh_window = false;
    this.mesh_window_on_hour = 0;
    this.mesh_window_duration = 0;    
  }else{
    this.enabled = ( byte0 & (1<<0) ) !== 0;
    this.allow_non_auth_connections = ( byte0 & (1<<1) ) !== 0;
    this.always_connectable = ( byte0 & (1<<2) ) !== 0;
    this.enable_mesh_window = ( byte0 & (1<<3) ) !== 0;
    this.mesh_window_on_hour = ( byte1 & 0x1f );
    this.mesh_window_duration = ((byte1 & 0xe0 ) >> 5) * 10;
  }
};

/**
 *
 */
UBeaconMeshSettingsRegister.prototype.setFrom = function( meshSettings )
{
  this.enabled = meshSettings.enabled;
  this.allow_non_auth_connections = meshSettings.allow_non_auth_connections;
  this.always_connectable = meshSettings.always_connectable;
  this.enable_mesh_window = meshSettings.enable_mesh_window;
  this.mesh_window_on_hour = meshSettings.mesh_window_on_hour;
  this.mesh_window_duration = meshSettings.mesh_window_duration;
};

/**
 *
 */
UBeaconMeshSettingsRegister.prototype.getBytes = function()
{
  var byte0 = 0;
  var byte1 = 0;
  
  //
  var enabled = this.enabled;
  if( enabled == true ){ byte0 |= (1<<0);}   //set bit flag
  if( enabled == false ){ byte0 &= ~(1<<0);}  //clear bit flag
  
  //
  var acceptNonAuthconnections = this.allow_non_auth_connections;
  if( acceptNonAuthconnections == true ){ byte0 |= (1<<1);}
  if( acceptNonAuthconnections == false ){ byte0 &= ~(1<<1);}

  //
  var alwaysConnectable = this.always_connectable;
  if( alwaysConnectable == true ){ byte0 |= (1<<2);}
  if( alwaysConnectable == false ){ byte0 &= ~(1<<2);}

  //
  var enableMeshWindow = this.enable_mesh_window;
  if( enableMeshWindow == true ){ byte0 |= (1<<3);}
  if( enableMeshWindow == false ){ byte0 &= ~(1<<3);}

  var onHour = this.mesh_window_on_hour;
  if( onHour < 0 ){ onHour = 0; }
  if( onHour > 23 ){ onHour = 23; }

  var duration = this.mesh_window_duration;
  if( duration < 0 ){ duration = 0; }
  if( duration > 60 ){ duration = 60; }
  duration = Math.round(duration/10);

  byte1 = onHour & 0x1f;          //0b00011111 mask
  byte1 |= ( duration << 5 ) & 0xe0;  //0b11100000 mask

  //
  var retVal = '';

  retVal += dataUtils.zeroPad((byte0).toString(16),2);
  retVal += dataUtils.zeroPad((byte1).toString(16),2);
  return retVal;
};

//////////////////////////////////////////////////////////////////////////////
// Mesh stats object
//////////////////////////////////////////////////////////////////////////////

/**
 *
 */
function UBeaconMeshStats()
{
  this.sent = 0;
  this.acked = 0;
  this.received = 0;
}

/**
 *
 */ 
UBeaconMeshStats.prototype.setFromBytes = function( bytesHexString )
{
  if( bytesHexString.length == 12 ){
    this.sent = parseInt(bytesHexString.substr(0,4), 16);
    this.acked = parseInt(bytesHexString.substr(4,4), 16);
    this.received = parseInt(bytesHexString.substr(8,4), 16);
  }
};
