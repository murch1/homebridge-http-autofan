var Service, Characteristic;
var request = require("superagent");
var http = require('http');

// Require and instantiate a cache module
var cacheModule = require("cache-service-cache-module");
var cache = new cacheModule({storage: "session", defaultExpiration: 60});

// Require superagent-cache-plugin and pass your cache module
var superagentCache = require("superagent-cache-plugin")(cache);

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-httpautofan", "http-autofan", HttpAutofan);
}

function HttpAutofan(log, config) {
    this.log = log;

    // Configuration
    this.name            = config["name"];
    this.acc_name		 = config["acc_name"];
    // Accessory information
    this.manufacturer    = config["manufacturer"] || "MurchHome";
    this.model           = config["model"] || "MurchAcc";
    this.serial          = config["serial"] || "AAA001";
    // Temperature
    this.temperature     = config["temperature"] || 1;
    this.temp_PV         = config["temp_PV"];
    this.temp_SPW        = config["temp_SPW"];
    this.temp_SPR        = config["temp_SPR"];
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
    var param = 'raddr=' + addr + '&rtype=' + type;
	sendData(param, function(res) {
		callback(res);
	});
}

function getSetData(raddr, rtype, waddr, wtype, wmode, write, callback) {
	var param = 'write=' + write + '&waddr=' + waddr + '&wtype=' + wtype + '&wmode=' + wmode + '&raddr=' + raddr + '&rtype=' + rtype;
	sendData(param, function(res) {
		callback(res);
	});		
}

