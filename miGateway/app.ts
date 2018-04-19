const BlynkLib = require('blynk-library');
const miio = require('miio');

// Gateway stuff
let gateway: any;
let plug: any;
let button: any;
let sensorHT: any;

// Blynk stuff
let blynk: any;
let v20: any;
let testPin: any;

const initGateway = async () => {
    gateway = await miio.device({ address: '192.168.1.70' })
    console.log(gateway);

    plug = gateway.child('miio:158d00020f23d5');
    button = gateway.child('miio:158d00020fecb9');
    sensorHT = gateway.child('miio:158d0001c2a921');

    console.log(plug);
    for (const child of gateway.children()) {
        console.log(child.id);
        console.log(child);
        //if (child.matches('cap:actions')) {
        //    const actions = await child.actions();
        //    console.log(actions);
        //}
        if (child.matches('cap:temperature')) {
            const temperature = await child.temperature();
            console.log('Temperature:', temperature.celsius);
        }
        //plug = gateway.child(child.id);
    }
    //console.log(plug);
}

const plugTurn = async (on: boolean) => {
    if (on) {
        console.log("plug.turnOn();");
        plug.turnOn();
    }
    else {
        console.log("plug.turnOff();");
        plug.turnOff();
    }
}

const initBlynk = async () => {
    blynk = await new BlynkLib.Blynk('7bb7485f6eba41a0a36de66a90ed8ea');
    v20 = await new blynk.VirtualPin(20);
    testPin = await new blynk.VirtualPin(17);
}

const testBlynk = async () => {
    console.log("testBlynk");

    testPin.write(1);
}

const initEvents = async () => {
    console.log("->initEvents");
    v20.on('write', function (param) {
        console.log('V20:', param);
        if (param == 0)
            plugTurn(false);
        if (param == 1)
            plugTurn(true);
    });

    v20.on('read', function () {
        v20.write(new Date().getSeconds());
    });

    blynk.on('connect', function () {
        console.log("Blynk ready.");
        testBlynk();
    });
    console.log("initEvents->");


   // button.on('action:click', event => console.log('Action', event.action, 'with data', event.data));
   // sensorHT.on('temperatureChanged', temp => console.log('Temp changed to:', temp));
}

const run = async () => {
    //await initGateway();
    await initBlynk();
    //await testBlynk();
    await initEvents();
    console.log("run->");

    //await plugTurnOn();
}

run().catch(err => {
    console.log(err);
})