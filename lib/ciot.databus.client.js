/**
 * Created by TaeHyun KIM @ SyncTechno.com on 2017. 7. 14.
 *
 * This project is supported by KETI Cognitive IoT Project.
 */

var HazelcastClient = require('hazelcast-client').Client
  , Config = require('hazelcast-client').Config
  , uuidv4 = require('uuid/v4')
;


var debug = console.log;

var RESERVED_KEY = {
  "CIOT_APP_MANAGER_REQ": "CIOT_APP_MANAGER_REQ",
  "CIOT_OPENDATA_LIST": "CIOT_OPENDATA_LIST"
};


var GLOBAL_NODE_ADDRESS = "dev.synctechno.com";
var MAP_NAME = "CUSTOMERS2";

var ketiCiotGlobalObjectKeys = {
  'CIOT_PROCESS': 'CIOT_PROCESS',
  'CIOT_TEST': 'CIOT_TEST',
  'CUSTOMERS2': 'CUSTfffOMERS2',
  'CIOT_DEMO_SWITCH': 'CIOT_DEMO_SWITCH'
};


/**
 *
 *
 * @param options
 *   {
 *     "service": {
 *       "serviceId": 'uuid',
 *       "serviceName": 'service name',
 *       "serviceDesc": 'description text for service',
 *       "versionCode": {
 *         major: 1, minor: 1, revision:1
 *       },
 *       "openData": {
 *         "local": [{
 *           "name": "open data name",
 *           "description": "data description",
 *           "template": "descriptive text for format of open data contents"
 *         }],
 *         "global: [{
 *           "name": "open data name",
 *           "description": "data description",
 *           "template": "descriptive text for format of open data contents"
 *         }]
 *       }
 *     }
 *
 *     "databus": {
 *       "globalHost":  "ip.address.of.cloud",
 *       "globalPort": "port",
 *       "localPort": "port"
 *     }
 *   }
 *
 */
function CiotDatabusClient(options) {
  /**
   * Options
   */
  options = options || {};

  try {
    _assertProperty(options.service.serviceName, 'options.service.serviceName');
    _assertProperty(options.service.versionCode, 'options.service.versionCode');
    _assertProperty(options.databus.globalHost, 'options.databus.globalHost');
    _assertProperty(options.databus.globalPort, 'options.databus.globalPort');
    _assertProperty(options.databus.localPort, 'options.databus.localPort');

    options.databus['localHost'] = '127.0.0.1'; //  default
  } catch (ex) {
    debug( ex );
    throw Error('Failed on creating new CiotDatabusClient object: missing required options');
  }


  /**
   * Member Variables
   *
   */
  this.databus = options.databus;
  this.service = options.service;
  this.service.instanceId = options.service.serviceId || uuidv4();

  this.subscriptionList = {
    "global": {},
    "local": {}
  };

  this.clientInitialized = false;
}


/**
 * Member Functions
 *
 */
CiotDatabusClient.prototype.init = _initClient;


CiotDatabusClient.prototype.startService = _startService;
CiotDatabusClient.prototype.stopService = _stopService;


// read and write my service data
CiotDatabusClient.prototype.setGlobalAppData = _setGlobalAppData;
CiotDatabusClient.prototype.getGlobalAppData = _getGlobalAppData;

CiotDatabusClient.prototype.setLocalAppData = _setLocalAppData;
CiotDatabusClient.prototype.getLocalAppData = _getLocalAppData;


//  read open data which is owned by other service
CiotDatabusClient.prototype.getGlobalOpendata = _getGlobalOpendata;

CiotDatabusClient.prototype.getLocalOpendata = _getLocalOpendata;

//  subscribe/unsubscribe to open data which is owned by other service
CiotDatabusClient.prototype.subscribeToLocalOpendata = _subscribeToLocalOpendata;
CiotDatabusClient.prototype.unsubscribeToLocalOpendata = _unsubscribeToLocalOpendata;

CiotDatabusClient.prototype.subscribeToGlobalOpendata = _subscribeToGlobalOpendata;
CiotDatabusClient.prototype.unsubscribeToGlobalOpendata = _unsubscribeToGlobalOpendata;


/**
 * Implementations of Private functions for internal use.
 */
function _assert(condition, message) {
  if (!condition) {
    throw message || "Assertion failed";
  }
}


function _assertProperty(condition, message) {
  if (typeof condition === 'undefined') {
    throw message || "Assertion failed";
  }
}


function _createHazelcastClient(host, port) {
  return new Promise(function (resolve, reject) {
    try {
      var config = new Config.ClientConfig();
      config.networkConfig.addresses = [{
        host: host,
        port: port
      }];

      // config.groupConfig.name = 'ciot-local-bus';
      // config.groupConfig.password = 'ciot-local-bus-pass';

      HazelcastClient.newHazelcastClient(config)
        .then(function(hazelcastClient){
          resolve(hazelcastClient)
        })
        .catch(function(err){
          reject(err);
        });
    }
    catch (ex) {
      debug( ex );
      reject(ex);
    }
  });
}




