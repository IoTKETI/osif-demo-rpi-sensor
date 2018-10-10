var sensor = require('node-dht-sensor');
var request = require('request');
var OneM2MClient = require('./onem2m.js');

var OSIFClient = require('osif-client').Client;

var dhtSensorPinPHY   = 22;    //  Phy 15, wPi 3, BCM 22
var SENSOR_TYPE       = 22;   //  22: DHT22 or AM2302, 11: DHT11
var LED_OFF           = 0;

var INTERVAL          = 1000;



var serviceOptions = require('./ciotservice.json');
var oneM2MOptions = require('./onem2m.json');
var client1 = new OSIFClient(serviceOptions);
var oneM2MClient = new OneM2MClient(oneM2MOptions);

var ledState = LED_OFF;

var g_sensorControlFlag = true;

var sensorInterval = null;


function readSensorValue() {

  sensor.read(SENSOR_TYPE, dhtSensorPinPHY, function(err, temperature, humidity) {
    if (!err) {
      var sensorData = {
        "t": temperature.toFixed(1),
        "h": humidity.toFixed(1)
      };

      console.log('temp: ', sensorData.t, '°C, ', 'humidity: ', sensorData.h, '%');


      oneM2MClient.createSensorData(sensorData)
        .then(function(){
          if(g_sensorControlFlag ) {
            console.log( "setLocalAppData:", sensorData );
            return client1.setLocalAppData('iotweek-sensor-value', sensorData);
          }

          else {
            return true;
          }
        });
    }
  });

}

function serviceStart() {


  oneM2MClient.readyToServe()
    .then(function(res) {


      return client1.startService();

    })

    .then(function() {

      return client1.getGlobalOpendata('iotweek-sensor-control');

    })

    .then(function(value){

      g_sensorControlFlag = value || false;


      var listener = {
        'updated':     function listener(key) {

          client1.getGlobalOpendata(key)
            .then((value)=>{
              g_sensorControlFlag = value;

            })
        }
      };

      client1.subscribeToGlobalOpendata('iotweek-sensor-control', listener);

      return true;
    })

    .then(function(){
      sensorInterval = setInterval(()=>{
        readSensorValue();
      }, INTERVAL);

    })

    .catch(function(ex){
      console.log( "FAIL TO START SERVICE", ex );
    });

  console.log('Service start...');
}


function serviceShutdown() {

  clearInterval(sensorInterval);
  process.exit(0);

/*
  client1.stopService()
    .then((result)=>{

      process.exit(0);
    });
*/


}

process.on('SIGINT', function () {
    serviceShutdown();
});
process.on('SIGTERM', function () {
    serviceShutdown();
});




//
serviceStart();