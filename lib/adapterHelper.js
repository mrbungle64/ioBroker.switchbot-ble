'use strict';

/**
 * Retrieves the device address by the provided id
 *
 * @param {string} id - The id of the device
 * @return {string} The device address in lowercase
 */
function getDeviceAddressById(id) {
    return id.split('.')[2].toLowerCase();
}

/**
 * Retrieves the channel name by the provided id
 *
 * @param {string} id - The id of the channel
 * @returns {string} The channel name
 */
function getChannelNameById(id) {
    const channelName = id.split('.')[3];
    if (channelName === getStateNameById(id)) {
        return '';
    }
    return channelName;
}

/**
 * Retrieves the state name from the given id
 *
 * @param {string} id - The id of the state
 * @return {string} - The name of the state
 */
function getStateNameById(id) {
    const pos = id.split('.').length - 1;
    return id.split('.')[pos];
}

/**
 * Retrieves the product name based on the given model code
 *
 * @param {string} model - The model code for a product
 * @return {string} - The product name corresponding to the model code.
 * Returns "unknown" if the model code is not recognized
 */
function getProductName(model) {
    switch (model) {
        case 'H':
            // WoHand
            return 'SwitchBot Bot';
        case 'T':
            // WoSensorTH
            return 'SwitchBot Meter';
        case 'e':
            // WoHumi
            return 'SwitchBot Smart Humidifier';
        case 's':
            // WoMotion
            return 'SwitchBot Motion Sensor';
        case 'd':
            // WoContact
            return 'SwitchBot Contact Sensor';
        case 'c':
            // WoCurtain
            return 'SwitchBot Curtain';
        case '{':
            // WoCurtain (3)
            return 'SwitchBot Curtain 3';
        case 'x':
            // not supported yet
            return 'WoBlindTilt';
        case 'u':
            // not supported yet
            return 'WoBulb';
        case 'g':
            // not supported yet
            return 'WoPlugMini (US)';
        case 'j':
            // not supported yet
            return 'WoPlugMini (JP)';
        case 'o':
            // not supported yet
            return 'WoSmartLock';
        case 'i':
            // WoMeterPlus
            return 'SwitchBot Meter Plus';
        case 'r':
            // not supported yet
            return 'WoStrip';
        case 'w':
            // WoIOSensorTH
            return 'Indoor/Outdoor Hygrometer';
        default:
            return 'unknown';
    }
}

module.exports = {
    getDeviceAddressById,
    getChannelNameById,
    getStateNameById,
    getProductName
};
