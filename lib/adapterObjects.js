'use strict';

const helper = require('./adapterHelper');

/**
 * @param {Object} adapter
 * @param {{address: String, rssi: Number, id: String,
 *          serviceData: {model: 'H'|'T'|'e'|'s'|'d'|'c'|'{'|'x'|'u'|'g'|'j'|'o'|'i'|'r'|'w',
 *                        modelName: String, battery: Number, state: Boolean, mode: Boolean,
 *                        temperature: {c: Number, f: Number}, humidity: Number,
 *                        celsius: Number, fahrenheit: Number, fahrenheit_mode: Boolean,
 *                        position: Number, calibration: Number, lightLevel: String,
 *                        movement: Boolean, doorState: String, led: Number, iot: Number,
 *                        sense_distance: Number, is_light: Boolean, contact_open: Boolean,
 *                        contact_timeout: Boolean, button_count: Number, tested: Boolean}}} data
 */
async function createBotObjects(adapter, data) {
    await adapter.createDeviceNotExists(data.address);
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.rssi', 'Received Signal Strength Indication',
        'number', 'value', false, data.rssi, '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.battery', 'Battery level',
        'number', 'value.battery', false, data.serviceData.battery, '%');
    await adapter.createChannelNotExists(data.address + '.deviceInfo');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.id', 'ID of the device', 'string', 'text', false, data.id, '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.model', 'Model', 'string', 'text', false, data.serviceData.model, '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.modelName', 'Model name', 'string', 'text', false, data.serviceData.modelName, '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.productName', 'Product name', 'string', 'text', false, '', '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.json', 'JSON data set', 'json', 'value', false, '[]', '');
    if (data.serviceData.model === 'H') {
        // SwitchBot "Bot"
        await adapter.createChannelNotExists(data.address + '.control');
        await adapter.createObjectNotExists(
            data.address + '.control.inverseOnOff', 'Whether on/off direction is inverted',
            'boolean', 'indicator.status', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.press', 'Press the Bot\'s arm', 'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.up', 'Put up the Bot\'s arm', 'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.down', 'Put down the Bot\'s arm', 'boolean', 'button', true, false, '');
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
                data.address + '.control.turnOn', 'Turn on the Bot', 'boolean', 'button', true, false, '');
            await adapter.createObjectNotExists(
                data.address + '.control.turnOff', 'Turn off the Bot', 'boolean', 'button', true, false, '');
        }
    } else if ((data.serviceData.model === 'T') || (data.serviceData.model === 'i') || (data.serviceData.model === 'w')) {
        // SwitchBot "Meter" (Plus) and "Indoor/Outdoor Thermo-Hygrometer"
        // Check for different temperature data formats
        let tempC = 0, tempF = 32;
        if (data.serviceData.temperature && data.serviceData.temperature.c !== undefined) {
            // Format 1: temperature object with c and f properties
            tempC = data.serviceData.temperature.c;
            tempF = data.serviceData.temperature.f;
        } else if (typeof data.serviceData.celsius === 'number' && typeof data.serviceData.fahrenheit === 'number') {
            // Format 2: direct celsius and fahrenheit properties (for WoIOSensorTH)
            tempC = data.serviceData.celsius;
            tempF = data.serviceData.fahrenheit;
        }
        const humidity = data.serviceData.humidity || 0;
        await adapter.createObjectNotExists(
            data.address + '.temperature', 'Temperature value',
            'number', 'value.temperature', false, tempC, '°C');
        await adapter.createObjectNotExists(
            data.address + '.temperatureF', 'Temperature value (Fahrenheit)',
            'number', 'value.temperature', false, tempF, '°F');
        await adapter.createObjectNotExists(
            data.address + '.humidity', 'Humidity value',
            'number', 'value.humidity', false, humidity, '%');
        // Offset values
        await adapter.createChannelNotExists(data.address + '.offset');
        await adapter.createObjectNotExists(
            data.address + '.offset.temperature', 'Temperature offset value', 'number', 'value', true, 0.0);
        await adapter.createObjectNotExists(
            data.address + '.offset.temperatureF', 'Temperature offset value (Fahrenheit)', 'number', 'value', true, 0.0);
        await adapter.createObjectNotExists(
            data.address + '.offset.humidity', 'Humidity offset value', 'number', 'value', true, 0);
    } else if ((data.serviceData.model === 'c') || (data.serviceData.model === '{')) {
        // SwitchBot "Curtain" / "Curtain 3"
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
        // SwitchBot "Motion" and "Contact"
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

        if (data.serviceData.model === 's') {
            // Additional Motion Sensor specific properties
            await adapter.createObjectNotExists(
                data.address + '.led', 'LED status',
                'number', 'value', false, data.serviceData.led || 0, '');
            await adapter.createObjectNotExists(
                data.address + '.iot', 'IoT status',
                'number', 'value', false, data.serviceData.iot || 0, '');
            await adapter.createObjectNotExists(
                data.address + '.sense_distance', 'Sense distance',
                'number', 'value', false, data.serviceData.sense_distance || 0, '');
            await adapter.createObjectNotExists(
                data.address + '.is_light', 'Light status as boolean',
                'boolean', 'value', false, data.serviceData.is_light || false, '');
        }

        if (data.serviceData.model === 'd') {
            // SwitchBot "Contact"
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

            // Additional Contact Sensor specific properties
            await adapter.createObjectNotExists(
                data.address + '.contact_open', 'Direct contact open status',
                'boolean', 'value', false, data.serviceData.contact_open || false, '');
            await adapter.createObjectNotExists(
                data.address + '.contact_timeout', 'Contact timeout status',
                'boolean', 'value', false, data.serviceData.contact_timeout || false, '');
            await adapter.createObjectNotExists(
                data.address + '.button_count', 'Button press count',
                'number', 'value', false, data.serviceData.button_count || 0, '');
            await adapter.createObjectNotExists(
                data.address + '.tested', 'Device tested status',
                'boolean', 'value', false, data.serviceData.tested || false, '');
        }
    }
}

