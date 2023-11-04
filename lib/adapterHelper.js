'use strict';

function decrypt(key, value) {
    let result = '';
    for (let i = 0; i < value.length; ++i) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
}

function getDeviceAddressById(id) {
    return id.split('.')[2].toLowerCase();
}

function getChannelNameById(id) {
    const channelName = id.split('.')[3];
    if (channelName === getStateNameById(id)) {
        return '';
    }
    return channelName;
}

function getStateNameById(id) {
    const pos = id.split('.').length - 1;
    return id.split('.')[pos];
}

function getProductName(model) {
    if (model === 'H') { // WoHand
        return 'SwitchBot Bot';
    } else if (model === 'e') { // WoHumi
        return 'SwitchBot Smart Humidifier';
    } else if (model === 'T') { // WoSensorTH
        return 'SwitchBot Meter';
    } else if (model === 'i') { // WoMeterPlus
        return 'SwitchBot Meter Plus';
    } else if (model === 'w') { // WoIOSensorTH
        return 'Indoor/Outdoor Hygrometer';
    } else if (model === 'c') { // WoCurtain
        return 'SwitchBot Curtain';
    } else if (model === 's') { // WoMotion
        return 'SwitchBot Motion Sensor';
    } else if (model === 'd') { // WoContact
        return 'SwitchBot Contact Sensor';
    } else if (model === 'o') { // WoSmartLock
        return 'SwitchBot Lock';
    }
    return 'unknown';
}

module.exports = {
    decrypt,
    getDeviceAddressById,
    getChannelNameById,
    getStateNameById,
    getProductName
};
