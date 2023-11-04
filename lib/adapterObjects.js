'use strict';

const helper = require('./adapterHelper');

/**
 *
 * @param {Object} adapter
 * @param {{address: String, rssi: Number, id: String,
 *          serviceData: {model: 'H'|'T'|'c'|'s'|'d'|'i'|'o'|'w', modelName: String, battery: Number, state: Boolean, mode: Boolean,
 *                        temperature: {c: Number, f: Number}, humidity: Number,
 *                        position: Number, calibration: Number, lightLevel: String, movement: Boolean, doorState: String}}} data
 */
async function createBotObjects(adapter, data) {
    await adapter.createDeviceNotExists(data.address);
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.rssi', 'Received Signal Strength Indication',
        'number', 'value', false, data.rssi, '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.battery', 'Battery value',
        'number', 'value.battery', false, data.serviceData.battery, '%');
    await adapter.createChannelNotExists(data.address + '.deviceInfo');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.id', 'ID of the device',
        'string', 'text', false, data.id, '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.model', 'Model',
        'string', 'text', false, data.serviceData.model, '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.modelName', 'Model name',
        'string', 'text', false, data.serviceData.modelName, '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.productName', 'Product name',
        'string', 'text', false, '', '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.json', 'JSON data set',
        'json', 'value', false, '[]', '');
    if (data.serviceData.model === 'H') {
        // SwitchBot Bot
        await adapter.createChannelNotExists(data.address + '.control');
        await adapter.createObjectNotExists(
            data.address + '.control.inverseOnOff', 'Whether on/off direction is inverted',
            'boolean', 'indicator.status', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.press', 'Press the Bot\'s arm',
            'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.up', 'Put up the Bot\'s arm',
            'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.down', 'Put down the Bot\'s arm',
            'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.deviceInfo.switchMode', '"Switch mode": true, "Press mode": false',
            'boolean', 'text', false, true, '');
        await adapter.createObjectNotExists(
            data.address + '.deviceInfo.state', 'Indicates whether the switch status is on or off',
            'boolean', 'indicator.status', false, false, '');
        await adapter.createObjectNotExists(
            data.address + '.on', 'Indicates whether the switch status is on',
            'boolean', 'indicator.status', false, false, '');
        if (data.serviceData.mode === true) {
            await adapter.createObjectNotExists(
                data.address + '.control.turnOn', 'Turn on the Bot',
                'boolean', 'button', true, false, '');
            await adapter.createObjectNotExists(
                data.address + '.control.turnOff', 'Turn off the Bot',
                'boolean', 'button', true, false, '');
        }
    } else if ((data.serviceData.model === 'T') || (data.serviceData.model === 'i') || (data.serviceData.model === 'w')) {
        // SwitchBot Meter (Plus) and Indoor/Outdoor Thermo-Hygrometer
        await adapter.createObjectNotExists(
            data.address + '.temperature', 'Temperature value',
            'number', 'value.temperature', false, data.serviceData.temperature.c, '°C');
        await adapter.createObjectNotExists(
            data.address + '.temperatureF', 'Temperature value Fahrenheit',
            'number', 'value.temperature', false, data.serviceData.temperature.f, '°F');
        await adapter.createObjectNotExists(
            data.address + '.humidity', 'Humidity value',
            'number', 'value.humidity', false, data.serviceData.humidity, '%');
    } else if (data.serviceData.model === 'c') {
        // SwitchBot Curtain
        await adapter.createChannelNotExists(data.address + '.control');
        await adapter.createObjectNotExists(
            data.address + '.control.open', 'Sends an open command to the Curtain',
            'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.close', 'Sends a close command to the Curtain',
            'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.pause', 'Sends a pause command to the Curtain',
            'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.runToPos', 'Sends a position command to the Curtain',
            'number', 'value', true, data.serviceData.position, '');
        await adapter.createObjectNotExists(
            data.address + '.calibration', 'Indicates the calibration status (true or false)',
            'boolean', 'indicator.status', false, data.serviceData.calibration, '');
        await adapter.createObjectNotExists(
            data.address + '.position', 'Indicates the percentage of current position (0-100, 0 is open, %)',
            'number', 'value', false, data.serviceData.position, '%');
        await adapter.createObjectNotExists(
            data.address + '.lightLevel', 'Indicates the light level of the light source currently set (1-10)',
            'number', 'value', false, data.serviceData.lightLevel, '');
    } else if ((data.serviceData.model === 's') || (data.serviceData.model === 'd')) {
        // WoMotion and WoContact
        await adapter.createObjectNotExists(
            data.address + '.movement', 'Indicates whether movement is detected',
            'boolean', 'value', false, data.serviceData.movement, '');
        await adapter.createObjectNotExists(
            data.address + '.lightLevel', 'Indicates whether darkness or brightness is detected',
            'string', 'value', false, data.serviceData.lightLevel, '');
        const isBright = (data.serviceData.lightLevel === 'bright');
        await adapter.createObjectNotExists(
            data.address + '.isBright', 'Indicates whether brightness is detected',
            'boolean', 'value', false, isBright, '');
        const isDark = !isBright;
        await adapter.createObjectNotExists(
            data.address + '.isDark', 'Indicates if darkness is detected',
            'boolean', 'value', false, isDark, '');
        if (data.serviceData.model === 'd') {
            // WoContact
            await adapter.createObjectNotExists(
                data.address + '.doorState', 'Indicates whether the door/window is open or closed',
                'string', 'value', false, data.serviceData.doorState, '');
            const doorIsOpen = (data.serviceData.doorState === 'open');
            await adapter.createObjectNotExists(
                data.address + '.doorIsOpen', 'Indicates whether the door/window is open',
                'boolean', 'value', false, doorIsOpen, '');
            const doorIsClosed = !doorIsOpen;
            await adapter.createObjectNotExists(
                data.address + '.doorIsClosed', 'Indicates whether the door/window is closed',
                'boolean', 'value', false, doorIsClosed, '');
            await adapter.createObjectNotExists(
                data.address + '.doorIsLeftOpen', 'Indicates whether the door/window is left open',
                'boolean', 'value', false, false, '');
        }
    }
}

