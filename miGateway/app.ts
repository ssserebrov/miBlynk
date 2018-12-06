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
let gateway: any;
let plug: any;
let button: any;
let sensorHT: any;
let magnet: any;
let wallButtons: any;
let wallButton1: any;
let wallButton2: any;
let smokeSensor: any;
let leakageSensor: any;

// Blynk stuff
let blynk: any;
let plugPin: any;
let plugLed: any;
let tempPin: any;
let humPin: any;
let testPin: any;
let magnetPin: any;
let terminal1: any;

const initGateway = async () => {
    gateway = await miio.device({ address: '192.168.1.70' })
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
            const temperature = await child.temperature();
            console.log('Temperature:', temperature.celsius);
        }
        if (child.matches('cap:children')) {
            //const firstOutlet = child.getChild('1'); // depends on the implementation
            //for (const grandchild of child.children) {
            //   // console.log('grandchild:', grandchild);
            //}
        }
        if (child.matches('cap:battery-level')) {
            console.log('Current battery level:', await child.batteryLevel());
        }
    }

    console.log("Gateway ready!");
}

const initBlynk = async () => {
    blynk = await new BlynkLib.Blynk('7bb7485f6eba41a0a36de66a90ed8ea1');
    tempPin = await new blynk.VirtualPin(15);
    humPin = await new blynk.VirtualPin(16);
    plugPin = await new blynk.VirtualPin(20);
    plugLed = await new blynk.VirtualPin(21);
    testPin = await new blynk.VirtualPin(17);
    terminal1 = await new blynk.WidgetTerminal(10);

    blynk.on('connect', function () {
        console.log("Blynk ready!");
    });

    blynk.on('error', (err) => {
        console.error('whoops! there was an error');
    });
}

const testBlynk = async () => {
    console.log("testBlynk");

    testPin.write(1);
}

