var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const blynkLib = require("blynk-library");
const miio = require("miio");
const config = require('config');
const request = require('request');
// Gateway stuff
let gateway;
let plug;
let button;
let sensorHT;
let magnet;
let wallButtons;
let wallButton1;
let wallButton2;
let smokeSensor;
let leakageSensor;
// Blynk stuff
let blynk;
let plugPin;
let plugLed;
let tempPin;
let humPin;
let testPin;
let magnetPin;
let terminal1;
class SmsNotifier {
    init(name, token) {
        this.name = name;
        this.token = token;
    }
    sendMessage(message, user) {
        if (message === undefined) {
            return;
        }
        message = message.replace("+", "%2B");
        let url = `http://sms.ru/sms/send?api_id=${this.token}&to=${user}&text=${message}`;
        request(url, { json: true }, (err, res, body) => {
            if (err) {
                return console.log(err);
            }
        });
    }
}
let smsNotifier = new SmsNotifier();
smsNotifier.init("sms", config.get('smsKey'));
const initGateway = () => __awaiter(this, void 0, void 0, function* () {
    gateway = yield miio.device({ address: '192.168.1.70' });
    console.log(gateway);
    plug = gateway.child('miio:158d00020f23d5');
    button = gateway.child('miio:158d00020fecb9');
    sensorHT = gateway.child('miio:158d0001c2a921');
    magnet = gateway.child('miio:158d00022712f9');
    wallButtons = gateway.child('miio:158d0002458fc6');
    const children = wallButtons.children();
    wallButton1 = children.next().value;
    wallButton2 = children.next().value;
    //smokeSensor = gateway.child('miio:158d0002458fc6');
    //leakageSensor = gateway.child('miio:158d0002458fc6');
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
        if (child.matches('cap:children')) {
            //const firstOutlet = child.getChild('1'); // depends on the implementation
            //for (const grandchild of child.children) {
            //   // console.log('grandchild:', grandchild);
            //}
        }
        if (child.matches('cap:battery-level')) {
            console.log('Current battery level:', yield child.batteryLevel());
        }
    }
    console.log("Gateway ready!");
});
const initBlynk = () => __awaiter(this, void 0, void 0, function* () {
    blynk = yield new blynkLib.Blynk(config.get('blynkKey'));
    tempPin = yield new blynk.VirtualPin(15);
    humPin = yield new blynk.VirtualPin(16);
    plugPin = yield new blynk.VirtualPin(20);
    plugLed = yield new blynk.VirtualPin(21);
    testPin = yield new blynk.VirtualPin(17);
    terminal1 = yield new blynk.WidgetTerminal(10);
    blynk.on('connect', function () {
        console.log("Blynk ready!");
    });
    blynk.on('error', (err) => {
        console.error('whoops! there was an error');
    });
});
const testBlynk = () => __awaiter(this, void 0, void 0, function* () {
    console.log("testBlynk");
    testPin.write(1);
});
function connectRelayWithBlynkButton(relay, blynkButton) {
    relay.on('stateChanged', (change, thing) => {
        let onLabel = "ON";
        let offLabel = "OFF";
        let waitLabel = "...";
        if (change.key == "power") {
            if (!change.value) {
                blynk.setProperty(blynkButton.pin, "onLabel", waitLabel);
                blynk.setProperty(blynkButton.pin, "offLabel", offLabel);
                blynkButton.write(0);
            }
            else {
                blynk.setProperty(blynkButton.pin, "onLabel", onLabel);
                blynk.setProperty(blynkButton.pin, "offLabel", waitLabel);
                blynkButton.write(1);
            }
        }
    });
    blynkButton.on('write', function (param) {
        if (param == 0)
            relay.turnOff();
        if (param == 1)
            relay.turnOn();
    });
}
function connectMagnetWithBlynk(magnet) {
    magnet.on('stateChanged', (change, thing) => {
        if (change.key == "contact") {
            console.log(thing, 'changed state:', change);
            if (!change.value) {
                blynk.notify("Door open!");
                terminal1.write("Door open!\n");
            }
        }
    });
}
function connectSmokeSensorWithBlynk(smokeSensor) {
    smokeSensor.on('stateChanged', (change, thing) => {
        if (change.key == "contact") {
            console.log(thing, 'changed state:', change);
            if (!change.value) {
                blynk.notify("Fire!");
                terminal1.write("Fire!\n");
            }
        }
    });
}
function connectLeakageSensorWithBlynk(leakageSensor) {
    leakageSensor.on('stateChanged', (change, thing) => {
        if (change.key == "contact") {
            console.log(thing, 'changed state:', change);
            if (!change.value) {
                blynk.notify("Leakage!");
                terminal1.write("Leakage!\n");
            }
        }
    });
}
function connectTempHumSensorWithBlynk(sensor, blynkTemp, blynkHum) {
    sensor.on('temperatureChanged', temp => {
        console.log('Temp changed to:', temp.value);
        blynkTemp.write(temp.value);
    });
    sensor.on('relativeHumidityChanged', v => {
        console.log('Changed to:', v);
        blynkHum.write(v);
    });
}
const initEvents = () => __awaiter(this, void 0, void 0, function* () {
    console.log("->initEvents");
    connectRelayWithBlynkButton(wallButton1, plugPin);
    connectMagnetWithBlynk(magnet);
    connectTempHumSensorWithBlynk(sensorHT, tempPin, humPin);
    //connectSmokeSensorWithBlynk(smokeSensor);
    //connectLeakageSensorWithBlynk(leakageSensor);
});
const initDebugEvents = () => __awaiter(this, void 0, void 0, function* () {
    console.log("->initDebugEvents");
    button.on('action', action => console.log('Action occurred:', action));
    wallButton1.on('action', action => console.log('Action occurred:', action));
    wallButton1.on('stateChanged', (change, thing) => {
        console.log(thing, 'changed state:', change);
    });
});
const run = () => __awaiter(this, void 0, void 0, function* () {
    yield initGateway();
    yield initBlynk();
    //await testBlynk();
    yield initEvents();
    yield initDebugEvents();
    // logTempTask.start();
    // logTemp();
    console.log("run->");
});
const logTemp = () => __awaiter(this, void 0, void 0, function* () {
    const temperature = yield sensorHT.temperature();
    const t = temperature.value;
    console.log('Temperature:', t);
    tempPin.write(t);
});
// const cron = require('node-cron');
// var logTempTask = cron.schedule('*/1 * * * *', function () {
//     logTemp();
// });
//
run().catch(err => {
    console.log(err);
    console.log("CATCH!");
});
function discover() {
    const browser = miio.browse({
        cacheTime: 300 // 5 minutes. Default is 1800 seconds (30 minutes)
    });
    const devices = {};
    browser.on('available', reg => {
        if (!reg.token) {
            console.log(reg.id, 'hides its token');
            return;
        }
        // Directly connect to the device anyways - so use miio.devices() if you just do this
        reg.connect()
            .then(device => {
            devices[reg.id] = device;
            // Do something useful with the device
        })
            .catch();
    });
    browser.on('unavailable', reg => {
        const device = devices[reg.id];
        if (!device)
            return;
        device.destroy();
        delete devices[reg.id];
    });
}
//# sourceMappingURL=app.js.map