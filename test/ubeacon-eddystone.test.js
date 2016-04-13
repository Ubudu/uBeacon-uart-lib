/*jslint node: true */
'use strict';

var expect = require('chai').expect;
var async = require('async');

var UBeaconUARTController = require('../uBeaconUARTController.js').UBeaconUARTController;
var dataUtils = require('../dataUtils.js');


/*
 * Testing UBeaconMeshSettings register eddystone-URL conversions and setting onto device
 * Node that a uBeacon device with firmware version 2.2.0 or later is required to run the full
 * test. 
 */


describe('Eddystone-URL tests', function(){
  
  var ubeacon = null;

  /**
   *
   */
  before(function(done){
    ubeacon = new UBeaconUARTController('/dev/tty.usbserial-A9030UTP', 115200);
    // ubeacon.setUARTRawInputLoggingEnabled(true);
    // ubeacon.setUARTLoggingEnabled(true);
    ubeacon.on(ubeacon.EVENTS.UART_READY, function(){
      var uartProtocolSupportsEddystone = dataUtils.versionGreaterThanOrEqual(ubeacon.deviceData.uartProtocolVersion, '0.2.1');
      expect(uartProtocolSupportsEddystone, 'UART protocol version supports Eddystone-URL').to.be.true;

      var fwSupportsEddystone = dataUtils.versionGreaterThanOrEqual(ubeacon.deviceData.firmwareVersion, '2.2.0');
      expect(fwSupportsEddystone, 'Firmware version supports Eddystone-URL').to.be.true;
      done();
    });
  });


  /**
   *
   */
  it('Check setting valid Eddystone-URL values', function(done){
    ubeacon.setEddystoneURL( 'http://ubudu.com' , function(data, error){
      expect(error).to.be.null;    
      expect(data).to.be.equal('http://ubudu.com');
      done();
    });
  });

  /**
   *
   */
  it('Check getting again', function(done){
    ubeacon.getEddystoneURL( function(data, error){
      expect(error).to.be.null;    
      expect(data).to.be.equal('http://ubudu.com');
      done();
    });
  });

  /**
   *
   */
  it('Check setting ftp Eddystone-URL value', function(done){
    async.series([
      //Try to set an invalid URL value
      function(finishedCallback){
        ubeacon.setEddystoneURL( 'ftp://v3i', function(data, error){
          expect(data).to.be.null;
          expect(error).not.to.be.null;    
          expect(error.toString()).to.equal('Error: Only "http://" and "https://" URLs can be encoded');
          finishedCallback();
        });
      },
      //Verify that previously set URL hasn't changed
      function(finishedCallback){
        ubeacon.getEddystoneURL( function(data, error){
          expect(data).to.be.equal('http://ubudu.com');
          expect(error).to.be.null;    
          done();
        });
      }
    ]);
  });

  /**
   *
   */
  it('Check automatic prepending of "http://" if missing', function(done){
    async.series([
      function(finishedCallback){
        ubeacon.setEddystoneURL('google.com', function(data, error){
          expect(data).to.be.equal('http://google.com');
          expect(error).to.be.null;              
          finishedCallback();
        });
      },
      //Verify by reading again from device
      function(finishedCallback){
        ubeacon.getEddystoneURL( function(data, error){
          expect(data).to.be.equal('http://google.com');
          expect(error).to.be.null;              
          done();
        });
      }
    ]);

  });

  /**
   *
   */
  it('Check setting empty value', function(done){
    ubeacon.setEddystoneURL( '', function(data, error){
      expect(data).to.equal('');
      expect(error).to.be.null;    
      done();
    });
  });


});

