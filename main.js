'use strict';

const utils = require('@iobroker/adapter-core');
const NodeSwitchbot = require('node-switchbot');
const Switchbot = require('switchbot');
const helper = require('./lib/adapterHelper');
const objects = require('./lib/adapterObjects');

class SwitchbotBle extends utils.Adapter {
    constructor(options) {
        super(
            Object.assign(
                options || {}, {
                    name: 'switchbot-ble'
                }
            )
        );
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.interval = null;
        this.timeout = null;
        this.inverseOnOff = [];
        this.switchbotDevice = [];
    }

    async onReady() {
        this.setState('info.connection', false, true);
        await this.initScanDevices();
        this.subscribeStates('*');
    }

    onUnload(callback) {
        try {
            if (this.interval) {
                clearInterval(this.interval);
            }
            process.exit();
            callback();
        } catch (e) {
            callback();
        }
    }

    onStateChange(id, state) {
        if (state) {
            this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            const stateName = helper.getStateNameById(id);
            const deviceAddress = helper.getDeviceAddressById(id);
            const channelName = helper.getChannelNameById(id);
            if (channelName === 'control') {
                if (state.ack) {
                    return;
                }
                if (stateName === 'inverseOnOff') {
                    this.inverseOnOff[deviceAddress] = state.val;
                    this.setState(deviceAddress + '.control.inverseOnOff', state.val, true);
                } else {
                    this.log.debug(`stateName ${stateName}`);
                    (async () => {
                        await this.deviceAction(deviceAddress, stateName);
                    })().catch((error) => {
                        this.log.error(`Error: ${error}`);
                    });
                }
                (async () => {
                    await this.initScanDevices();
                })().catch((error) => {
                    this.log.error(`Error: ${error}`);
                });
            }
        } else {
            this.log.debug(`state ${id} deleted`);
        }
    }

    async deviceAction(deviceAddress, action, count = 0) {
        if (count > 10) return;
        const switchbot = Switchbot(deviceAddress);
        this.log.debug('deviceAddress: ' + deviceAddress);
        (async () => {
            switch (action) {
                case 'turnOn':
                    if (this.switchbotDevice[deviceAddress]['on'] === true) return;
                    this.log.info(`turn on device ${deviceAddress}`);
                    await switchbot.turnOn();
                    break;
                case 'turnOff':
                    if (this.switchbotDevice[deviceAddress]['on'] === false) return;
                    this.log.info(`turn off device ${deviceAddress}`);
                    await switchbot.turnOff();
                    break;
                case 'press':
                    this.log.info(`press device ${deviceAddress}`);
                    await switchbot.press();
                    break;
                default:
                    this.log.debug(`Unhandled control action: ${deviceAddress}`);
            }
        })().catch((error) => {
            this.log.error(`Error executing ${action}: ${error}`);
            this.log.error(`Trying again (${count})`);
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            this.timeout = setTimeout(() => {
                (async () => {
                    await this.deviceAction(deviceAddress, action, count++);
                })().catch(() => {});
            }, 250);
        });
    }

    async initScanDevices() {
        this.log.debug(`initScanDevices`);
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.timeout = setTimeout(() => {
            (async () => {
                await this.scanDevices();
            })().catch(() => {});
        }, 1000);
        this.interval = setInterval(() => {
            (async () => {
                await this.scanDevices(500);
            })().catch(() => {});
        }, this.config.interval);
    }

    async scanDevices(wait = 2500) {
        const nodeSwitchbot = new NodeSwitchbot();
        nodeSwitchbot.startScan().then(() => {
            return nodeSwitchbot.wait(wait);
        }).then(() => {
            nodeSwitchbot.stopScan();
        }).catch((error) => {
            this.log.error(`error: ${error}`);
        });

        nodeSwitchbot.onadvertisement = (data) => {
            if (!this.switchbotDevice[data.address]) {
                (async () => {
                    await this.createBotObjects(data);
                })().catch(() => {});
                this.switchbotDevice[data.address] = data;
                this.log.info(`Detected device: ${data.address}`);
                this.getState(data.address + '.control.inverseOnOff', (err, state) => {
                    if (!err && state) {
                        this.inverseOnOff[data.address] = state.val;
                    }
                });
            }
            this.setStates(data);
        };
    }

    setStates(data) {
        if (data.serviceData) {
            this.setStateConditional('info.connection', true, true);
            this.setStateConditional(data.address + '.deviceInfo.rssi', data.rssi, true);
            this.setStateConditional(data.address + '.deviceInfo.id', data.id, true);
            this.setStateConditional(data.address + '.deviceInfo.model', data.serviceData.model, true);
            this.setStateConditional(data.address + '.deviceInfo.battery', data.serviceData.battery, true);
            if (data.serviceData.model === 'H') {
                this.setStateConditional(data.address + '.deviceInfo.switchMode', data.serviceData.mode, true);
                if (data.serviceData.mode === true) {
                    this.setStateConditional(data.address + '.deviceInfo.state', data.serviceData.state, true);
                    this.switchbotDevice[data.address]['on'] = this.getOnState(data);
                    this.setStateConditional(data.address + '.on', this.switchbotDevice[data.address]['on'], true);
                }
            } else if (data.serviceData.model === 'T') {
                this.setStateConditional(data.address + '.temperature', data.serviceData.temperature.c, true);
                this.setStateConditional(data.address + '.humidity', data.serviceData.humidity, true);
            }
        }
    }

    getOnState(data) {
        let on = data.serviceData.state;
        if (this.inverseOnOff[data.address] === true) {
            on = !data.serviceData.state;
        }
        return on;
    }

    setStateConditional(stateId, value, ack = true) {
        this.getState(stateId, (err, state) => {
            if (!err && state) {
                if (state.val !== value) {
                    this.setState(stateId, value, ack);
                }
            }
        });
    }

    async createBotObjects(object) {
        await objects.createBotObjects(this, object);
    }

    async createChannelNotExists(id, name) {
        await objects.createChannelNotExists(this, id, name);
    }

    async createObjectNotExists(id, name, type, role, write, def, unit) {
        await objects.createObjectNotExists(this, id, name, type, role, write, def, unit);
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new SwitchbotBle(options);
} else {
    // otherwise start the instance directly
    new SwitchbotBle();
}
