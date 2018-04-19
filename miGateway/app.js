var BlynkLib = require('blynk-library');
var blynk = new BlynkLib.Blynk('7bb7485f6eba41a0a36de66a90ed8ea1');
var v1 = new blynk.VirtualPin(1);
var v20 = new blynk.VirtualPin(20);
var str = "sdfsdfs";
v20.on('write', function (param) {
    console.log('V1:', param);
});
v20.on('read', function () {
    v20.write(new Date().getSeconds());
});
//# sourceMappingURL=app.js.map