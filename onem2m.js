var uuid = require('uuid');
var Http = require('request-promise');
var _ = require('lodash');

var debug = console.log;






function OneM2MClient(options) {
  this.options = options || {};

  this.options['cbUrl'] = this.options.cbUrl || 'http://203.253.128.161:7579/Mobius/';

  this.options['aeName'] = this.options.aeName || 'ciot-sensor-demo';
  this.options['cntName'] = this.options.cntName || 'sensor-value';

  this.options['origin'] = this.options.origin || 'CIoTDemo';
}

OneM2MClient.prototype.readyToServe = _readyToServe;
OneM2MClient.prototype.getResource = _getResource;
OneM2MClient.prototype.createResource = _createResource;
OneM2MClient.prototype.createSensorData = _createSensorData;



OneM2MClient.TYPE_CODE_AE = "2";
OneM2MClient.TYPE_CODE_CNT = "3";
OneM2MClient.TYPE_CODE_CIN = "4";

//
// "acp" : "1",
//   "ae": "2",
//   "cnt": "3",
//   "cin": "4",
//   "cb": "5",
//   "grp": "9",
//   "lcp": "10",
//   // "mgo": "13",
//   // "nod": "14,
//   "csr": "16",
//   // "req": "17,
//   "sub": "23",
//   "smd": "24",
//   "ts": "25",
//   "tsi": "26",
//   "mms": "27",
//   "rsp": "99",
//   "sd": "24"



function _readyToServe() {
  var thisObj = this;

  //  create ae if not exists
  var aeUrl = thisObj.options.cbUrl + '/' + thisObj.options.aeName;
  var creator = thisObj.options.origin;

  return new Promise(function(resolve, reject){
    try {
      thisObj.getResource(aeUrl)
        .then(function(aeRes){
          return aeRes;
        }, function(err){
          var cbUrl = thisObj.options.cbUrl;
          var aeRes = {
            'm2m:ae': {
              "rn": thisObj.options.aeName,
              "api": "iotweekdemo.ciot.keti.re.kr",
              "lbl": ["KETI", "CIoT", "IoT Week", "Demo"],
              "rr": true
            }
          };
          return thisObj.createResource(cbUrl, OneM2MClient.TYPE_CODE_AE, aeRes);
        })

        .then(function(aeRes){
          return aeRes;
        }, function(err){
          console.log("ERROR: Fail to create AE resource:", err);
          reject(err);
        })

        .then(function(aeRes){
          var cntUrl = aeUrl + '/' + thisObj.options.cntName;

          return thisObj.getResource(cntUrl);
        })

        .then(function(cntRes){
          return cntRes;
        }, function(err){
          var cntRes = {
            'm2m:cnt': {
              "rn": thisObj.options.cntName,
              "lbl": ["DHT22 Sensor", "Temperature", "Humidity", "Sensor"]
            }
          };
          return thisObj.createResource(aeUrl, OneM2MClient.TYPE_CODE_CNT, cntRes);
        })

        .then(function(cntRes){
          resolve(true);
        }, function(err){
          console.log("ERROR: Fail to create CNT resource:", err);
          reject(err);
        })

        .catch(function(ex){
          console.log("ERROR: Fail to create AE resource:", ex);
          reject(err);
        });

    }
    catch(ex) {
      console.log("ERROR: Fail to ready service:", ex);

      reject(ex);
    }
  });



  //  create container if not exists


}


function _createSensorData(sensorData) {
  var thisObj = this;

  //  create ae if not exists
  var cntUrl = thisObj.options.cbUrl + '/' + thisObj.options.aeName + '/' + thisObj.options.cntName;
  var creator = this.options.origin;

  return new Promise(function(resolve, reject){
    try {
      var cntData = {
        'm2m:cin': {
          "con": sensorData
        }
      };

      thisObj.createResource(cntUrl, OneM2MClient.TYPE_CODE_CIN, cntData)
        .then(function(cinRes){
          resolve(cinRes);
        })

        .catch(function(ex){
          console.log("ERROR: Fail to create CIN resource:", ex);

          reject(ex);
        });
    }
    catch(ex) {
      console.log("ERROR: Fail to create sensor data", ex);

      reject(ex);
    }
  });

}

function _getResource(resourceUrl, origin) {

  var creator = origin || this.options.origin;

  return new Promise(function(resolved, rejected) {

    var options = {
      method: 'GET',
      uri: resourceUrl,
      headers: {
        "Accept": "application/json",
        "nmtype": "short",
        "X-M2M-RI": uuid.v4(),
        "X-M2M-Origin": creator
      },
      json: true
    };

    Http(options)
      .then(function(result) {
        resolved(result);
      })
      .catch(function(error) {
        debug('ERROR: Fail to get resource:', error.message);
        rejected(error);
      });
  });
}


function _createResource(parentResourceUrl, typeCode, resource, origin) {

  var creator = origin || this.options.origin;

  return new Promise(function(resolved, rejected) {

    var resourceType = _.keys(resource)[0];
    var resourceTypeCode = typeCode;

    var options = {
      method: 'POST',
      uri: parentResourceUrl,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/vnd.onem2m-res+json;ty="+resourceTypeCode,
        "X-M2M-RI": uuid.v4(),
        "X-M2M-Origin": creator
      },
      body: resource,
      json: true
    };

    Http(options)
      .then(function(result) {
        resolved(result);
      })
      .catch(function(error) {
        debug('ERROR: Fail to create resource:', error.message);
        rejected(error);
      });
  });
}



/**
 * Expose 'CiotDatabusClient'
 */
module.exports = OneM2MClient;

