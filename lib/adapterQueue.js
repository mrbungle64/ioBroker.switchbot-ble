'use strict';

class Queue {
    constructor(adapter, name = 'queue', duplicateCheck = true) {
        this.adapter = adapter;
        this.name = name;
        this.duplicateCheck = duplicateCheck;
        this.entries = [];
    }

    add(cmd, macAddress = null, value = null) {
        if (this.isDuplicateEntry(cmd, macAddress, value)) {
            return;
        }
        this.entries.push({
            cmd: cmd,
            macAddress: macAddress,
            value: value
        });
        this.adapter.log.silly('[' + this.name + '] Added ' + cmd + ' to the queue (' + this.entries.length + ')');
    }

    async runAll() {
        await this.startNextItemFromQueue(true);
    }

    async startNextItemFromQueue(runAll = false) {
        const queued = this.entries[0];
        if (queued) {
            this.adapter.setIsBusy(true);
            this.entries.shift();
            await this.execNextCmd(queued.cmd, queued.macAddress, queued.value);
            this.adapter.setIsBusy(false);
        }
        if (runAll && this.notEmpty()) {
            await this.startNextItemFromQueue(true);
        }
    }

    async execNextCmd(cmd, macAddress = null, value = null) {
        this.adapter.log.debug('[execNextCmd] cmd: ' + cmd);
        switch (cmd) {
            case 'up':
            case 'down':
            case 'press':
            case 'turnOn':
            case 'turnOff':
            case 'open':
            case 'close':
            case 'pause':
                await this.adapter.deviceAction(cmd, macAddress);
                break;
            case 'runToPos':
                await this.adapter.deviceAction(cmd, macAddress, value);
                break;
            default:
                this.adapter.log.debug('[execNextCmd] unknown cmd: ' + cmd);
        }
    }

    isDuplicateEntry(cmd, macAddress = null, value = null) {
        if (this.duplicateCheck) {
            for (let i = 0; i < this.entries.length; i++) {
                const entryObject = this.entries[i];
                if ((entryObject['cmd'] === cmd) && (entryObject['macAddress'] === macAddress) && (entryObject['value'] === value)) {
                    this.adapter.log.silly('[' + this.name + '] Skipping ' + cmd);
                    return true;
                }
            }
        }
        return false;
    }

    isEmpty() {
        return (this.entries.length === 0);
    }

    notEmpty() {
        return (!this.isEmpty());
    }

    resetQueue() {
        this.entries.splice(0, this.entries.length);
        this.entries = [];
    }
}

module.exports = Queue;