/**
 * Implementations of Member Functions
 *
 */

function _initClient() {
  var thisClient = this;
  return new Promise(function (resolve, reject) {
    try {
      debug( 'initClient 11', thisClient.clientInitialized )
      if (thisClient.clientInitialized)
        resolve(thisClient);
      else {
        debug( 'initClient 22', thisClient.databus.globalHost, thisClient.databus.globalPort )

        _createHazelcastClient(thisClient.databus.globalHost, thisClient.databus.globalPort)
          .then(function(globalDatabusClient){
            debug( 'initClient 33' )

            thisClient.globalDatabusClient = globalDatabusClient;
            debug( 'initClient 44' )


            debug( 'initClient 44-1', thisClient.databus.localHost, thisClient.databus.localPort )

            return _createHazelcastClient(thisClient.databus.localHost, thisClient.databus.localPort)
          })
          .then(function(localDatabusClient){
            thisClient.localDatabusClient = localDatabusClient;
            debug( 'initClient 55' )

            thisClient.clientInitialized = true;
            resolve(thisClient);
          })
          .catch(function(err){
            debug( 'initClient error' )

            debug( err );
            reject(err);
          });
      }
    }
    catch (ex) {
      debug( ex );
      reject(ex);
    }
  });
}


function _startService() {
  var thisClient = this;
  return new Promise(function(resolve, reject){
    try {
      thisClient.init()
        .then(function(thisClient){
          var appManagerRequestQueue = thisClient.localDatabusClient.getQueue(RESERVED_KEY.CIOT_APP_MANAGER_REQ);

          appManagerRequestQueue.put({
            "state": "start",
            "instance": thisClient.service
          })
            .then(function(result){
              resolve( result );
            })
            .catch(function(err){
              reject(err);
            });
        })
    }
    catch(ex) {
      debug(ex);
      reject(ex);
    }
  });
}


function _stopService() {
  var thisClient = this;
  return new Promise(function(resolve, reject){
    try {
      thisClient.init()
        .then(function(thisClient){
          var appManagerRequestQueue = thisClient.localDatabusClient.getQueue(RESERVED_KEY.CIOT_APP_MANAGER_REQ);
          appManagerRequestQueue.put({
            "state": "stop",
            "serviceId": thisClient.service.serviceId
          })
            .then(function(result){
              resolve(result);
            })
            .catch(function(err){
              reject(err);
            });
        });
    }
    catch(ex) {
      debug(ex);
      reject(ex);
    }
  });
}



function _setGlobalAppData(name, data) {
  var thisClient = this;

  return new Promise(function (resolve, reject) {
    try {

      var openData = null;
      if(Array.isArray(thisClient.service.openData.global)) {
        openData = thisClient.service.openData.global.find((item)=>{
          if(item.name === name)
            return true;
          else
            return false;
        });
      }

      if(openData === null)
        throw Error('Invalid argument');

      thisClient.init()
        .then(function(thisClient){
          var openDataList = thisClient.globalDatabusClient.getMap(RESERVED_KEY.CIOT_OPENDATA_LIST);

          console.log( 'PUT GLOBAL OPEN DATA', openData.name, data );
          return openDataList.put(openData.name, data);
        })

        .then(function(result){
          console.log( result.toString() );
          resolve(result);
        })

        .catch(function (err) {
          debug(err);
          reject(err);
        });
    }
    catch(ex) {
      debug(ex);
      reject(ex);
    }
  });
}



function _setLocalAppData(name, data) {
  var thisClient = this;

  return new Promise(function (resolve, reject) {
    try {
      var openData = null;
      if(Array.isArray(thisClient.service.openData.local)) {
        openData = thisClient.service.openData.local.find((item)=>{
          if(item.name === name)
            return true;
          else
            return false;
        });
      }

      if(openData === null)
        throw Error('Invalid argument');

      thisClient.init()
        .then(function(thisClient){
          var openDataList = thisClient.localDatabusClient.getMap(RESERVED_KEY.CIOT_OPENDATA_LIST);
          return openDataList.put(openData.name, data);
        })

        .then(function(result) {
          resolve(result);
        })

        .catch(function (err) {
          debug(err);
          reject(err);
        });
    }
    catch(ex) {
      debug(ex);
      reject(ex);
    }
  });
}



