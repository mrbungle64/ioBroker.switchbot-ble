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
        this.cmdInterval = null;
        this.scanDevicesWait = null;
        this.inverseOnOff = [];
        this.switchbotDevice = [];
        this.intervalNextCmd = {
            'cmd': null,
            'deviceAddress': null,
            'interval': null
        };
    }

    async onReady() {
        this.setState('info.connection', false, true);
        this.cmdInterval = 15000;
        if ((this.config.interval) && (parseInt(this.config.interval) > 0)) {
            this.cmdInterval = parseInt(this.config.interval);
        }
        this.scanDevicesWait = 3000;
        if ((this.config.scanDevicesWait) && (parseInt(this.config.scanDevicesWait) > 0)) {
            this.scanDevicesWait = parseInt(this.config.scanDevicesWait);
        }
        this.setNextInterval('scanDevices', 250);
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
            const macAddress = helper.getDeviceAddressById(id);
            const channelName = helper.getChannelNameById(id);
            if (channelName === 'control') {
                if (state.ack) {
                    return;
                }
                const cmd = stateName;
                if (cmd === 'inverseOnOff') {
                    this.inverseOnOff[macAddress] = state.val;
                    this.setState(macAddress + '.control.inverseOnOff', state.val, true);
                } else {
                    this.setNextInterval(cmd, 100, macAddress);
                }
            }
        } else {
            this.log.debug(`state ${id} deleted`);
        }
    }

    setNextInterval(cmd, interval, device = null) {
        this.log.debug('[setNextInterval] cmd: ' + cmd);
        this.intervalNextCmd['cmd'] = cmd;
        this.intervalNextCmd['macAddress'] = device;
        if (this.intervalNextCmd['interval'] !== interval) {
            this.log.debug('[setNextInterval] interval: ' + interval);
            this.intervalNextCmd['interval'] = interval;
            if (this.interval) {
                clearInterval(this.interval);
            }
            this.interval = setInterval(() => {
                (async () => {
                    await this.execNextCmd();
                })().catch(() => {
                });
            }, interval);
        }
    }

    async execNextCmd() {
        const macAddress = this.intervalNextCmd['macAddress'];
        const cmd = this.intervalNextCmd['cmd'];
        this.log.debug('[execNextCmd] cmd: ' + cmd);
        switch (cmd) {
            case 'scanDevices':
                await this.scanDevices();
                break;
            case 'press':
            case 'turnOn':
            case 'turnOff':
                await this.deviceAction(cmd, macAddress);
                break;
            default:
                await this.scanDevices();
        }
    }

    async deviceAction(cmd, macAddress) {
        const switchbot = Switchbot(macAddress);
        this.log.debug('macAddress: ' + macAddress);
        const on = this.switchbotDevice[macAddress]['on'];
        (async () => {
            switch (cmd) {
                case 'turnOn':
                    if (on === true) {
                        this.log.info(`device already turned on`);
                        this.setNextInterval('scanDevices', this.cmdInterval, null);
                        return;
                    }
                    await switchbot.turnOn();
                    this.setStateConditional(macAddress + '.on', true, true);
                    this.switchbotDevice[macAddress]['on'] = true;
                    this.log.info(`device ${macAddress} turned on`);
                    this.setNextInterval('scanDevices', 50, macAddress);
                    break;
                case 'turnOff':
                    if (on === false) {
                        this.log.info(`device already turned off`);
                        this.setNextInterval('scanDevices', this.cmdInterval, null);
                        return;
                    }
                    await switchbot.turnOff();
                    this.setStateConditional(macAddress + '.on', false, true);
                    this.switchbotDevice[macAddress]['on'] = false;
                    this.log.info(`device ${macAddress} turned off`);
                    this.setNextInterval('scanDevices', 50, macAddress);
                    break;
                case 'press':
                    await switchbot.press();
                    this.setStateConditional(macAddress + '.on', !on, true);
                    this.switchbotDevice[macAddress]['on'] = !on;
                    this.log.info(`device ${macAddress} pressed`);
                    this.setNextInterval('scanDevices', 50, macAddress);
                    break;
                default:
                    this.log.debug(`Unhandled control cmd: ${macAddress}`);
            }
        })().catch((error) => {
            this.log.debug(`Error deviceAction: ${error}`);
            this.setNextInterval(cmd, 1000, macAddress);
        });
    }

    async scanDevices(setNextInterval = true) {
        const nodeSwitchbot = new NodeSwitchbot();
        nodeSwitchbot.startScan().then(() => {
            return nodeSwitchbot.wait(this.scanDevicesWait);
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
        this.log.debug('[scanDevices] setNextInterval: ' + setNextInterval);
        if (setNextInterval) {
            this.setNextInterval('scanDevices', this.cmdInterval, null);
        }
    }

    setStates(data) {
        if (data.serviceData) {
            this.setStateConditional('info.connection', true, true);
            this.setStateConditional(data.address + '.deviceInfo.rssi', data.rssi, true);
            this.setStateConditional(data.address + '.deviceInfo.id', data.id, true);
            this.setStateConditional(data.address + '.deviceInfo.model', data.serviceData.model, true);
            this.setStateConditional(data.address + '.deviceInfo.battery', data.serviceData.battery, true);
            if (data.serviceData.model === 'H') {
                // SwitchBot Bot
                this.setStateConditional(data.address + '.deviceInfo.switchMode', data.serviceData.mode, true);
                if (data.serviceData.mode === true) {
                    this.setStateConditional(data.address + '.deviceInfo.state', data.serviceData.state, true);
                    this.switchbotDevice[data.address]['on'] = this.getOnState(data);
                    this.setStateConditional(data.address + '.on', this.switchbotDevice[data.address]['on'], true);
                }
            } else if (data.serviceData.model === 'T') {
                // SwitchBot Meter
                this.setStateConditional(data.address + '.temperature', data.serviceData.temperature.c, true);
                this.setStateConditional(data.address + '.humidity', data.serviceData.humidity, true);
            } else if (data.serviceData.model === 'c') {
                // SwitchBot Curtain
                this.setStateConditional(data.address + '.calibration', data.serviceData.calibration, true);
                this.setStateConditional(data.address + '.position', data.serviceData.position, true);
                this.setStateConditional(data.address + '.lightLevel', data.serviceData.lightLevel, true);
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