function sendData(param, callback) {
	var req = null;
	var options = {
        	hostname: '127.0.0.1',          // NodeRED local HTTP server
        	port: '1880',                   // NodeRED port
        	path: '/modbus?' + param,       // HTTP access point + parameters
        	method: 'GET',
        	timeout: 2500
  	};
	req = http.request(options, function (res) {
    	res.setEncoding('utf8');
    	res.on('data', function (chunk) {
			data = JSON.parse(chunk);
        	callback(data);
    	});
  	});
		req.on('error', function(e) {
			console.log('Problem with request: ' + JSON.stringify(e));
			callback(null);
		});
		req.end();
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
            getData(addr,'h',function(res) {
                if(res) {
                    var reading = parseFloat(res) / 10.0;
                    callback(null, reading);
                } else {
                    that.temperature.getCharacteristic(Characteristic.StatusFault).setValue(99);
				    callback(null,0);
                }
            });
        } else {
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
            getData(addr,'h',function(res) {
                if(res) {
                    var reading = parseInt(res);
                    callback(null, reading);
                } else {
                    that.humidity.getCharacteristic(Characteristic.StatusFault).setValue(99);
				    callback(null,0);
                }
            });
        } else {
            that.humidity.getCharacteristic(Characteristic.StatusFault).setValue(101);
		    callback(null,0);
        }
    },

    // Fan State Control
    getFanState: function(callback){
    	var that = this;
    	var addr = this.fan_PV;
        if (addr) {
            getData(addr,'h',function(res) {
                if(res !=null || res != undefined) {
                	var reading = parseInt(res);
                	if (reading > 0) {
                		callback(null,1);
                	} else {
                	 	callback(null,0);
                	}
                }
            });
        } else {
            callback(null,0);
        }
    },
    
    setFanState: function(fanState, callback){
    	var that = this;
		var addr = this.fan_PV;
		var state;
        if (addr) {
            getData(addr,'h',function(res) {
                if(res) {
                    	state = 1;
                    } else {
                    	state = 0;
                    }
				if(state != fanState) {
					if(fanState) {
						that.fan.getCharacteristic(Characteristic.RotationSpeed).setValue(2);
						callback(null);
					} else {
						that.fan.getCharacteristic(Characteristic.RotationSpeed).setValue(0);
						callback(null);
					}				
				} else {
					callback(null);
				}
			});
		} else {
			callback(null);
		}
	},

	// Fan Speed Control
    getFanSpeed: function(callback){    
    	var that = this;
    	var addr = this.fan_PV;
        if (addr) {
            getData(addr,'h',function(res) {
                if(res != null || res != undefined) {
                    var reading = parseInt(res);
                    callback(null, reading);
                } else {
                	callback(null,0);
                }
            });
        } else {
            callback(null,0);
        }
    },
    	
    setFanSpeed: function(fanSpeed, callback){
    	var that = this;
		var raddr = this.fan_PV;
		var waddr;
		if(fanSpeed > 3) {
			waddr = this.fan_SP[3];
		} else if (fanSpeed < 0) {
			waddr = this.fan_SP[0];
		} else {
			waddr = this.fan_SP[fanSpeed];
		}
		if (raddr && waddr) {
			getData(raddr,'h', function(res) {
				if(fanSpeed != parseInt(res)) {
					getSetData(raddr,'h',waddr,'c','mom',true,function(res) {
						that.fan.getCharacteristic(Characteristic.Active).getValue();
						that.fan.getCharacteristic(Characteristic.RotationSpeed).getValue();
						that.fan.getCharacteristic(Characteristic.TargetFanState).getValue();
						callback(null);
					});				
				} else {
					callback(null);
				}
			});
		} else {
			callback(null);
		}
    },

	// Fan Control Mode
	getAutoMan: function(callback){   
		var that = this; 
    	var addr = this.fan_autoPV;
        if (addr) {
            getData(addr,'c',function(res) {
                if(res != null || res != undefined) {
                	if(res === true) {
                		callback(null,1);
                	} else {
                		callback(null,0);
                	}
                } else {
                	callback(null,0);
                }
            });
        } else {
            callback(null,0);
        }
    },
	
    setAutoMan: function(autoManState, callback){
    	var that = this;
		var raddr = this.fan_autoPV;
		var waddr = this.fan_autoSP;
		var state;
		if(raddr && waddr) {
			getData(raddr,'c', function(res) {
				if(res != null || res != undefined) {
					if(res === true) {
						state = 1;
					} else {
						state = 0;
					}
					if(autoManState != state) {
						getSetData(raddr,'c',waddr,'c','mom',true,function(res) {
							that.fan.getCharacteristic(Characteristic.Active).getValue();
							that.fan.getCharacteristic(Characteristic.RotationSpeed).getValue();
							that.fan.getCharacteristic(Characteristic.TargetFanState).getValue();
							callback(null);
						});
					}
				} else {
					callback(null);
				}				
			});
		} else {
			callback(null);
		}
    },
    
	// Fan Temperature Setpoint
    getTempSP: function(callback){
    	var that = this;
    	var addr = this.temp_SPR;
    	if(addr) {   
			getData(addr,'h',function(res) {
				var reading = parseFloat(res) / 10.0;
				callback(null, reading);	
			});
		} else {
			callback(null, 0);
		}
    },
    
    setTempSP:  function(targetTemp, callback) {
    	var that = this;
		var raddr = this.temp_SPR;
		var waddr = this.temp_SPW;
		if(raddr && waddr) {
			getData(raddr,'h',function(res) {
				if(targetTemp != (parseFloat(res) / 10.0)) {
					getSetData(raddr,'h',waddr,'h','set',parseInt(targetTemp * 10),function(res) {
						that.fan.getCharacteristic(Characteristic.TargetTemperature).getValue();
						callback(null);
					});
				} else {
					callback(null);
				}
			});
		} else {
			callback(null);
		}
    },
    

    getServices: function () {
        var services = [], informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);
        services.push(informationService);

        if (this.temperature) {
            var temperatureService = new Service.TemperatureSensor(this.acc_name + ' Temperature');
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
            var humidityService = new Service.HumiditySensor(this.acc_name + ' Humidity');
            humidityService
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .setProps({ minValue: 0, maxValue: 100 })
                .on("get", this.getHumidity.bind(this));
//            humidityService
//		.getCharacteristic(Characteristic.StatusFault)
//		.on('set', this.setStatusFault.bind(this));
            this.humidity = humidityService;
            services.push(this.humidity);
        }
        
        if(this.fan) {
			var fanService = new Service.Fanv2(this.acc_name + ' Fan');
			fanService
				.getCharacteristic(Characteristic.Active)
				.on('get', this.getFanState.bind(this))
				.on('set', this.setFanState.bind(this))
			fanService
				.getCharacteristic(Characteristic.RotationSpeed)
				.on('get', this.getFanSpeed.bind(this))
				.on('set', this.setFanSpeed.bind(this))
			fanService
				.getCharacteristic(Characteristic.TargetFanState)
				.on('get', this.getAutoMan.bind(this))
				.on('set', this.setAutoMan.bind(this))
			fanService
				.getCharacteristic(Characteristic.TargetTemperature)
				.on('get', this.getTempSP.bind(this))
				.on('set', this.setTempSP.bind(this))
			this.fan = fanService;
			services.push(this.fan);
		}

        return services;
    }
};
