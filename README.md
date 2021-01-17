# homebridge-http-autofan

A fan accessory for [Homebridge](https://github.com/nfarina/homebridge). This fan can be controlled manually by entering 1 of four speed settings (Stop [0] - Slow [1] - Med [2] - High [3]). Alternativley, by pressing the AUTO switch, the speed of the fan will be controlled by the ambient temperature. This fan is used to cool the room, so any temperature at or below the setpoint will stop the fan until it is started by the user again.

This accessory is purely a front end GUI. There's a few other components in the background that make it all come together:
* a HTTP server running on Node-RED - receives HTTP messages from homebridge. This message then gets traslated in to Modbus communucation.
* PLC receives communication and performs action and supplies feedback back to user.
* PLC digital outputs control ceiling fan.

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: ` npm install git://github.com/murch1/homebridge-http-autofan.git`
3. Edit ...node_modules/homebridge/node_modules/hap-nodejs/dist/lib/Characteristic.d.ts
```	
	export declare const enum Units {
	    CELSIUS = "celsius",
	    PERCENTAGE = "percentage",
	    ARC_DEGREE = "arcdegrees",
	    LUX = "lux",
	    SECONDS = "seconds",
	    SPEED = "speed"
	}
```
4. Edit ...node_modules/homebridge/node_modules/hap-nodejs/dist/lib/Characteristic.js
```	
	var Units;
	(function (Units) {
    	Units["CELSIUS"] = "celsius";
    	Units["PERCENTAGE"] = "percentage";
    	Units["ARC_DEGREE"] = "arcdegrees";
    	Units["LUX"] = "lux";
    	Units["SECONDS"] = "seconds";
    	Units["SPEED"] = "speed";
	})(Units = exports.Units || (exports.Units = {}));
```
5. The properties are already set in index.js to be
```	
	fanService
	.getCharacteristic(Characteristic.RotationSpeed)
	.setProps({ minValue: 0, maxValue: 3, minStep: 1 })
	.on('get', this.getFanSpeed.bind(this))
	.on('set', this.setFanSpeed.bind(this))
```
If you make the changes in sets 3 and 4, you can adjust the .setProps line to look like this:
```	
	.setProps({ unit: "SPEED", minValue: 0, maxValue: 3, minStep: 1 })
```    
6. Update your configuration file. See `sample-config.json` in this repository for a sample.

# Configuration

Sample configuration:

```
"accessories": [
	{
	    "accessory":      "http-autofan",
	    "name": 	      "Family Environment",
	    "acc_name":       "Family",
	    "host":           "192.168.1.100", // Defaults to 127.0.0.1 if not defined
	    "manufacturer":   "Home",
	    "model": 	      "Fan 2",
	    "serial": 	      "FN0001",
	    "temperature":    1,
              "temp_PV" :     "6",
              "temp_SPW" :    "401",
              "temp_SPR":     "301",
              "temp_alarm" :  "16691",
	    "humidity":       1,
              "hum_PV" :      "5",
              "hum_alarm" :   "16690",
	    "fan": 	      1,
              "fan_SP" :      ["16398", "16395", "16396", "16397"],
              "fan_PV" :      "300",
              "fan_autoPV" :  "16998",
              "fan_autoSP" :  "16399",
	    "timeout": 	      "2500"
	}
]
```
The example above is for the PLC cabinet. It has a DHT22 temperature and humidity sensor in it, but no fan. 
Set `temperature`,`humidity` or `fan` to either 1 (for enable) or 0 (for disable).
If no setting is entered for any of these, it will default to `temperature` only. For any characteristic you enable, you will need to provide the modbus addresses that relate to that function in the PLC. If the PLC generates an alarm (in my case, a failure alarm), this status can be made visible next to the characteristic inside the app.

# Modbus address settings
*    temp_PV = temperature process variable (reading) (x10) - *integer (holding register)* - the PLC will need to provide 24.5 as 245. The decimal point will be added in this accessory code.
*    temp_SPW = temperature set point write (x10) - *integer (holding register)* - the PLC will recieve the temperature as 245 from this accessory code.
*    temp_SPR = temperature set point read (x10) - *integer (holding register)* - the temperature setpoint is written to a different register than it is read from. There are some boundary checks that happen in the PLC before it is accepted as a valid setpoint input. The setpoint "read" register is the value accepted by the PLC as the setpoint. 
*    temp_alarm = temperature failure alarm - *bool (coil)* - the alarm will be shown in HomeKit as StatusFault value 1.
*    hum_PV = humidity process variable (reading) - *integer (holding register)* - No decimal points used in humidity.
*    hum_alarm = humidity failure alarm - *bool (coil)* - the alarm will be shown in HomeKit as StatusFault value 1.
*    fan_SP = fan speed setpoint - *bool[4] = [off,low,med,high] (coil)* - the fan speed setpoint uses 4 digital pulses that manually set the fan speed. It's programmed like this in the PLC so it can use the 4 position rotary switch on the wall as a speed reference as well (for those times you want to set the fan speed like a cave man).
*    fan_PV = fan rotation speed feedback - *integer (holding register)* - values 0 to 3 relate to the speed of the fan.
*    fan_autoPV = fan automatic speed control feedback - *bool (coil)* - on = fan in automatic control, off = manual control. The automatic control will turn off automatically if the fan stops (ie setpoint temperature is reached).
*    fan_autoSP = fan automatic speed control switch - *bool (coil)* - on = fan in automatic control, off = manual control.
