![Logo](admin/switchbot-ble.png)

# Switchbot (BLE) adapter for ioBroker

This adapter allows you to control your SwitchBot "Bot" and to monitor the temperature/humidity from SwitchBot "Meter" via Bluetooth (BLE).

## Before you install

* Controlling SwitchBot "Bot" may not be 100% stable (see known issues)
* If you are looking for Hub Plus/Mini support, [this adapter](https://github.com/DrozmotiX/ioBroker.switchbot-hub) is what you will need

## Supported OS

This adapter may only run on Linux-based operating systems, as the underlying library [node-switchbot](https://github.com/OpenWonderLabs/node-switchbot#supported-os) currently only supports Linux-based operating systems such as Raspbian and Ubuntu.

## Installation

It is recommended to use version 12.x or 14.x of Node.js.

The minimum required version is 12.x

Before installing the adapter, some linux libraries related Bluetooth as follows if the OS is Ubuntu/Debian/Raspbian.

```bash
$ sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

Running without root/sudo (Linux-specific):

```bash
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

This grants the `node` binary `cap_net_raw` privileges, so it can start/stop BLE advertising.

__Note:__ The above command requires `setcap` to be installed.
It can be installed the following way (e.g. Raspbian and Ubuntu):

```bash
sudo apt-get install libcap2-bin
```

See the documentation of [@abandonware/noble](https://github.com/abandonware/noble#readme) for other details.

## Models

### Supported models

* SwitchBot "Bot"
* SwitchBot "Meter"

#### Other models (untested)

* SwitchBot "Curtain" (read-only)

States should also be generated for other models (e.g. Contact Sensor, Humidifier),
but they are also read-only and only contain information about the battery level and model.

## Known issues

* "press", "turnOn" and "turnOff" from SwitchBot "Bot" sometimes not working
  * There's no solution for this yet, because there's mostly no error message. It just doesn't move the arm
  * However, it may be that in many cases it still works without any issues

## Troubleshooting

If the adapter no longer works, e.g. after a restart or system update, please try the following:

```bash
cd /opt/iobroker/node_modules/iobroker.switchbot-ble/
sudo rm -r node_modules/
npm install
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

## Changelog

### 0.3.3
* Implemented max retries limit (15)

### 0.3.2
* Some improvements on handling errors and executing commands

### 0.3.1
* Add new option to adapter settings

### 0.3.0
* Remove "switchbot" dependency
* Bump the required Node.js version to 12
* Bump node-switchbot to 1.1.2
* Bump some other dependencies

### 0.2.3
* Some minor changes

### 0.2.2
* Bump node-switchbot to 1.0.6

### 0.2.1
* Bump node-switchbot to 1.0.3

### 0.2.0
* Bump node-switchbot to 1.0.0

### 0.0.1 - 0.1.0
* Support for SwitchBot Bot and Meter
* Initial support for SwitchBot Curtain

## License
MIT License

Copyright (c) 2021 Sascha Hölzel <mrb1232@posteo.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
