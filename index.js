var Service, Characteristic;
var request = require("superagent");

// Require and instantiate a cache module
var cacheModule = require("cache-service-cache-module");
var cache = new cacheModule({storage: "session", defaultExpiration: 60});

// Require superagent-cache-plugin and pass your cache module
var superagentCache = require("superagent-cache-plugin")(cache);

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-http-autofan", "http-autofan", HttpAutofan);
}

function HttpAutofan(log, config) {
    this.log = log;

    // Configuration
    this.name            = config["name"];
    // Accessory information
    this.manufacturer    = config["manufacturer"] || "MurchHome";
    this.model           = config["model"] || "DHT22";
    this.serial          = config["serial"] || "AAA001";
    // Temperature
    this.temperature     = config["temperature"] || 1;
    this.temp_PV         = config["temp_PV"];
    this.temp_SP         = config["temp_SP"];
    this.temp_alarm      = config["temp_alarm"];
    // Humidity
    this.humidity        = config["humidity"] || 0;
    this.hum_PV        	 = config["hum_PV"];
    this.hum_alarm       = config["hum_alarm"];
    // Fan
	this.fan             = config["fan"] || 0;
    this.fan_SP          = config["fan_SP"];
    this.fan_PV          = config["fan_PV"];
    this.fan_autoPV      = config["fan_autoPV"];
    this.fan_autoSP      = config["fan_autoSP"];
}

function getData(addr, type, callback) {
    var param = {"raddr": addr,
                 "rtype" : type};
	sendData(param, function(res) {
		callback(res);
	});
}

function getSetData(raddr,rtype,waddr,wtype,wmode,write) { 
	var param = {"raddr" : raddr,
                 "rtype" : rtype,
                 "waddr" : waddr,
                 "wtype" : wtype,
                 "wmode" : wmode,
                 "write" : write}
	sendData(param, function(res) {
		callback(res);
	});		
}

function sendData(param, callback) {
    request
        .get('http://127.0.0.1/modbus')
        .query(param)
        .end(function(err, res, key) {
            if (err) {
                console.log(`NODE-RED HTTP failure`);
                callback(null);
            } else {
                console.log(`HTTP success (${res})`);
                callback(res);
            }
         });
}

HttpAutofan.prototype = {

	temperature: undefined,
	humidity: undefined,
	fan: undefined,
    
    // Temperature Reading
    getTemperature: function(callback) {
        var that = this;
        var addr = this.temp_PV;
        var alarm = this.temp_alarm;
        if (addr && alarm) {
            console.log("Addr = " + addr + " Alarm = " + alarm);
            getData(addr,'h',function(res) {
                if(res) {
                    var reading = parseFloat(res) / 10.0;
                    console.log("Temperature = " + reading);
                    callback(null, reading);
                } else {
                    that.temperature.getCharacteristic(Characteristic.StatusFault).setValue(99);
				    callback(null,0);
                }
            });
        } else {
            console.log("Addr = " + addr + " Alarm = " + alarm);
            that.temperature.getCharacteristic(Characteristic.StatusFault).setValue(101);
		    callback(null,0);
        }
    },
 
    // Humidity Reading
    getHumidity: function(callback) {
        var that = this;
        var addr = this.hum_PV;
        var alarm = this.hum_alarm;
        if (addr && alarm) {
            console.log("Addr = " + addr + " Alarm = " + alarm);
            getData(addr,'h',function(res) {
                if(res) {
                    var reading = parseInt(res);
                    console.log("Humidity = " + reading);
                    callback(null, reading);
                } else {
                    that.humidity.getCharacteristic(Characteristic.StatusFault).setValue(99);
				    callback(null,0);
                }
            });
        } else {
            console.log("Addr = " + addr + " Alarm = " + alarm);
            that.humidity.getCharacteristic(Characteristic.StatusFault).setValue(101);
		    callback(null,0);
        }
    },
    

    getServices: function () {
        var services = [],
            informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);
        services.push(informationService);

        if (this.temperature) {
            var temperatureService = new Service.TemperatureSensor(this.name + ' Temperature');
            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({ minValue: -273.0, maxValue: 200.0 })
                .on("get", this.getTemperature.bind(this));
//            temperatureService
//	    	.getCharacteristic(Characteristic.StatusFault)
//		.on('set', this.setStatusFault.bind(this));
            this.temperature = temperatureService;
            services.push(this.temperature);
        }
        
        if (this.humidity) {
            var humidityService = new Service.HumiditySensor(this.name + 'Humidity');
            humidityService
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .setProps({ minValue: 0, maxValue: 100 })
                .on("get", this.getHumidityState.bind(this));
//            humidityService
//		.getCharacteristic(Characteristic.StatusFault)
//		.on('set', this.setStatusFault.bind(this));
            this.humidity = humidityService;
            services.push(this.humidityService);
        }

        return services;
    }
};
