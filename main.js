'use strict';

const utils = require('@iobroker/adapter-core');
const Switchbot = require('node-switchbot');
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

        this.switchbot = new Switchbot();

        this.interval = null;
        this.cmdInterval = null;
        this.scanDevicesWait = null;
        this.pressDevicesWait = null;
        this.inverseOnOff = [];
        this.switchbotDevice = [];
        this.intervalNextCmd = {
            'cmd': 'scanDevices',
            'macAddress': null,
            'interval': null
        };
        this.isBusy = false;
    }

    async onReady() {
        this.setState('info.connection', false, true);

        this.cmdInterval = Number(this.config.interval) || 15000;
        this.log.debug(`Init cmdInterval: ${this.cmdInterval}`);

        this.scanDevicesWait = Number(this.config.scanDevicesWait) || 3000;
        this.log.debug(`Init scanDevicesWait: ${this.scanDevicesWait}`);

        this.pressDevicesWait = Number(this.config.pressDevicesWait) || 5000;
        this.log.debug(`Init pressDevicesWait: ${this.pressDevicesWait}`);

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
            this.log.debug(`[onStateChange] State ${id} changed: ${state.val} (ack = ${state.ack})`);
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
                    this.setNextInterval(cmd, 0, macAddress);
                }
            }
        } else {
            this.log.debug(`[onStateChange] State ${id} deleted`);
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
            case 'up':
            case 'down':
            case 'press':
            case 'turnOn':
            case 'turnOff':
                await this.deviceAction(cmd, macAddress);
                break;
            default:
                this.log.debug('[execNextCmd] unknown cmd: ' + cmd);
        }
    }

    async deviceAction(cmd, macAddress) {
        const on = this.switchbotDevice[macAddress]['on'];
        switch (cmd) {
            case 'turnOn':
                if (on) {
                    this.log.info(`[deviceAction] Device ${macAddress} already turned on`);
                    this.setNextInterval('scanDevices', this.cmdInterval);
                    return;
                } else {
                    await this.botAction(cmd, macAddress);
                    break;
                }
            case 'turnOff':
                if (!on) {
                    this.log.info(`[deviceAction] Device ${macAddress} already turned off`);
                    this.setNextInterval('scanDevices', this.cmdInterval);
                    return;
                } else {
                    await this.botAction(cmd, macAddress);
                    break;
                }
            case 'press':
            case 'up':
            case 'down':
                await this.botAction(cmd, macAddress);
                break;
            default:
                this.log.debug(`[deviceAction] Unhandled control cmd ${cmd} for device ${macAddress}`);
                this.setNextInterval('scanDevices', this.cmdInterval);
        }
    }

    async botAction(cmd, macAddress) {
        if (this.isBusy) {
            this.setNextInterval(cmd, this.scanDevicesWait, macAddress);
            return;
        }
        this.setIsBusy(true);
        let bot = null;
        this.switchbot.discover({
            id: macAddress,
            model: 'H',
            quick: true,
            duration: this.pressDevicesWait
        }).then((device_list) => {
            bot = device_list[0];
            this.log.debug(`[botAction] Connecting to device ${macAddress} ...`);
            return bot.connect();
        }).then(() => {
            switch (cmd) {
                case 'turnOn':
                    return bot.turnOn();
                case 'turnOff':
                    return bot.turnOff();
                case 'press':
                    return bot.press();
                case 'up':
                    return bot.up();
                case 'down':
                    return bot.down();
                default:
                    throw new Error(`Unhandled control cmd ${cmd} for device ${macAddress}`);
            }
        }).then(() => {
            let on = false;
            switch (cmd) {
                case 'turnOn':
                    this.log.info(`[botAction] Device ${macAddress} turned on`);
                    on = true;
                    break;
                case 'turnOff':
                    this.log.info(`[botAction] Device ${macAddress} turned off`);
                    break;
                case 'press':
                    this.log.info(`[botAction] Device ${macAddress} pressed`);
                    break;
                case 'up':
                    this.log.info(`[botAction] Device ${macAddress} pressed up`);
                    break;
                case 'down':
                    this.log.info(`[botAction] Device ${macAddress} pressed down`);
                    on = true;
                    break;
            }
            this.switchbotDevice[macAddress]['on'] = on;
            this.setStateConditional(macAddress + '.' + cmd, on, true);
            this.setStateConditional(macAddress + '.on', on, true);
        }).then(() => {
            bot.disconnect();
            this.setNextInterval('scanDevices', this.cmdInterval);
            this.setIsBusy(false);
        }).catch((error) => {
            this.log.warn(`[botAction] Error while running deviceAction ${cmd} for device ${macAddress}: ${error.toString()}`);
            this.setNextInterval(cmd, this.scanDevicesWait, macAddress);
            this.setIsBusy(false);
        });
    }

    async scanDevices() {
        if (this.isBusy) {
            this.setNextInterval('scanDevices', this.cmdInterval);
            return;
        }
        this.setIsBusy(true);
        this.switchbot.startScan().then(() => {
            return this.switchbot.wait(this.scanDevicesWait);
        }).then(() => {
            this.switchbot.stopScan();
            this.setIsBusy(false);
            this.setNextInterval('scanDevices', this.cmdInterval);
        }).catch((error) => {
            this.log.error(`[scanDevices] Error: ${error}`);
            this.setIsBusy(false);
            this.setNextInterval('scanDevices', this.cmdInterval);
        });

        this.switchbot.onadvertisement = (data) => {
            if (!this.switchbotDevice[data.address]) {
                (async () => {
                    await this.createBotObjects(data);
                })().catch((error) => {
                    this.log.error(`[onadvertisement] Error while creating objects: ${error}`);
                });
                this.switchbotDevice[data.address] = data;
                this.log.info(`[onadvertisement] Device detected: ${data.address}`);
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
            this.setStateConditional(data.address + '.deviceInfo.modelName', data.serviceData.modelName, true);
            this.setStateConditional(data.address + '.deviceInfo.productName', helper.getProductName(data.serviceData.model), true);
            this.setStateConditional(data.address + '.deviceInfo.battery', data.serviceData.battery, true);
            if (data.serviceData.model === 'H') {
                // SwitchBot Bot (WoHand)
                this.setStateConditional(data.address + '.deviceInfo.switchMode', data.serviceData.mode, true);
                if (data.serviceData.mode === true) {
                    this.setStateConditional(data.address + '.deviceInfo.state', data.serviceData.state, true);
                    this.switchbotDevice[data.address]['on'] = this.getOnState(data);
                    this.setStateConditional(data.address + '.on', this.switchbotDevice[data.address]['on'], true);
                }
            } else if (data.serviceData.model === 'T') {
                // SwitchBot Meter (WoSensorTH)
                this.setStateConditional(data.address + '.temperature', data.serviceData.temperature.c, true);
                this.setStateConditional(data.address + '.humidity', data.serviceData.humidity, true);
            } else if (data.serviceData.model === 'c') {
                // SwitchBot Curtain (WoCurtain)
                this.setStateConditional(data.address + '.calibration', data.serviceData.calibration, true);
                this.setStateConditional(data.address + '.position', data.serviceData.position, true);
                this.setStateConditional(data.address + '.lightLevel', data.serviceData.lightLevel, true);
            } else if (data.serviceData.model === 's') {
                // WoMotion
                this.setStateConditional(data.address + '.movement', data.serviceData.movement, true);
                this.setStateConditional(data.address + '.lightLevel', data.serviceData.lightLevel, true);
            } else if (data.serviceData.model === 'd') {
                // WoContact
                this.setStateConditional(data.address + '.doorState', data.serviceData.doorState, true);
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

    setIsBusy(isBusy) {
        this.isBusy = isBusy;
        this.log.debug('[setIsBusy] isBusy: ' + this.isBusy);
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