/**
 * @param {Object} adapter
 * @param {{address: String, rssi: Number, id: String,
 *          serviceData: {model: 'H'|'T'|'e'|'s'|'d'|'c'|'{'|'x'|'u'|'g'|'j'|'o'|'i'|'r'|'w',
 *                        modelName: String, battery: Number, state: Boolean, mode: Boolean,
 *                        temperature: {c: Number, f: Number}, humidity: Number,
 *                        celsius: Number, fahrenheit: Number, fahrenheit_mode: Boolean,
 *                        position: Number, calibration: Number, lightLevel: String,
 *                        movement: Boolean, doorState: String, led: Number, iot: Number,
 *                        sense_distance: Number, is_light: Boolean, contact_open: Boolean,
 *                        contact_timeout: Boolean, button_count: Number, tested: Boolean}}} data
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
            // SwitchBot "Bot"
            adapter.setStateConditional(data.address + '.deviceInfo.switchMode', data.serviceData.mode, true);
            adapter.setStateConditional(data.address + '.deviceInfo.state', data.serviceData.state, true);
            const state = await adapter.getStateAsync(data.address + '.control.inverseOnOff');
            if (state) {
                adapter.inverseOnOff[data.address] = !!state.val;
                adapter.switchbotDevice[data.address].on = adapter.getOnStateValue(data);
                adapter.setStateConditional(data.address + '.on', adapter.switchbotDevice[data.address].on, true);
            }
        } else if ((data.serviceData.model === 'T') || (data.serviceData.model === 'i') || (data.serviceData.model === 'w')) {
            let state;
            // SwitchBot "Meter" (Plus) and "Indoor/Outdoor Thermo-Hygrometer"

            // Check for different temperature data formats
            let hasTemperatureData = false;
            let tempC = 0, tempF = 32; // Initialize with default values

            if (data.serviceData.temperature && typeof data.serviceData.temperature === 'object') {
                // Format 1: temperature object with c and f properties
                tempC = data.serviceData.temperature.c;
                tempF = data.serviceData.temperature.f;
                hasTemperatureData = true;
            } else if (typeof data.serviceData.celsius === 'number' && typeof data.serviceData.fahrenheit === 'number') {
                // Format 2: direct celsius and fahrenheit properties (for WoIOSensorTH)
                tempC = data.serviceData.celsius;
                tempF = data.serviceData.fahrenheit;
                hasTemperatureData = true;
            }

            if (hasTemperatureData) {
                state = await adapter.getStateAsync(data.address + '.offset.temperature');
                const offsetTemperature = state ? Number(state.val).toFixed(1) : '0.0';
                state = await adapter.getStateAsync(data.address + '.offset.temperatureF');
                const offsetTemperatureF = state ? Number(state.val).toFixed(1) : '0.0';
                state = await adapter.getStateAsync(data.address + '.offset.humidity');
                const offsetHumidity = state ? Number(state.val).toFixed(0) : '0';
                adapter.setStateConditional(data.address + '.offset.temperature', offsetTemperature, true);
                adapter.setStateConditional(data.address + '.offset.temperatureF', offsetTemperatureF, true);
                adapter.setStateConditional(data.address + '.offset.humidity', offsetHumidity, true);
                const temperature = tempC + Number(offsetTemperature);
                const temperatureF = tempF + Number(offsetTemperatureF);
                const humidity = data.serviceData.humidity + Number(offsetHumidity);
                adapter.setStateConditional(data.address + '.temperature', temperature, true);
                adapter.setStateConditional(data.address + '.temperatureF', temperatureF, true);
                adapter.setStateConditional(data.address + '.humidity', humidity, true);
            } else {
                adapter.log.debug(`[setAdvertisementData] Temperature data structure for device ${data.address}: ${JSON.stringify(data.serviceData)}`);
                adapter.log.warn(`[setAdvertisementData] Temperature data is missing for device ${data.address}`);
            }
        } else if ((data.serviceData.model === 'c') || (data.serviceData.model === '{')) {
            // SwitchBot "Curtain"
            adapter.setStateConditional(data.address + '.calibration', data.serviceData.calibration, true);
            adapter.setStateConditional(data.address + '.position', data.serviceData.position, true);
            adapter.setStateConditional(data.address + '.lightLevel', data.serviceData.lightLevel, true);
        } else if ((data.serviceData.model === 's') || (data.serviceData.model === 'd')) {
            // SwitchBot "Motion" and "Contact"
            adapter.setStateConditional(data.address + '.movement', data.serviceData.movement, true);
            adapter.setStateConditional(data.address + '.lightLevel', data.serviceData.lightLevel, true);
            const isBright = (data.serviceData.lightLevel === 'bright');
            adapter.setStateConditional(data.address + '.isBright', isBright, true);
            const isDark = !isBright;
            adapter.setStateConditional(data.address + '.isDark', isDark, true);

            if (data.serviceData.model === 's') {
                // Additional Motion Sensor specific properties
                adapter.setStateConditional(data.address + '.led', data.serviceData.led || 0, true);
                adapter.setStateConditional(data.address + '.iot', data.serviceData.iot || 0, true);
                adapter.setStateConditional(data.address + '.sense_distance', data.serviceData.sense_distance || 0, true);
                adapter.setStateConditional(data.address + '.is_light', data.serviceData.is_light || false, true);
            }

            if (data.serviceData.model === 'd') {
                // SwitchBot "Contact"
                const doorState = adaptDoorStateName(data.serviceData.doorState);
                adapter.setStateConditional(data.address + '.doorState', doorState, true);
                const doorIsClosed = (doorState === 'closed');
                adapter.setStateConditional(data.address + '.doorIsClosed', doorIsClosed, true);
                const doorIsOpen = !doorIsClosed;
                adapter.setStateConditional(data.address + '.doorIsOpen', doorIsOpen, true);
                const doorIsLeftOpen = (doorState === 'left open');
                adapter.setStateConditional(data.address + '.doorIsLeftOpen', doorIsLeftOpen, true);

                // Additional Contact Sensor specific properties
                adapter.setStateConditional(data.address + '.contact_open', data.serviceData.contact_open || false, true);
                adapter.setStateConditional(data.address + '.contact_timeout', data.serviceData.contact_timeout || false, true);
                adapter.setStateConditional(data.address + '.button_count', data.serviceData.button_count || 0, true);
                adapter.setStateConditional(data.address + '.tested', data.serviceData.tested || false, true);
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
