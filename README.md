![Logo](admin/switchbot-ble.png)

# Switchbot (BLE) adapter for ioBroker

![Number of Installations](http://iobroker.live/badges/switchbot-ble-installed.svg)
[![github-workflow](https://github.com/mrbungle64/iobroker.switchbot-ble/actions/workflows/node.js.yml/badge.svg)](https://github.com/mrbungle64/iobroker.ecovacs-deebot)

This adapter allows you to control your SwitchBot "Bot" and to monitor SwitchBot "Meter", "Contact" and "Motion" via Bluetooth (BLE).

## Before you install

* If you are looking for Hub Plus/Mini support, [this adapter](https://github.com/DrozmotiX/ioBroker.switchbot-hub) is what you will need

## Supported OS

This adapter may only run on Linux-based operating systems, as the underlying library [node-switchbot](https://github.com/OpenWonderLabs/node-switchbot#supported-os) currently only supports Linux-based operating systems such as Raspbian and Ubuntu.

## Installation

It is recommended to use version 14.x or 16.x of Node.js.

The minimum required version is 12.x, but support for this version will be dropped soon.

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
* SwitchBot "Contact"
* SwitchBot "Motion"

The models listed are those that I have in use myself.

#### Other models

* SwitchBot "Curtain"

The SwitchBot "Curtain" is known to work, but I don't have one in use myself.

## Usage

### Remarks

#### SwitchBot "Bot"

If you use the "Bot" in "Switch Mode"
the value of the state "control.inverseOnOff" should be the same as "Inverse the on/off direction" in the app.
This cannot be synchronized automatically.

#### All models

The battery data is marked as experimental in the library for now. So there's no guarantee that the value is correct.

## Troubleshooting

If the adapter no longer works, e.g. after a restart or system update, please try the following:

```bash
cd /opt/iobroker/node_modules/iobroker.switchbot-ble/
sudo rm -r node_modules/
npm install
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

## Changelog

### 0.4.2
* Added option to change the used Host Controller Interface (hciX)

### 0.4.1
* Bumped node-switchbot to 1.2.0
  * Fix for Curtains on Firmware v3.3 and above

### 0.4.0
* Bumped node-switchbot to 1.1.3-beta.7
  * Added support for Switchbot "Contact" and "Motion"

### 0.3.8
* Bumped follow-redirects to 1.14.7 (fix for CVE-2022-0155) and some other dependencies

### 0.3.7
* Some minor improvements
* Some refactoring

### 0.3.6
* (patrickbs96) Some improvements and fixes

### 0.3.5
* Improved handling of controls and tasks

### 0.3.4
* Several improvements to control the bots
* Added new options to adapter config

### 0.3.3
* Implemented max retries limit (15)

### 0.3.2
* Some improvements on handling errors and executing commands

### 0.3.1
* Add new option to adapter settings

### 0.3.0
* Removed "switchbot" dependency
* Bumped the required Node.js version to 12
* Bumped node-switchbot to 1.1.2
* Bumped some other dependencies

### 0.2.3
* Some minor changes

### 0.2.2
* Bumped node-switchbot to 1.0.6

### 0.2.1
* Bumped node-switchbot to 1.0.3

### 0.2.0
* Bumped node-switchbot to 1.0.0

### 0.0.1 - 0.1.0
* Support for SwitchBot Bot and Meter
* Initial support for SwitchBot Curtain

## License
MIT License

Copyright (c) 2022 Sascha Hölzel <mrb1232@posteo.de>

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
