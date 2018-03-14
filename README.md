# homebridge-http-autofan

A fan accessory for [Homebridge](https://github.com/nfarina/homebridge). This fan can be controlled manually by entering 1 of four speed settings (Stop [0] - Slow [1] - Med [2] - High [3]). Alternativley, by pressing the AUTO switch, the speed of the fan will be controlled by the ambient temperature. This fan is used to cool the room, so any temperature at or below the setpoint will stop the fan until it is started by the user again.

This accessory is purely a front end GUI to access a HTTP server running on Node-RED, which then communicates to a PLC, over modbus serial, that actually controls the fan. 

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: ` npm install git://github.com/murch1/homebridge-http-autofand.git`
3. Edit .../node_modules/homebridge/node_modules/hap-nodejs/lib/Characteristic.js
    a. Find `Characteristic.Perms` and add `SPEED: 'speed'` to the dictionary.
4. Edit .../node_modules/homebridge/node_modules/hap-nodejs/lib/gen/HomeKitTypes.js
    a. I know it says `THIS FILE IS AUTO-GENERATED - DO NOT MODIFY`. I did and the world didn't end. Just keep track of the changes so you don't loose them after an update.
    b. Find `Characteristic "Rotation Speed` and replace with
    ```
    /**
     * Characteristic "Rotation Speed"
     */

    Characteristic.RotationSpeed = function() {
      Characteristic.call(this, 'Rotation Speed', '00000029-0000-1000-8000-0026BB765291');
      this.setProps({
        format: Characteristic.Formats.INT,
        unit: Characteristic.Units.SPEED,
        maxValue: 3,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };

    inherits(Characteristic.RotationSpeed, Characteristic);

    Characteristic.RotationSpeed.UUID = '00000029-0000-1000-8000-0026BB765291';
    ```
    c. Find `Service "Fan v2"` and replace with
    ```
    /**
     * Service "Fan v2"
     */

    Service.Fanv2 = function(displayName, subtype) {
      Service.call(this, displayName, '000000B7-0000-1000-8000-0026BB765291', subtype);

      // Required Characteristics
      this.addCharacteristic(Characteristic.Active);

      // Optional Characteristics
      this.addOptionalCharacteristic(Characteristic.CurrentFanState);
      this.addOptionalCharacteristic(Characteristic.TargetFanState);
      this.addOptionalCharacteristic(Characteristic.LockPhysicalControls);
      this.addOptionalCharacteristic(Characteristic.Name);
      this.addOptionalCharacteristic(Characteristic.RotationDirection);
      this.addOptionalCharacteristic(Characteristic.RotationSpeed);
      this.addOptionalCharacteristic(Characteristic.SwingMode);
      this.addOptionalCharacteristic(Characteristic.TargetTemperature);
      this.addOptionalCharacteristic(Characteristic.On);
    };

    inherits(Service.Fanv2, Service);

    Service.Fanv2.UUID = '000000B7-0000-1000-8000-0026BB765291';
    ```
    **Please note this altered service won't be recognised in Apple's Home.app. The Elgato Eve figures it out just fine.**
    
3. Update your configuration file. See `sample-config.json` in this repository for a sample.

# Configuration

Sample configuration:

```
"accessories": [
	{
	    "accessory": "httpautofan",
	    "name": "PLC Cabinet",
	    "acc_name": "PLC",
	    "manufacturer": "MurchHome",
	    "model": "DHT22",
	    "serial": "20000",
	    "temperature": 1,
            "temp_PV" : 6,
            "temp_SP" : 402,
           "temp_alarm" : 16692,
	    "humidity": 1,
            "hum_PV" : 7,
            "hum_alarm" : 16691,
	    "fan": 0,
            "fan_SP" : [16399, 16396, 16397, 16398],
            "fan_PV" : 301,
            "fan_autoPV" : 16999,
            "fan_autoSP" : 16400,
	    "timeout": 2500
	}
]
```
The example above is for the PLC cabinet. It has a DHT22 temperature and humidity sensor in it, but no fan. 
Set `temperature`,`humidity` or `fan` to either 1 (for enable) or 0 (for disable).
If no setting is entered for any of these, it will default to `temperature` only. For any characteristic you enable, you will need to provide the modbus addresses that relate to that function in the PLC. If the PLC generates an alarm (in my case, a failure alarm), this status can be made visible next to the characteristic inside the app.

# Modbus address settings
*    temp_PV = temperature process variable (reading) (x10) - *integer (holding register)* - the PLC will need to provide 24.5 as 245. The decimal point will be added in this accessory code.
*    temp_SP = temperature set point (x10) - *integer (holding register)* - the PLC will recieve the temperature as 245 from this accessory code.
*    temp_alarm = temperature failure alarm - *bool (coil)* - the alarm will be shown in HomeKit as StatusFault value 1.
*    hum_PV = humidity process variable (reading) - *integer (holding register)* - No decimal points used in humidity.
*    hum_alarm = humidity failure alarm - *bool (coil)* - the alarm will be shown in HomeKit as StatusFault value 1.
*    fan_SP = fan speed setpoint - *bool[4] = [off,low,med,high] (coil)* - the fan speed setpoint uses 4 digital pulses that manually set the fan speed. It's programmed like this in the PLC so it can use the 4 position rotary switch on the wall as a speed reference as well (for those times you want to set the fan speed like a cave man).
*    fan_PV = fan rotation speed feedback - *integer (holding register)* - values 0 to 3 relate to the speed of the fan.
*    fan_autoPV = fan automatic speed control feedback - *bool (coil)* - on = fan in automatic control, off = manual control. The automatic control will turn off automatically if the fan stops (ie setpoint temperature is reached).
*    fan_autoSP = fan automatic speed control switch - *bool (coil)* - on = fan in automatic control, off = manual control.
