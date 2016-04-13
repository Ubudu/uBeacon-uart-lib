/*jslint node: true */
'use strict';

var expect = require('chai').expect;

var dataUtils = require('../dataUtils.js');


describe('dataUtils functions', function(){
  
  /**
   *
   */
  it('test uint8 to hex', function(done){
    var hex = dataUtils.uint8ToHex(1);
    expect(hex).to.equal('01');

    hex = dataUtils.uint8ToHex(10);
    expect(hex).to.equal('0a');

    hex = dataUtils.uint8ToHex(64);
    expect(hex).to.equal('40');

    hex = dataUtils.uint8ToHex(127);
    expect(hex).to.equal('7f');

    hex = dataUtils.uint8ToHex(255);
    expect(hex).to.equal('ff');

    done();
  });

  /**
   *
   */
  it('test string/hex string conversions', function(done){
    var expectedStr = 'Lorem ipsum';
    var expectedHexStr = '4c6f72656d20697073756d';
    
    var testHexStr = dataUtils.stringToHexString(expectedStr);
    var testStr = dataUtils.hexStringToString(testHexStr);

    expect(testHexStr).to.equal(expectedHexStr);
    expect(testStr).to.equal(expectedStr);
    
    done();
  });

  /**
   *
   */
  it('test zeropad', function(done){

    var str = '';
    str = dataUtils.zeroPad(10, 0);
    expect(str).to.equal('10');

    str = dataUtils.zeroPad(10, 1);
    expect(str).to.equal('10');

    str = dataUtils.zeroPad(10, 2);
    expect(str).to.equal('10');

    str = dataUtils.zeroPad(10, 3);
    expect(str).to.equal('010');

    str = dataUtils.zeroPad(10, 4);
    expect(str).to.equal('0010');

    done();
  });

});

