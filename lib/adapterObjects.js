'use strict';

async function createBotObjects(adapter, data) {
    await adapter.createChannelNotExists(data.address);
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.rssi', 'Received Signal Strength Indication',
        'number', 'value', false, '', '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.battery', 'Battery value',
        'number', 'value.battery', false, '', '%');
    await adapter.createChannelNotExists(data.address + '.deviceInfo');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.switchMode', '"Switch mode": true, "Press mode": false',
        'string', 'text', false, true, '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.id', 'ID of the device',
        'string', 'text', false, '', '');
    await adapter.createObjectNotExists(
        data.address + '.deviceInfo.model', 'Model',
        'string', 'text', false, '', '');
    if (data.serviceData.model === 'H') {
        await adapter.createChannelNotExists(data.address + '.control');
        await adapter.createObjectNotExists(
            data.address + '.control.inverseOnOff', 'Whether on/off direction is inverted',
            'boolean', 'indicator.status', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.turnOn', 'Turn on SwitchBot',
            'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.turnOff', 'Turn off SwitchBot',
            'boolean', 'button', true, false, '');
        await adapter.createObjectNotExists(
            data.address + '.control.press', 'Press SwitchBot',
            'boolean', 'button', true, false, '');
        if (data.serviceData.mode === true) {
            await adapter.createObjectNotExists(
                data.address + '.deviceInfo.state', 'Indicates whether the switch status is on or off ("Switch mode" only)',
                'boolean', 'indicator.status', false, '', '');
            await adapter.createObjectNotExists(
                data.address + '.on', 'Indicates whether the switch status is on ("Switch mode" only)',
                'boolean', 'indicator.status', false, '', '');
        }
    } else if (data.serviceData.model === 'T') {
        await adapter.createObjectNotExists(
            data.address + '.temperature', 'Temperature value',
            'number', 'value.temperature', false, '', '°C');
        await adapter.createObjectNotExists(
            data.address + '.humidity', 'Humidity value',
            'number', 'value.humidity', false, '', '%');
    }
    adapter.getState(data.address + '.control.inverseOnOff', (err, state) => {
        if (!err && state) {
            adapter.inverseOnOff[data.address] = state.val;
            adapter.setState(data.address + '.control.inverseOnOff.inverseOnOff', state.val, true);
        }
    });
}

async function createChannelNotExists(adapter, id, name) {
    adapter.setObjectNotExists(id, {
        type: 'channel',
        common: {
            name: name
        },
        native: {}
    });
}

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
    createChannelNotExists,
    createObjectNotExists
};