/**
 *
 * @param {Object} adapter
 * @param {{address: String, rssi: Number, id: String,
 *          serviceData: {model: 'H'|'T'|'c'|'s'|'d'|'i'|'o'|'w', modelName: String, battery: Number, state: Boolean, mode: Boolean,
 *                        temperature: {c: Number, f: Number}, humidity: Number,
 *                        position: Number, calibration: Number, lightLevel: String, movement: Boolean, doorState: String}}} data
 */
async function setAdvertisementData(adapter, data) {
    adapter.log.silly(`[setStateValues] ${typeof data !== 'undefined' ? JSON.stringify(data) : 'null'}`);

    if (data.serviceData) {
        adapter.setStateConditional('info.connection', true, true);
        adapter.setStateConditional(data.address + '.deviceInfo.rssi', data.rssi, true);
        adapter.setStateConditional(data.address + '.deviceInfo.id', data.id, true);
        adapter.setStateConditional(data.address + '.deviceInfo.model', data.serviceData.model, true);
        adapter.setStateConditional(data.address + '.deviceInfo.modelName', data.serviceData.modelName, true);
        adapter.setStateConditional(data.address + '.deviceInfo.productName', helper.getProductName(data.serviceData.model), true);
        adapter.setStateConditional(data.address + '.deviceInfo.battery', data.serviceData.battery, true);
        adapter.setStateConditional(data.address + '.deviceInfo.json', JSON.stringify(data), true);
        if (data.serviceData.model === 'H') {
            // SwitchBot Bot (WoHand)
            adapter.setStateConditional(data.address + '.deviceInfo.switchMode', data.serviceData.mode, true);
            adapter.setStateConditional(data.address + '.deviceInfo.state', data.serviceData.state, true);
            const state = await adapter.getStateAsync(data.address + '.control.inverseOnOff');
            if (state) {
                adapter.inverseOnOff[data.address] = !!state.val;
                adapter.switchbotDevice[data.address].on = adapter.getOnStateValue(data);
                adapter.setStateConditional(data.address + '.on', adapter.switchbotDevice[data.address].on, true);
            }
        } else if ((data.serviceData.model === 'T') || (data.serviceData.model === 'i') || (data.serviceData.model === 'w')) {
            // SwitchBot Meter (WoSensorTH)
            adapter.setStateConditional(data.address + '.temperature', data.serviceData.temperature.c, true);
            adapter.setStateConditional(data.address + '.temperatureF', data.serviceData.temperature.f, true);
            adapter.setStateConditional(data.address + '.humidity', data.serviceData.humidity, true);
        } else if (data.serviceData.model === 'c') {
            // SwitchBot Curtain (WoCurtain)
            adapter.setStateConditional(data.address + '.calibration', data.serviceData.calibration, true);
            adapter.setStateConditional(data.address + '.position', data.serviceData.position, true);
            adapter.setStateConditional(data.address + '.lightLevel', data.serviceData.lightLevel, true);
        } else if ((data.serviceData.model === 's') || (data.serviceData.model === 'd')) {
            // WoMotion and WoContact
            adapter.setStateConditional(data.address + '.movement', data.serviceData.movement, true);
            adapter.setStateConditional(data.address + '.lightLevel', data.serviceData.lightLevel, true);
            const isBright = (data.serviceData.lightLevel === 'bright');
            adapter.setStateConditional(data.address + '.isBright', isBright, true);
            const isDark = !isBright;
            adapter.setStateConditional(data.address + '.isDark', isDark, true);
            if (data.serviceData.model === 'd') {
                // WoContact
                const doorState = adaptDoorStateName(data.serviceData.doorState);
                adapter.setStateConditional(data.address + '.doorState', doorState, true);
                const doorIsClosed = (doorState === 'closed');
                adapter.setStateConditional(data.address + '.doorIsClosed', doorIsClosed, true);
                const doorIsOpen = !doorIsClosed;
                adapter.setStateConditional(data.address + '.doorIsOpen', doorIsOpen, true);
                const doorIsLeftOpen = (doorState === 'left open');
                adapter.setStateConditional(data.address + '.doorIsLeftOpen', doorIsLeftOpen, true);
            }
        }
    }
}

