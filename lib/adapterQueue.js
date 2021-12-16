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
            this.adapter.log.silly('[' + this.name + '] skipping duplicate entry ' + cmd);
            return;
        }
        this.entries.push({
            cmd: cmd,
            macAddress: macAddress,
            value: value
        });
        this.adapter.log.silly('[' + this.name + '] Added command ' + cmd + ' to the queue (' + this.entries.length + ')');
    }

    async runAll() {
        await this.startNextItemFromQueue(true);
    }

    async startNextItemFromQueue(runAll = false) {
        const queued = this.entries[0];
        if (queued) {
            this.entries.shift();
            await this.adapter.deviceAction(queued.cmd, queued.macAddress, queued.value);
        }
        if (runAll && this.notEmpty()) {
            await this.startNextItemFromQueue(true);
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
