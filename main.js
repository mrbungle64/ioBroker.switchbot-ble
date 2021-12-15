'use strict';

const utils = require('@iobroker/adapter-core');
const Switchbot = require('node-switchbot');
const helper = require('./lib/adapterHelper');
const objects = require('./lib/adapterObjects');
const Queue = require('./lib/adapterQueue');

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

        this.interval = 15000;
        this.scanDevicesWait = 3000;
        this.pressDevicesWait = 5000;
        this.maxRetriesDeviceAction = 15;
        this.inverseOnOff = [];
        this.switchbotDevice = [];
        this.retries = 0;

        this.commandQueue = new Queue(this, 'commandQueue');
        this.isBusy = false;
    }

    async onReady() {
        this.setState('info.connection', false, true);

        this.interval = Number(this.config.interval) || this.interval;
        this.log.debug(`Init cmdInterval: ${this.interval}`);

        this.scanDevicesWait = Number(this.config.scanDevicesWait) || this.scanDevicesWait;
        this.log.debug(`Init scanDevicesWait: ${this.scanDevicesWait}`);

        this.pressDevicesWait = Number(this.config.pressDevicesWait) || this.pressDevicesWait;
        this.log.debug(`Init pressDevicesWait: ${this.pressDevicesWait}`);

        this.maxRetriesDeviceAction = Number(this.config.maxRetriesDeviceAction) || this.maxRetriesDeviceAction;
        this.log.debug(`Init maxRetriesDeviceAction: ${this.maxRetriesDeviceAction}`);

        this.scanDevicesInterval = setInterval(() => {
            (async () => {
                if (!this.isBusy) {
                    await this.scanDevices();
                }
            })().catch((error) => {
                this.log.error(`[scanDevicesInterval] error while scanning devices: ${error}`);
            });
        }, this.interval);

        this.commandInterval = setInterval(() => {
            (async () => {
                if (!this.isBusy) {
                    await this.commandQueue.runAll();
                }
            })().catch((error) => {
                this.log.error(`[commandInterval] error while running command: ${error}`);
            });
        }, 500);

        this.subscribeStates('*');
    }

    onUnload(callback) {
        try {
            if (this.scanDevicesInterval) {
                clearInterval(this.scanDevicesInterval);
                this.scanDevicesInterval = null;
            }
            if (this.commandInterval) {
                clearInterval(this.commandInterval);
                this.commandInterval = null;
            }
            process.exit();
            callback();
        } catch (e) {
            callback();
        }
    }

    onStateChange(id, state) {
        if (state) {
            this.log.debug(`[onStateChange] state ${id} changed: ${state.val} (ack = ${state.ack})`);
            const stateName = helper.getStateNameById(id);
            const macAddress = helper.getDeviceAddressById(id);
            const channelName = helper.getChannelNameById(id);
            if (channelName === 'control') {
                if (state.ack) {
                    return;
                }
                const cmd = stateName;
                this.log.silly(`[onStateChange] received command: ${cmd}`);
                switch (cmd) {
                    case 'inverseOnOff':
                        this.inverseOnOff[macAddress] = state.val;
                        this.setState(macAddress + '.control.inverseOnOff', state.val, true);
                        break;
                    case 'runToPos':
                        this.commandQueue.add(cmd, macAddress, state.val);
                        break;
                    default:
                        this.commandQueue.add(cmd, macAddress);
                        break;
                }
            }
        } else {
            this.log.debug(`[onStateChange] state ${id} deleted`);
        }
    }

    async deviceAction(cmd, macAddress, value = null) {
        const on = this.switchbotDevice[macAddress]['on'];
        switch (cmd) {
            case 'turnOn':
                if (on) {
                    this.log.info(`[deviceAction] device ${macAddress} already turned on`);
                    return;
                } else {
                    await this.botAction(cmd, macAddress, 'H');
                    break;
                }
            case 'turnOff':
                if (!on) {
                    this.log.info(`[deviceAction] device ${macAddress} already turned off`);
                    return;
                } else {
                    await this.botAction(cmd, macAddress, 'H');
                    break;
                }
            case 'press':
            case 'up':
            case 'down':
                await this.botAction(cmd, macAddress, 'H');
                break;
            case 'open':
            case 'close':
            case 'pause':
                await this.botAction(cmd, macAddress, 'c');
                break;
            case 'runToPos':
                await this.botAction(cmd, macAddress, 'c', value);
                break;
            default:
                this.log.debug(`[deviceAction] unhandled control cmd ${cmd} for device ${macAddress}`);
        }
    }

    async botAction(cmd, macAddress, model = 'H', value = null) {
        this.setIsBusy(true);
        let bot = null;
        this.switchbot.discover({
            id: macAddress,
            model: model,
            quick: true,
            duration: this.pressDevicesWait
        }).then((device_list) => {
            bot = device_list[0];
            if (typeof bot === 'undefined') {
                return Promise.reject('Discover deviceList is empty!');
            }
            let logMsg = `[botAction] connecting to ${helper.getProductName(model)} (${macAddress}) for executing command ${cmd}`;
            if (value) {
                logMsg = `${logMsg} with given value ${value}`;
            }
            this.log.debug(logMsg);
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
                case 'open':
                    return bot.open();
                case 'close':
                    return bot.close();
                case 'pause':
                    return bot.pause();
                case 'runToPos':
                    return bot.runToPos(value);
                default:
                    throw new Error(`Unhandled control cmd ${cmd} for ${helper.getProductName(model)} (${macAddress})`);
            }
        }).then(() => {
            this.retries = 0;
            return bot.disconnect();
        }).then(() => {
            this.setIsBusy(false);
            let on = false;
            switch (cmd) {
                case 'turnOn':
                    this.log.info(`[botAction] ${helper.getProductName(model)} (${macAddress}) successfully turned on`);
                    this.setStateConditional(macAddress + '.control.turnOn', true, true);
                    this.setStateConditional(macAddress + '.control.turnOff', false, true);
                    on = true;
                    break;
                case 'turnOff':
                    this.log.info(`[botAction] ${helper.getProductName(model)} (${macAddress}) successfully turned off`);
                    this.setStateConditional(macAddress + '.control.turnOff', true, true);
                    this.setStateConditional(macAddress + '.control.turnOn', false, true);
                    break;
                case 'press':
                    this.log.info(`[botAction] ${helper.getProductName(model)} (${macAddress}) successfully pressed`);
                    this.setStateConditional(macAddress + '.control.down', true, true);
                    this.setStateConditional(macAddress + '.control.up', false, true);
                    setTimeout(() => {
                        this.setStateConditional(macAddress + '.control.press', false, true);
                        this.setStateConditional(macAddress + '.control.down', false, true);
                        this.setStateConditional(macAddress + '.control.up', true, true);
                    }, 1000);
                    break;
                case 'up':
                    this.log.info(`[botAction] ${helper.getProductName(model)} (${macAddress}) successfully pressed up`);
                    this.setStateConditional(macAddress + '.control.up', true, true);
                    this.setStateConditional(macAddress + '.control.down', false, true);
                    break;
                case 'down':
                    this.log.info(`[botAction] ${helper.getProductName(model)} (${macAddress}) successfully pressed down`);
                    this.setStateConditional(macAddress + '.control.down', true, true);
                    this.setStateConditional(macAddress + '.control.up', false, true);
                    on = true;
                    break;
                case 'open':
                case 'close':
                case 'pause':
                    this.log.info(`[botAction] successfully sent ${cmd} command to ${helper.getProductName(model)} (${macAddress})`);
                    this.setStateConditional(macAddress + '.control.' + cmd, false, true);
                    break;
                case 'runToPos':
                    this.log.info(`[botAction] successfully sent ${cmd} command to ${helper.getProductName(model)} (${macAddress}) with value ${value}`);
                    break;
            }
            if (model === 'H') {
                this.switchbotDevice[macAddress]['on'] = on;
                this.setStateConditional(macAddress + '.' + cmd, on, true);
                this.setStateConditional(macAddress + '.on', on, true);
            }
        }).catch((error) => {
            this.log.warn(`[botAction] error while running cmd ${cmd} for ${helper.getProductName(model)} (${macAddress}): ${error.toString()}`);
            if (this.retries < this.maxRetriesDeviceAction) {
                this.retries++;
                this.log.info(`[botAction] will try again (${this.retries}/${this.maxRetriesDeviceAction}) ...`);
                setTimeout(() => {
                    this.botAction(cmd, macAddress, model, value);
                }, 250);
            } else {
                this.log.warn(`[botAction] max. retries (${this.maxRetriesDeviceAction}) reached. Giving up ...`);
                this.retries = 0;
                this.setIsBusy(false);
            }
        });
    }

    async scanDevices() {
        this.switchbot.startScan().then(() => {
            this.setIsBusy(true);
            this.switchbot.onadvertisement = (data) => {
                if (!this.switchbotDevice[data.address]) {
                    (async () => {
                        await this.createBotObjects(data);
                        this.switchbotDevice[data.address] = data;
                        this.log.info(`[scanDevices] device detected: ${helper.getProductName(data.serviceData.model)} (${data.address})`);
                    })().catch((error) => {
                        this.log.error(`[scanDevices] error while creating objects: ${error}`);
                    });
                }
                (async () => {
                    await this.setStateValues(data);
                })().catch((error) => {
                    this.log.error(`[scanDevices] error while set state values: ${error}`);
                });
            };
            return this.switchbot.wait(this.scanDevicesWait);
        }).then(() => {
            this.switchbot.stopScan();
            this.setIsBusy(false);
        }).catch((error) => {
            this.log.error(`[scanDevices] error: ${error}`);
            this.setIsBusy(false);
        });
    }

    /**
     *
     * @param {{address: String, rssi: Number, id: String,
     *          serviceData: {model: 'H'|'T'|'c'|'s'|'d', modelName: String, battery: Number, state: Boolean, mode: Boolean,
     *                        temperature: {c: Number, f: Number}, humidity: Number,
     *                        position: Number, calibration: Number, lightLevel: Number, movement: Boolean, doorState: String}}} data
     */
    async setStateValues(data) {
        this.log.silly(`[setStateValues] ${typeof data !== 'undefined' ? JSON.stringify(data) : 'null'}`);

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
                this.setStateConditional(data.address + '.deviceInfo.state', data.serviceData.state, true);
                const state = await this.getStateAsync(data.address + '.control.inverseOnOff');
                if (state) {
                    this.inverseOnOff[data.address] = state.val;
                    this.switchbotDevice[data.address]['on'] = this.getOnStateValue(data);
                    this.setStateConditional(data.address + '.on', this.switchbotDevice[data.address]['on'], true);
                }
            } else if (data.serviceData.model === 'T') {
                // SwitchBot Meter (WoSensorTH)
                this.setStateConditional(data.address + '.temperature', data.serviceData.temperature.c, true);
                this.setStateConditional(data.address + '.temperatureF', data.serviceData.temperature.f, true);
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

    getOnStateValue(data) {
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
        this.log.debug(`[setIsBusy] busy: ${this.isBusy}`);
    }

    async createBotObjects(object) {
        await objects.createBotObjects(this, object);
    }

    async createDeviceNotExists(id, name) {
        await objects.createDeviceNotExists(this, id, name);
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