function connectRelayWithBlynkButton(relay: any, blynkButton: any)
{
    relay.on('stateChanged', (change, thing) => {
        let onLabel: string = "ON";
        let offLabel: string = "OFF";
        let waitLabel: string = "...";

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

function connectMagnetWithBlynk(magnet: any) {
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
function connectSmokeSensorWithBlynk(smokeSensor: any) {
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
function connectLeakageSensorWithBlynk(leakageSensor: any) {
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
function connectTempHumSensorWithBlynk(sensor: any, blynkTemp: any, blynkHum: any) {
    sensor.on('temperatureChanged', temp => {
        console.log('Temp changed to:', temp.value);
        blynkTemp.write(temp.value);
    });

    sensor.on('relativeHumidityChanged', v => {
        console.log('Changed to:', v);
        blynkHum.write(v);
    });
}

const initEvents = async () => {
    console.log("->initEvents");

    connectRelayWithBlynkButton(wallButton1, plugPin);
    connectMagnetWithBlynk(magnet);
    connectTempHumSensorWithBlynk(sensorHT, tempPin, humPin);
    //connectSmokeSensorWithBlynk(smokeSensor);
    //connectLeakageSensorWithBlynk(leakageSensor);
}

const initDebugEvents = async () => {
    console.log("->initDebugEvents");

    button.on('action', action =>
        console.log('Action occurred:', action)
    );

    wallButton1.on('action', action =>
        console.log('Action occurred:', action)
    );

    wallButton1.on('stateChanged', (change, thing) => {
        console.log(thing, 'changed state:', change);
    });
}

const run = async () => {
    await initGateway();
    await initBlynk();
    //await testBlynk();
    await initEvents();
    await initDebugEvents();
    console.log("run->");
}

run().catch(err => {
    console.log(err);
    console.log("CATCH!");
})

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
        if (!device) return;

        device.destroy();
        delete devices[reg.id];
    })
}
//////////////////////*
//MiioDevice {
//    model = lumi.gateway.v3,
//        types = sensor, miio: gateway, miio,
//            capabilities = illuminance, state, children
//}
//MiioDevice {
//    model = lumi.plug,
//        types = sensor, power - outlet, power - plug, miio, miio: subdevice, sub - thing,
//            capabilities = power - consumed, power - load, switchable - power, restorable - state, power, state
//}
//miio: 78817862: light
//GatewayLight {
//    metadata:
//    Metadata {
//        types: Set { 'miio:subdevice', 'miio:gateway-light', 'light', 'sub-thing' },
//        capabilities:
//        Set {
//            'colorable',
//                'dimmable',
//                'brightness',
//                'switchable-power',
//                'restorable-state',
//                'power',
//                'state'
//        },
//        actions:
//        {
//            color: [Object],
//                setColor: [Object],
//                    brightness: [Object],
//                        setBrightness: [Object],
//                            increaseBrightness: [Object],
//                                decreaseBrightness: [Object],
//                                    power: [Object],
//                                        setPower: [Object],
//                                            togglePower: [Object],
//                                                turnOn: [Object],
//                                                    turnOff: [Object],
//                                                        restorableState: [Object],
//                                                            captureState: [Object],
//                                                                setState: [Object],
//                                                                    state: [Object]
//        },
//        state: { color: [Object], brightness: [Object], power: [Object] },
//        events:
//        {
//            colorChanged: [Object],
//                brightnessChanged: [Object],
//                    powerChanged: [Object],
//                        stateChanged: [Object]
//        },
//        parent: MiioDevice[lumi.gateway.v3],
//            [Symbol(thing)]: [Circular]
//    },
//    model: 'lumi.gateway.v3.light',
//        internalId: '78817862:light',
//            gateway: MiioDevice {
//        model = lumi.gateway.v3,
//            types = sensor, miio: gateway, miio,
//                capabilities = illuminance, state, children
//    },
//    [Symbol(eventQueue)]: [],
//        [Symbol(eventEmitter)]:
//    EventEmitter {
//        [Symbol(listeners)]: { 'thing:destroyed': [Array] },
//        [Symbol(anyListeners)]: [],
//            [Symbol(context)]: [Circular]
//    },
//    [Symbol(state)]:
//    {
//        power: false,
//            color: Color { values: [Array], model: 'rgb' },
//        brightness: 0
//    },
//    [Symbol(id)]: 'miio:78817862:light',
//        [Symbol(defId)]: 'miio:78817862:light',
//            [Symbol(isDestroyed)]: false,
//                [Symbol(isInitialized)]: true
//}
//miio: 158d00020fecb9
//MiioDevice {
//    model = lumi.switch,
//        types = button, controller, miio, miio: subdevice, sub - thing,
//            capabilities = battery - level, actions, state
//}
//Current battery level: -1
//miio: 158d0001d571da
//MiioDevice {
//    model = lumi.motion,
//        types = sensor, miio, miio: subdevice, sub - thing,
//            capabilities = battery - level, motion, state
//}
//Current battery level: -1
//miio: 158d00022712f9
//MiioDevice {
//    model = lumi.magnet,
//        types = sensor, miio, miio: subdevice, sub - thing,
//            capabilities = battery - level, contact, state
//}
//Current battery level: -1
//miio: 158d0001c2a921
//MiioDevice {
//    model = lumi.sensor_ht,
//        types = sensor, miio, miio: subdevice, sub - thing,
//            capabilities = relative - humidity, temperature, state
//}
//Temperature: 27.29
//miio: 158d00020f23d5
//MiioDevice {
//    model = lumi.plug,
//        types = sensor, power - outlet, power - plug, miio, miio: subdevice, sub - thing,
//            capabilities = power - consumed, power - load, switchable - power, restorable - state, power, state
//}
//miio: 158d000212f756
//MiioDevice {
//    model = lumi.generic.55,
//        types = miio, miio: subdevice, sub - thing,
//            capabilities =
//}
//miio: 158d0001b7d59e
//MiioDevice {
//    model = lumi.generic.15,
//        types = miio, miio: subdevice, sub - thing,
//            capabilities =
//}
//miio: 158d0002458fc6
//MiioDevice {
//    model = lumi.ctrl_neutral2,
//        types = miio: power -switch, miio, miio:subdevice, wall -switch, sub - thing,
//        capabilities = children
//}
//    Gateway ready!*/
//subdevices.js
// 12 : require('./86sw2'), 14 : require('./86sw1'),
