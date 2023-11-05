'use strict';

const utils = require('@iobroker/adapter-core');
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

        this.interval = 15000;
        this.scanDevicesWait = 3000;
        this.pressDevicesWait = 5000;
        this.maxRetriesDeviceAction = 15;
        this.inverseOnOff = {};
        this.hciDeviceId = '0';

        /**
         * @type {{[mac: String]: {address: String, rssi: Number, id: String,
         *                         serviceData: {model: 'H'|'T'|'c'|'s'|'d'|'i'|'o'|'w', modelName: String, battery: Number, state: Boolean, mode: Boolean,
         *                                       temperature: {c: Number, f: Number}, humidity: Number,
         *                                       position: Number, calibration: Number, lightLevel: Number, movement: Boolean, doorState: String},
         *                         on: Boolean}}}
         */
        this.switchbotDevice = {};
        this.retries = 0;

        this.commandQueue = new Queue(this, 'commandQueue');
        this.busy = false;
    }

    async onReady() {
        this.setState('info.connection', false, true);

        // Interval for scanning devices
        this.interval = Number(this.config.interval) || this.interval;
        this.log.debug(`Init interval: ${this.interval}`);
        // Waiting time while scanning devices
        this.scanDevicesWait = Number(this.config.scanDevicesWait) || this.scanDevicesWait;
        this.log.debug(`Init scanDevicesWait: ${this.scanDevicesWait}`);
        // Waiting time for the discovery when controlling the bot
        this.pressDevicesWait = Number(this.config.pressDevicesWait) || this.pressDevicesWait;
        this.log.debug(`Init pressDevicesWait: ${this.pressDevicesWait}`);
        // Waiting time for retries
        this.maxRetriesDeviceAction = Number(this.config.maxRetriesDeviceAction) || this.maxRetriesDeviceAction;
        this.log.debug(`Init maxRetriesDeviceAction: ${this.maxRetriesDeviceAction}`);

        // Set the NOBLE_HCI_DEVICE_ID environment variable to the interface number
        this.hciDeviceId = this.config.hciDeviceId.toString() || this.hciDeviceId;
        this.log.info(`Set the NOBLE_HCI_DEVICE_ID environment variable to ${this.hciDeviceId} (hci${this.hciDeviceId})`);
        process.env.NOBLE_HCI_DEVICE_ID = this.hciDeviceId;

        const Switchbot = require('node-switchbot');
        this.switchbot = new Switchbot();

        this.scanDevicesInterval = setInterval(() => {
            (async () => {
                if (this.isNotBusy()) {
                    await this.scanDevices();
                }
            })().catch((error) => {
                this.log.error(`[scanDevicesInterval] error while scanning devices: ${error}`);
            });
        }, this.interval);

        this.subscribeStates('*');
    }

    startCommandInterval() {
        if (!this.commandInterval) {
            this.log.silly(`[startCommandInterval] starting command interval`);
            this.commandInterval = setInterval(() => {
                (async () => {
                    if (this.isNotBusy()) {
                        await this.commandQueue.runAll();
                    }
                })().catch((error) => {
                    this.log.error(`[commandInterval] error while running command: ${error}`);
                });
            }, 100);
        }
    }

    stopCommandInterval(force = false) {
        if (this.commandInterval) {
            if (force || this.commandQueue.isEmpty()) {
                this.log.silly(`[startCommandInterval] stopping command interval`);
                clearInterval(this.commandInterval);
                this.commandInterval = null;
            }
        }
    }

    onUnload(callback) {
        try {
            this.stopCommandInterval(true);
            if (this.scanDevicesInterval) {
                clearInterval(this.scanDevicesInterval);
                this.scanDevicesInterval = null;
            }
            callback();
            process.exit();
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
                this.log.debug(`[onStateChange] received command: '${cmd}'`);
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
        if (!Object.keys(this.switchbotDevice).includes(macAddress)) {
            this.log.debug(`[deviceAction] MAC address (${macAddress}) does not exist!`);
            return;
        }

        const on = this.switchbotDevice[macAddress].on;
        switch (cmd) {
            case 'turnOn':
                if (on) {
                    this.log.info(`[deviceAction] ${helper.getProductName('H')} (${macAddress}) already turned on`);
                } else {
                    await this.botAction(cmd, macAddress, 'H');
                }
                break;
            case 'turnOff':
                if (!on) {
                    this.log.info(`[deviceAction] ${helper.getProductName('H')} (${macAddress}) already turned off`);
                } else {
                    await this.botAction(cmd, macAddress, 'H');
                }
                break;
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
                this.log.debug(`[deviceAction] unhandled control cmd '${cmd}' for device ${macAddress}`);
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
            let logMsg = `[botAction] connecting to ${helper.getProductName(model)} (${macAddress}) for executing command '${cmd}'`;
            if (value) {
                logMsg = `${logMsg} with given value ${value}`;
            }
            this.log.debug(logMsg);
            return bot.connect();
        }).then(() => {
            switch (cmd) {
                // SwitchBot "Bot"
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
                // SwitchBot "Curtain"
                case 'open':
                    return bot.open();
                case 'close':
                    return bot.close();
                case 'pause':
                    return bot.pause();
                case 'runToPos':
                    return bot.runToPos(value);
                default:
                    throw new Error(`Unhandled control cmd '${cmd}' for ${helper.getProductName(model)} (${macAddress})`);
            }
        }).then(() => {
            this.retries = 0;
            return bot.disconnect();
        }).then(() => {
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
                    this.log.info(`[botAction] successfully sent '${cmd}' command to ${helper.getProductName(model)} (${macAddress})`);
                    this.setStateConditional(macAddress + '.control.' + cmd, false, true);
                    break;
                case 'runToPos':
                    this.log.info(`[botAction] successfully sent '${cmd}' command to ${helper.getProductName(model)} (${macAddress}) with value ${value}`);
                    break;
            }
            if (model === 'H') {
                this.switchbotDevice[macAddress].on = on;
                this.setStateConditional(macAddress + '.' + cmd, on, true);
                this.setStateConditional(macAddress + '.on', on, true);
            }
            this.setIsBusy(false);
        }).catch((error) => {
            if (this.retries < this.maxRetriesDeviceAction) {
                this.retries++;
                const logMsg = `[botAction] Will try again (${this.retries}/${this.maxRetriesDeviceAction}) executing '${cmd}' for ${helper.getProductName(model)} (${macAddress})`;
                this.log.warn(`${logMsg}: ${error.toString()}`);
                let retryMilliseconds = 250;
                if (error.toString().toLowerCase().includes('wait for a few seconds')) {
                    retryMilliseconds = 1000;
                }
                setTimeout(() => {
                    this.botAction(cmd, macAddress, model, value);
                }, retryMilliseconds);
            } else {
                const logMsg = `[botAction] error while running '${cmd}' for ${helper.getProductName(model)} (${macAddress}): ${error.toString()}`;
                this.log.warn(`${logMsg}: ${error.toString()}`);
                this.log.error(`[botAction] max. retries (${this.maxRetriesDeviceAction}) reached. Giving up ...`);
                this.retries = 0;
                this.setIsBusy(false);
                this.stopCommandInterval(false);
            }
        });
    }

    async scanDevices() {
        this.switchbot.startScan().then(() => {
            this.setIsBusy(true);
            this.switchbot.onadvertisement = (data) => {
                if (!Object.keys(this.switchbotDevice).includes(data.address)) {
                    (async () => {
                        await this.createBotObjects(data);
                        this.switchbotDevice[data.address] = data;
                        this.switchbotDevice[data.address].on = this.getOnStateValue(data);
                        this.log.info(`[scanDevices] device detected: ${helper.getProductName(data.serviceData.model)} (${data.address})`);
                    })().catch((error) => {
                        this.log.error(`[scanDevices] error while creating objects: ${error}`);
                    });
                }
                (async () => {
                    await this.setAdvertisementData(data);
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

    getOnStateValue(data) {
        if (this.inverseOnOff[data.address] === true) {
            return !data.serviceData.state;
        }
        return data.serviceData.state;
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
        this.busy = isBusy;
        this.log.debug(`[setIsBusy] busy: ${isBusy}`);
    }

    isBusy() {
        return this.busy;
    }

    isNotBusy() {
        return this.isBusy() === false;
    }

    async setAdvertisementData(data) {
        await objects.setAdvertisementData(this, data);
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
