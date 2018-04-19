let BlynkLib = require('blynk-library');

let blynk : any = new BlynkLib.Blynk('7bb7485f6eba41a0a36de66a90ed8ea1');
let v1 : any = new blynk.VirtualPin(1);
let v20: any = new blynk.VirtualPin(20);

let str: string = "sdfsdfs";


v20.on('write', function (param) {
    console.log('V1:', param);
});

v20.on('read', function () {
    v20.write(new Date().getSeconds());
});