function _getGlobalAppData(name) {
  var thisClient = this;

  return new Promise(function (resolve, reject) {
    try {
      var openData = null;
      if(Array.isArray(thisClient.service.openData.global)) {
        openData = thisClient.service.openData.global.find((item)=>{
          if(item.name === name)
            return true;
          else
            return false;
        });
      }

      if(openData === null)
        throw Error('Invalid argument');

      thisClient.init()
        .then(function(thisClient){
          var openDataList = thisClient.globalDatabusClient.getMap(RESERVED_KEY.CIOT_OPENDATA_LIST);
          return openDataList.get(openData.name);
        })

        .then(function(result) {
          resolve(result);
        })

        .catch(function (err) {
          debug(err);
          reject(err);
        });
    }
    catch(ex) {
      debug(ex);
      reject(ex);
    }
  });
}



function _getLocalAppData(name) {
  var thisClient = this;

  return new Promise(function (resolve, reject) {
    try {
      var openData = null;
      if(Array.isArray(thisClient.service.openData.local)) {
        openData = thisClient.service.openData.local.find((item)=>{
          if(item.name === name)
            return true;
          else
            return false;
        });
      }

      if(openData === null)
        throw Error('Invalid argument');


      thisClient.init()
        .then(function(thisClient){
          var openDataList = thisClient.localDatabusClient.getMap(RESERVED_KEY.CIOT_OPENDATA_LIST);
          return openDataList.get(openData.name);
        })

        .then(function(result) {
          resolve(result);
        })

        .catch(function (err) {
          debug(err);
          reject(err);
        });
    }
    catch(ex) {
      debug(ex);
      reject(ex);
    }

  });
}




function _getGlobalOpendata(name) {
  var thisClient = this;

  return new Promise(function (resolve, reject) {
    try {
      thisClient.init()
        .then(function(thisClient){
          var openDataList = thisClient.globalDatabusClient.getMap(RESERVED_KEY.CIOT_OPENDATA_LIST);
          return openDataList.get(name);
        })

        .then(function(result) {
          resolve(result);
        })

        .catch(function (err) {
          debug(err);
          reject(err);
        });
    }
    catch(ex) {
      debug(ex);
      reject(ex);
    }
  });
}




function _getLocalOpendata(name) {
  var thisClient = this;

  return new Promise(function (resolve, reject) {
    try {
      thisClient.init()
        .then(function(thisClient){
          var openDataList = thisClient.localDatabusClient.getMap(RESERVED_KEY.CIOT_OPENDATA_LIST);
          return openDataList.get(name);
        })

        .then(function(result) {
          resolve(result);
        })

        .catch(function (err) {
          debug(err);
          reject(err);
        });
    }
    catch(ex) {
      debug(ex);
      reject(ex);
    }
  });
}




function _subscribeToGlobalOpendata(key, listener) {
  var thisClient = this;

  return new Promise(function (resolve, reject) {
    try {
      thisClient.init()
        .then(function (thisClient) {
          var openDataList = thisClient.globalDatabusClient.getMap(RESERVED_KEY.CIOT_OPENDATA_LIST);
          if(openDataList) {
            var listenerList = thisClient.subscriptionList.local[key];
            if(typeof listenerList === 'undefined') {
              listenerList = [];
              thisClient.subscriptionList.local[key] = listenerList;
            }

            if( listenerList.indexOf(listener) == -1 ) {
              openDataList.addEntryListener(listener, key)

                .then(function(result) {
                  resolve(result);
                })

                .catch(function(err) {
                  debug(err);
                  reject(err);
                } );


            }
            else {
              resolve('');
            }
          }
          else {
            debug('key is not exists');
            reject('key is not exists');
          }
        })
        .catch(function (err) {
          debug( err );
          reject(err);
        });
    }
    catch (ex) {
      debug( ex );
      reject(ex);
    }

  });
}



function _subscribeToLocalOpendata(key, listener) {
  var thisClient = this;

  return new Promise(function (resolve, reject) {
    try {
      thisClient.init()
        .then(function (thisClient) {
          var openDataList = thisClient.localDatabusClient.getMap(RESERVED_KEY.CIOT_OPENDATA_LIST);
          if(openDataList) {
            var listenerList = thisClient.subscriptionList.local[key];
            if(typeof listenerList === 'undefined') {
              listenerList = [];
              thisClient.subscriptionList.local[key] = listenerList;
            }

            if( listenerList.indexOf(listener) == -1 ) {
              openDataList.addEntryListener(listener, key)
                .then(function(result){
                  resolve( result );
                })
                .catch(function(err){
                  debug(err);
                  reject(err);
                });
            }
            else {
              resolve('');
            }
          }
          else {
            debug('key is not exists');
            reject('key is not exists');
          }
        })
        .catch(function (err) {
          debug( err );
          reject(err);
        });
    }
    catch (ex) {
      debug( ex );
      reject(ex);
    }

  });
}


function _unsubscribeToGlobalOpendata(key, listener) {
  throw new Error('not implemented yet');
}


function _unsubscribeToLocalOpendata(key, listener) {
  throw new Error('not implemented yet');
}


/**
 * Expose 'CiotDatabusClient'
 */
module.exports = CiotDatabusClient;

