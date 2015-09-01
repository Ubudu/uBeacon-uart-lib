/*jslint node: true */
'use strict';

var expect = require('chai').expect;

var UBeaconMeshSettingsRegister = require('../uBeaconUARTController.js').UBeaconMeshSettingsRegister;

/*
 * Testing UBeaconMeshSettings register value conversions
 */

describe('UBeaconMeshSettingsRegister data conversions', function(){
  
  var reg = null;

  /**
   *
   */
  beforeEach(function(done){
    reg = new UBeaconMeshSettingsRegister();
    done();
  });


  /**
   *
   */
  it('Check defaults', function(done){
    expect(reg.enabled).to.equal(false);    
    expect(reg.allow_non_auth_connections).to.equal(false);
    expect(reg.always_connectable).to.equal(false);
    expect(reg.enable_mesh_window).to.equal(false);
    expect(reg.mesh_window_on_hour).to.equal(0);
    expect(reg.mesh_window_duration).to.equal(0);
    done();
  });

  /**
   *
   */
  it('Check fields to bytes',function(done){
    reg.enabled = true;
    var hexString = reg.getBytes();
    expect(hexString).to.equal('0100');

    reg.allow_non_auth_connections = true;
    hexString = reg.getBytes();
    expect(hexString).to.equal('0300');

    reg.always_connectable = true;
    hexString = reg.getBytes();
    expect(hexString).to.equal('0700');

    reg.enable_mesh_window = true;
    hexString = reg.getBytes();
    expect(hexString).to.equal('0f00');

    reg.mesh_window_on_hour = 13;     //13 = 0b00010011 
    hexString = reg.getBytes();
    expect(hexString).to.equal('0f0d');

    reg.mesh_window_duration = 60;    //6 = 0b00000110 // << 5
    hexString = reg.getBytes();
    expect(hexString).to.equal('0fcd');

    done();
  });

  /**
   *
   */
  it('Check bytes to fields', function(done){
    reg.setFromBytes('0000');
    expect(reg.enabled).to.equal(false);    
    expect(reg.allow_non_auth_connections).to.equal(false);
    expect(reg.always_connectable).to.equal(false);
    expect(reg.enable_mesh_window).to.equal(false);
    expect(reg.mesh_window_on_hour).to.equal(0);
    expect(reg.mesh_window_duration).to.equal(0);

    reg.setFromBytes('0fcd');
    expect(reg.enabled).to.equal(true);    
    expect(reg.allow_non_auth_connections).to.equal(true);
    expect(reg.always_connectable).to.equal(true);
    expect(reg.enable_mesh_window).to.equal(true);
    expect(reg.mesh_window_on_hour).to.equal(13);
    expect(reg.mesh_window_duration).to.equal(60);

    reg.setFromBytes('0100');
    expect(reg.enabled).to.equal(true);
    expect(reg.allow_non_auth_connections).to.equal(false);
    expect(reg.always_connectable).to.equal(false);
    expect(reg.enable_mesh_window).to.equal(false);
    expect(reg.mesh_window_on_hour).to.equal(0);
    expect(reg.mesh_window_duration).to.equal(0);

    reg.setFromBytes('0500');
    expect(reg.enabled).to.equal(true);
    expect(reg.allow_non_auth_connections).to.equal(false);
    expect(reg.always_connectable).to.equal(true);
    expect(reg.enable_mesh_window).to.equal(false);
    expect(reg.mesh_window_on_hour).to.equal(0);
    expect(reg.mesh_window_duration).to.equal(0);

    reg.setFromBytes('0400');
    expect(reg.enabled).to.equal(false);
    expect(reg.allow_non_auth_connections).to.equal(false);
    expect(reg.always_connectable).to.equal(true);
    expect(reg.enable_mesh_window).to.equal(false);
    expect(reg.mesh_window_on_hour).to.equal(0);
    expect(reg.mesh_window_duration).to.equal(0);

    reg.setFromBytes('00c0');
    expect(reg.enabled).to.equal(false);    
    expect(reg.allow_non_auth_connections).to.equal(false);
    expect(reg.always_connectable).to.equal(false);
    expect(reg.enable_mesh_window).to.equal(false);
    expect(reg.mesh_window_on_hour).to.equal(0);
    expect(reg.mesh_window_duration).to.equal(60);

    reg.setFromBytes('ffff');
    expect(reg.enabled).to.equal(false);    
    expect(reg.allow_non_auth_connections).to.equal(false);
    expect(reg.always_connectable).to.equal(false);
    expect(reg.enable_mesh_window).to.equal(false);
    expect(reg.mesh_window_on_hour).to.equal(0);
    expect(reg.mesh_window_duration).to.equal(0);

    done();
  });

});

