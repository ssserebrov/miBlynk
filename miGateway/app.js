var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const BlynkLib = require('blynk-library');
const miio = require('miio');
// Gateway stuff
let gateway;
let plug;
let button;
let sensorHT;
// Blynk stuff
let blynk;
let plugPin;
let plugLed;
let tempPin;
let humPin;
let testPin;
const initGateway = () => __awaiter(this, void 0, void 0, function* () {
    gateway = yield miio.device({ address: '192.168.1.70' });
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
            const temperature = yield child.temperature();
            console.log('Temperature:', temperature.celsius);
        }
        //plug = gateway.child(child.id);
    }
    //console.log(plug);
});
const plugTurn = (on) => __awaiter(this, void 0, void 0, function* () {
    if (on) {
        console.log("plug.turnOn();");
        plug.turnOn();
    }
    else {
        console.log("plug.turnOff();");
        plug.turnOff();
    }
});
const plugToggle = () => __awaiter(this, void 0, void 0, function* () {
    plug.togglePower();
});
const initBlynk = () => __awaiter(this, void 0, void 0, function* () {
    blynk = yield new BlynkLib.Blynk('7bb7485f6eba41a0a36de66a90ed8ea1');
    tempPin = yield new blynk.VirtualPin(15);
    humPin = yield new blynk.VirtualPin(16);
    plugPin = yield new blynk.VirtualPin(20);
    plugLed = yield new blynk.VirtualPin(21);
    testPin = yield new blynk.VirtualPin(17);
});
const testBlynk = () => __awaiter(this, void 0, void 0, function* () {
    console.log("testBlynk");
    testPin.write(1);
});
const initEvents = () => __awaiter(this, void 0, void 0, function* () {
    console.log("->initEvents");
    plugPin.on('write', function (param) {
        console.log('V20:', param);
        if (param == 1)
            plugToggle();
    });
    //plugPin.on('write', function (param) {
    //    console.log('V20:', param);
    //    if (param == 0)
    //        plugTurn(false);
    //    if (param == 1)
    //        plugTurn(true);
    //});
    //    v20.on('read', function () {
    //        v20.write(new Date().getSeconds());
    //    });
    blynk.on('connect', function () {
        console.log("Blynk ready.");
        testBlynk();
    });
    plug.on('stateChanged', (change, thing) => {
        if (change.key == "power") {
            console.log(thing, 'changed state:', change);
            if (!change.value) {
                blynk.notify("Plug OFF");
                console.log("Plug OFF");
                plugLed.write(0);
                //plugPin.write(0);
            }
            else {
                blynk.notify("Plug ON");
                console.log("Plug ON");
                plugLed.write(255);
                //plugPin.write(1);
            }
        }
    });
    console.log("initEvents->");
    // button.on('action:click', event => console.log('Action', event.action, 'with data', event.data));
    sensorHT.on('temperatureChanged', temp => {
        console.log('Temp changed to:', temp.value);
        tempPin.write(temp.value);
    });
    sensorHT.on('relativeHumidityChanged', v => {
        console.log('Changed to:', v);
        humPin.write(v);
    });
});
const run = () => __awaiter(this, void 0, void 0, function* () {
    yield initGateway();
    yield initBlynk();
    //await testBlynk();
    yield initEvents();
    console.log("run->");
    //await plugTurnOn();
});
run().catch(err => {
    console.log(err);
});
//# sourceMappingURL=app.js.map