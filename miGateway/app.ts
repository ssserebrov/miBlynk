const blynkLib = require("blynk-library");
const miio = require("miio");
const config = require('config');
const request = require('request');

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
let leakageSensor1: any;
let leakageSensor2: any;
let leakageSensor3: any;
let isArmed: boolean = false;

// Blynk stuff
let blynk: any;
let plugRelayPin: any;
let plugRelayStatusPin: any;
let wallSwitch1RelayPin: any;
let plugRelayStatus: any;
let tempPin: any;
let humPin: any;
let bridgeTempPin: any;
let bridgeHumPin: any;
let testPin: any;
let magnetPin: any;
let armingPin: any;
let terminal1: any;

class SmsNotifier {
    name: string;
    token: string;

    init(name: string, token: string): void {
        this.name = name;
        this.token = token;
    }

    sendMessage(message: string, user: string): void {
        if (message === undefined) {
            return;
        }
        message = message.replace("+", "%2B");
        let url: string = `http://sms.ru/sms/send?api_id=${this.token}&to=${user}&text=${message}`;

        request(url, {json: true}, (err, res, body) => {
            if (err) {
                logToBlynkTerminal("[SY]", "Sms error")
                return console.log(err);
            } else {
                logToBlynkTerminal("[SY]", "Sms sent")
            }

        });
    }
}

let smsNotifier: SmsNotifier = new SmsNotifier();
smsNotifier.init("sms", config.get('smsKey'));

const initGateway = async () => {
    gateway = await miio.device({address: '192.168.1.70'});
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
            const battery = await child.batteryLevel();
            console.log('Current battery level:', battery);
            logMiToBlynk(battery);
        }
    }

    console.log("Gateway ready!");
};


// blynk virtual pins mapping:
// sensors:
// 01 - temperature
// 02 - humidity
// 05 - bridge temperature
// 06 - bridge humidity
// executive devices:
// 10 - plug #1
// 11 - wall switch #1
// 12 - wall switch #2
// executive devices statuses:
// 20 - plug #1
// 21 - wall switch #1 status
// 22 - wall switch #2 status
// others:
// 30 - terminal
// 31 - gateway arming

const initBlynk = async () => {
    blynk = await new blynkLib.Blynk(config.get('blynkKey'));
    tempPin = await new blynk.VirtualPin(1);
    humPin = await new blynk.VirtualPin(2);
    bridgeTempPin = await new blynk.VirtualPin(5);
    bridgeHumPin = await new blynk.VirtualPin(6);
    plugRelayPin = await new blynk.VirtualPin(10);
    plugRelayStatusPin = await new blynk.VirtualPin(20);
    testPin = await new blynk.VirtualPin(17);
    terminal1 = await new blynk.WidgetTerminal(30);
    armingPin = await new blynk.VirtualPin(31);

    blynk.on('connect', function () {
        console.log("BL: Ready!");
        logBlynkToBlynk("Ready!");
        blynk.syncVirtual(31)
    });

    blynk.on('error', (err) => {
        console.error('whoops! there was an error');
    });


};

const testBlynk = async () => {
    console.log("testBlynk");

    testPin.write(1);
};

function connectXiaomiRelayWithBlynkButtonAndLed(relay: any, button: any, led: any) {
    relay.on('stateChanged', (change, thing) => {
        let onLabel: string = "ON";
        let offLabel: string = "OFF";
        let waitLabel: string = "...";

        if (change.key == "power") {
            if (!change.value) {
                blynk.setProperty(button.pin, "onLabel", waitLabel);
                blynk.setProperty(button.pin, "offLabel", offLabel);
                button.write(0);
                led.write(0);
                logMiToBlynk("Relay turned off");
            } else {
                blynk.setProperty(button.pin, "onLabel", onLabel);
                blynk.setProperty(button.pin, "offLabel", waitLabel);
                button.write(1);
                led.write(1);
                logMiToBlynk("Relay turned on");
            }
        }
    });

    button.on('write', function (param) {
        if (param == 0) {
            logBlynkToBlynk("Turn relay off");
            relay.turnOff();
        }
        if (param == 1) {
            logBlynkToBlynk("Turn relay on");
            relay.turnOn();
        }
    });
}

function connectMagnetWithBlynk(magnet: any) {
    magnet.on('stateChanged', (change, thing) => {
        if (change.key == "contact") {
            console.log(thing, 'changed state:', change);
            if (!change.value) {
                logMiToBlynkPush("Door opened");
                logMiToBlynk("Door opened");
                if (isArmed) {
                    smsNotifier.sendMessage("XM: Door opened", "79829112723")
                }
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
                logMiToBlynk("Fire!");
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
                logMiToBlynk("Leakage!");
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

function initBridge() {
    bridgeTempPin.on('write', function (param) {
        bridgeTempPin.write(param);
    });
    bridgeHumPin.on('write', function (param) {
        bridgeHumPin.write(param);
    });
}

const initEvents = async () => {
    console.log("->initEvents");

    connectXiaomiRelayWithBlynkButtonAndLed(plug, plugRelayPin, plugRelayStatusPin);
    connectMagnetWithBlynk(magnet);
    connectTempHumSensorWithBlynk(sensorHT, tempPin, humPin);


    armingPin.on('write', function (param) {
        if (param == 0) {
            logBlynkToBlynk("Disarmed");
            isArmed = false;
        }
        if (param == 1) {
            logBlynkToBlynk("Armed");
            isArmed = true;
        }
    });


    initBridge();
    //connectSmokeSensorWithBlynk(smokeSensor);
    //connectLeakageSensorWithBlynk(leakageSensor);
};

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
};

const run = async () => {
    await initBlynk();
    await initGateway();
    //await testBlynk();
    await initEvents();
    await initDebugEvents();
    // logTempTask.start();
    // logTemp();
    console.log("run->");
};

const logTemp = async () => {
    const temperature = await sensorHT.temperature();
    const t = temperature.value;

    console.log('Temperature:', t);

    tempPin.write(t);

};

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
        if (!device) return;

        device.destroy();
        delete devices[reg.id];
    })
}

function logBlynkToBlynk(message: string) {
    logToBlynkTerminal("[BL]", message)
}

function logMiToBlynk(message: string) {
    logToBlynkTerminal("[MI]", message)
}

function logToBlynkTerminal(sender: string, message: string) {
    const now = new Date();

    let options = {year: '2-digit', month: '2-digit', day: '2-digit'};
    let datestamp = now.toLocaleString('ru-RU', options);

    let options2 = {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false};
    let timestamp = now.toLocaleString('ru-RU', options2);

    let logMessage = `${timestamp} ${datestamp} ${sender}: ${message}\n`;

    terminal1.write(logMessage);
}

function logMiToBlynkPush(message: string) {
    blynk.notify(`[MI]: ${message}`);
}
