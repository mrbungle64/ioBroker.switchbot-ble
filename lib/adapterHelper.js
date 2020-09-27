'use strict';

function decrypt(key, value) {
    let result = '';
    for (let i = 0; i < value.length; ++i) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
}

function getDeviceAddressById(id) {
    return id.split('.')[2];
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

module.exports = {
    decrypt,
    getDeviceAddressById,
    getChannelNameById,
    getStateNameById
};
