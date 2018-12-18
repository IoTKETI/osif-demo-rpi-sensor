var GPIO = require('onoff').Gpio;

//
//  'onoff' library use BCM pin number
//
var ledRPinBCM    = 18;    //  Phy 12, wPi 1, BCM 18
var ledGPinBCM    = 17;    //  Phy 11, wPi 0, BCM 17
var ledBPinBCM    = 27;    //  Phy 13, wPi 2, BCM 27
var buttonPinBCM  = 22;    //  Phy 15, wPi 3, BCM 22


var ledR = new GPIO(ledRPinBCM, 'out');
var ledG = new GPIO(ledGPinBCM, 'out');
var ledB = new GPIO(ledBPinBCM, 'out');
var button = new GPIO(buttonPinBCM, 'in', 'both');

var ledState = 0;

function onButtonPushed(err, state) {

    if(state === 0) {
        ledState = (ledState+1)%4;

		light(ledState);
	}
	else {
		return;
	}



}

function light(ledState) {

	console.log( "LIGHT: ", ledState)

  switch(ledState) {
    case  0:
      ledR.writeSync(1);
      ledG.writeSync(1);
      ledB.writeSync(1);
      break;

    case  1:
      ledR.writeSync(0);
      ledG.writeSync(1);
      ledB.writeSync(1);
      break;

    case  2:
      ledR.writeSync(1);
      ledG.writeSync(0);
      ledB.writeSync(1);
      break;

    case  3:
      ledR.writeSync(1);
      ledG.writeSync(1);
      ledB.writeSync(0);
      break;
  }
}

light(0);

console.log('start');
button.watch(onButtonPushed);



process.on('SIGINT', function () {
    console.log( 'exit');
   process.exit(0);
});
process.on('SIGTERM', function () {
  console.log( 'exit');
   process.exit(0);
});