function adaptDoorStateName(internalState) {
    switch (internalState) {
        case 'close':
            return 'closed';
        case 'timeout no closed':
            return 'left open';
        default:
            return internalState;
    }
}

/**
 *
 * @param {Object} adapter
 * @param {String} id
 * @param {String} name
 */
async function createDeviceNotExists(adapter, id, name) {
    adapter.setObjectNotExists(id, {
        type: 'device',
        common: {
            name: name
        },
        native: {}
    });
}

/**
 *
 * @param {Object} adapter
 * @param {String} id
 * @param {String} name
 */
async function createChannelNotExists(adapter, id, name) {
    adapter.setObjectNotExists(id, {
        type: 'channel',
        common: {
            name: name
        },
        native: {}
    });
}

/**
 *
 * @param {Object} adapter
 * @param {String} id
 * @param {String} name
 * @param {String} type
 * @param {String} role
 * @param {Boolean} write
 * @param {any} def
 * @param {String} unit
 */
async function createObjectNotExists(adapter, id, name, type, role, write, def, unit) {
    adapter.setObjectNotExists(id, {
        type: 'state',
        common: {
            name: name,
            type: type,
            role: role,
            read: true,
            write: write,
            def: def,
            unit: unit
        },
        native: {}
    });
}

module.exports = {
    createBotObjects,
    createDeviceNotExists,
    createChannelNotExists,
    createObjectNotExists,
    setAdvertisementData
};
