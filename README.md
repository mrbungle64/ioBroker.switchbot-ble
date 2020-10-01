![Logo](admin/switchbot-ble.png)

# Switchbot (BLE) adapter for ioBroker

This adapter allows you to control your SwitchBot "Bot" and to monitor the temperature/humidity from SwitchBot "Meter".

## Before you install
* This adapter doesn't support Hub Plus/Mini
* It only supports "SwitchBot Bot" and "SwitchBot Meter" over Bluetooth (BLE)
* Controlling "SwitchBot Bot" isn't stable yet (see known issues)
* The "SwitchBot Meter" isn't tested yet but should work anyway

## Dependencies
* [Node.js](https://nodejs.org/en/) 10 +
* [switchbot](https://github.com/ukiuni/Switchbot) for moving the arm from SwitchBot "Bot"
* [node-switchbot](https://github.com/futomi/node-switchbot) for monitoring the states of your SwitchBot "Bot" and "Meter"

## Supported OS
[node-switchbot](https://github.com/futomi/node-switchbot) currently supports only Linux-based OSes, such as Raspbian, Ubuntu, and so on.

## Installation
Before installing the adapter, some linux libraries related Bluetooth as follows if the OS is Ubuntu/Debian/Raspbian.

```
$ sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

If the adapter starts but won't connect to your bluetooth hardware, you need to give `node` additional permissions:
```bash
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```
which requires `libcap2-bin` to be installed.

## Models

### Supported models
* SwitchBot "Bot"

### These models should work
* SwitchBot "Meter" (Thermometer & Hygrometer)

## Known issues

* "press", "turnOn" and "turnOff" from SwitchBot "Bot" sometimes not working.
  * There's no solution for this yet, because there's mostly no error message. It just doesn't move the arm.
  * When using [node-switchbot](https://github.com/futomi/node-switchbot) for controlling the "Bot" the connection is even more unstable.

## Changelog

### 0.0.2
* (mrbungle64) Improved reliability

### 0.0.1
* (mrbungle64) Initial release

## License
MIT License

Copyright (c) 2020 Sascha Hölzel <mrb1232@posteo.de>

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
