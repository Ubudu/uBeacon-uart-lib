/*jslint node: true */
'use strict';

var expect = require('chai').expect;

var UBeaconAdvertisingSettingsRegister = require('../uBeaconUARTController.js').UBeaconAdvertisingSettingsRegister;

/*
 * Testing UBeaconAdvertisingSettings register value conversions
 */

var _defaultScanResponseValue = 0x03;

describe('UBeaconAdvertisingSettingsRegister data conversions', function(){
  
  var reg = null;

  /**
   *
   */
  beforeEach(function(done){
    reg = new UBeaconAdvertisingSettingsRegister();
    done();
  });


  /**
   *
   */
  it('Check defaults', function(done){
    expect(reg.eddystoneInterval).to.equal(0x00);
    expect(reg.scanResponseInterval).to.equal(_defaultScanResponseValue);
    expect(reg.iBeaconInterval).to.equal(0x01);
    done();
  });


  /**
   *
   */
  it('Check toData', function(done){
    reg.scanResponseInterval = _defaultScanResponseValue;
    reg.eddystoneInterval = 0x02;
    reg.iBeaconInterval = 0x01;

    var bytesHexString = reg.getBytes();
    expect(bytesHexString).to.equal('02030100');
    done();
  });

  /**
   *
   */
  it('Check setting from data', function(done){
    reg.setFromBytes('03030400');
    expect(reg.eddystoneInterval).to.equal(0x03);
    expect(reg.scanResponseInterval).to.equal(_defaultScanResponseValue);
    expect(reg.iBeaconInterval).to.equal(0x04);
    done();
  });

  /**
   *
   */
  it('Check that scanResponse is immutable', function(done){
    reg.scanResponseInterval = 0x00;
    reg.eddystoneInterval = 0x02;
    reg.iBeaconInterval = 0x01;
    expect(reg.getBytes()).to.equal('02030100');

    reg.scanResponseInterval = 0xFF;
    reg.eddystoneInterval = 0x04;
    reg.iBeaconInterval = 0x05;
    expect(reg.getBytes()).to.equal('04030500');
    done();
  });

  /**
   *
   */
  it('Check eddystoneEnable behaviour', function(done){
    reg.scanResponseInterval = _defaultScanResponseValue;
    reg.eddystoneInterval = 0x00;
    reg.iBeaconInterval = 0x01;

    reg.setEddystoneEnabled(true);
    expect(reg.getBytes()).to.equal('02030100');

    reg.setEddystoneEnabled(false);
    expect(reg.getBytes()).to.equal('00030100');
    done();
  });
});