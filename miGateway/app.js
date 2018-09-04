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
//class Rig extends events.EventEmitter {
//    name: string;
//    ip: string;
//    port: number;
//    tempLimit: number = 78;
//    private _stat: Stat;
//    private _temp: number;
//    get temp(): number {
//        return this._temp;
//    }
//    set temp(temp: number) {
//        this._temp = temp;
//        this.isCriticalTemp = (!this.isCriticalTemp && this._temp >= this.tempLimit) ||
//            (this.isCriticalTemp && this._temp >= this.tempLimit - 8);
//    }
//    private _isCriticalTemp: boolean = false;
//    get isCriticalTemp(): boolean {
//        return this._isCriticalTemp;
//    }
//    set isCriticalTemp(isCriticalTemp: boolean) {
//        if (isCriticalTemp == this._isCriticalTemp) {
//            return;
//        }
//        this._isCriticalTemp = isCriticalTemp;
//        this.emit('criticalTempStatusChanged')
//    }
//    private _isOnline: boolean = true;
//    get isOnline(): boolean {
//        return this._isOnline;
//    }
//    set isOnline(isOnline: boolean) {
//        if (isOnline == this._isOnline) {
//            return;
//        }
//        this._isOnline = isOnline;
//        this.emit('onlineStatusChanged')
//    }
//    updateRigStatus(stat: Stat) {
//        this._stat = stat;
//        this.temp = Math.max.apply(null, stat.temps);
//    }
//    toString() {
//        console.log(this.name);
//        console.log(this._stat.hashRate);
//        console.log(this._stat.temps);
//        let msg: string = this.name + ": " + this._temp + ";";
//        return msg;
//    }
//    constructor(name: string, ip: string, port: number) {
//        super();
//        this.name = name;
//        this.ip = ip;
//        this.port = port;
//    }
//}
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
const initGateway = () => __awaiter(this, void 0, void 0, function* () {
    gateway = yield miio.device({ address: '192.168.1.70' });
    console.log(gateway);
    plug = gateway.child('miio:158d00020f23d5');
    button = gateway.child('miio:158d00020fecb9');
    sensorHT = gateway.child('miio:158d0001c2a921');
    magnet = gateway.child('miio:158d00022712f9');
    wallButtons = gateway.child('miio:158d0002458fc6');
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
        //if (child.matches('cap:children')) {
        //    for (const grandchild of child.children) {
        //        console.log('grandchild:', grandchild);
        //    }
        //}
        if (child.matches('cap:battery-level')) {
            console.log('Current battery level:', yield child.batteryLevel());
        }
    }
    console.log("Gateway ready!");
});
const initBlynk = () => __awaiter(this, void 0, void 0, function* () {
    blynk = yield new BlynkLib.Blynk('7bb7485f6eba41a0a36de66a90ed8ea1');
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
    connectRelayWithBlynkButton(plug, plugPin);
    connectMagnetWithBlynk(magnet);
    connectTempHumSensorWithBlynk(sensorHT, tempPin, humPin);
    //connectSmokeSensorWithBlynk(smokeSensor);
    //connectLeakageSensorWithBlynk(leakageSensor);
});
const initDebugEvents = () => __awaiter(this, void 0, void 0, function* () {
    button.on('action', action => console.log('Action occurred:', action));
    //  wallButton1 = wallButtons.getChild('1');
    //  wallButton2 = wallButtons.getChild('2');
    //wallButton1.on('action', action =>
    //    console.log('Action occurred:', action)
    //);
});
const run = () => __awaiter(this, void 0, void 0, function* () {
    yield initGateway();
    yield initBlynk();
    //await testBlynk();
    yield initEvents();
    yield initDebugEvents();
    console.log("run->");
});
run().catch(err => {
    console.log(err);
    console.log("CATCH!");
});
//# sourceMappingURL=app.js.map