/*jslint node: true */
'use strict';

/* 
 *
 */
module.exports = {

  /*
   * @src: https://gist.github.com/joaomaia/3892692
   * bcd2number -> takes a nodejs buffer with a BCD and returns the corresponding number.
   * input: nodejs buffer
   * output: number 
   */
  bcd2number: function(bcd) 
  {
    var n = 0;
    var m = 1;
    for(var i = 0; i<bcd.length; i+=1) {
        n += (bcd[bcd.length-1-i] & 0x0F) * m;
        n += ((bcd[bcd.length-1-i]>>4) & 0x0F) * m * 10;
        m *= 100;
    }
    return n;
  },

  /*
   * @src: https://gist.github.com/joaomaia/3892692
   * number2bcd -> takes a number and returns the corresponding BCD in a nodejs buffer object.
   * input: 32 bit positive number, nodejs buffer size
   * output: nodejs buffer 
   */
  number2bcd: function(number) 
  {
    var bcd = ((number/10)<<4) + (number%10);
    var retVal = bcd.toString(16);
    if( retVal.length < 2 ){
      retVal = '0' + retVal;
    }
    return retVal;
  },


  uint8ToHex: function(number)
  {
    var hex = number.toString(16);
    if( hex.length < 2 ){
      hex = '0' + hex;
    }
    return hex;
  },

  /**
   *
   */
  stringToHexString: function(str)
  {
    var hexStr = '';
    for( var i = 0 ; i < str.length ; i++ ){
      hexStr += this.uint8ToHex( str.charCodeAt(i) );
    }
    return hexStr;
  },

  /**
   *
   */
  hexStringToString: function(hexStr)
  {
    var str = '';
    for( var i = 0 ; i < hexStr.length ; i+=2 ){
      str += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
    } 
    return str;
  },


  /**
   *
   */
  zeroPad: function(num, places) 
  {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join('0') + num;
  },


  /**
   *
   */
  versionGreaterThanOrEqual: function( inputVersion, compareVersion )
  {
    if( inputVersion == null || compareVersion == null ){
      return false;
    }

    var tmpIn = inputVersion.split('.');
    var tmpCmp = compareVersion.split('.');

    var inVersion = {
      major: parseInt(tmpIn[0]),
      minor: parseInt(tmpIn[1]),
      patch: parseInt(tmpIn[2]),
    };
    var cmpVersion = {
      major: parseInt(tmpCmp[0]),
      minor: parseInt(tmpCmp[1]),
      patch: parseInt(tmpCmp[2]),
    };

    if( inVersion.major > cmpVersion.major ){
      return true;
    }
    if( inVersion.major == cmpVersion.major && inVersion.minor > cmpVersion.minor ){
      return true;
    }
    if( inVersion.major == cmpVersion.major && inVersion.minor == cmpVersion.minor && inVersion.patch >= cmpVersion.patch ){
      return true;
    }
    return false;
  }


};
