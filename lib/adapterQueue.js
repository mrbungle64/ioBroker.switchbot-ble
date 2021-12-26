'use strict';

class Queue {
    constructor(adapter, name = 'queue', duplicateCheck = true) {
        this.adapter = adapter;
        this.name = name;
        this.duplicateCheck = duplicateCheck;

        /**
         * @type {{cmd: String, macAddress: String, value: any}[]}
         */
        this.entries = [];
    }

    /**
     * Add new entry
     * @param {String} cmd
     * @param {String} macAddress
     * @param {any} value
     */
    add(cmd, macAddress, value = null) {
        if (this.isDuplicateEntry(cmd, macAddress, value)) {
            this.adapter.log.debug('[' + this.name + '] skipping duplicate entry ' + cmd);
            return;
        }
        this.entries.push({
            cmd: cmd,
            macAddress: macAddress,
            value: value
        });
        this.adapter.startCommandInterval();
        this.adapter.log.debug('[' + this.name + '] Added command ' + cmd + ' to the queue (' + this.entries.length + ')');
    }

    async runAll() {
        await this.startNextItemFromQueue(true);
    }

    /**
     * Start next entry from queue
     * @param {Boolean} runAll
     * @return {Promise<void>}
     */
    async startNextItemFromQueue(runAll = false) {
        if (this.notEmpty()) {
            this.adapter.setIsBusy(true);
            const queuedEntry = this.entries.shift();
            if (typeof queuedEntry === 'object') {
                await this.adapter.deviceAction(
                    queuedEntry.cmd,
                    queuedEntry.macAddress,
                    queuedEntry.value
                );
            }
        }
        if (this.isEmpty()) {
            this.adapter.stopCommandInterval(false);
        } else if (runAll) {
            await this.startNextItemFromQueue(true);
        }
    }

    /**
     * Check if entry already exists
     * @param {String} cmd
     * @param {String} macAddress
     * @param {any} value
     */
    isDuplicateEntry(cmd, macAddress, value = null) {
        if (this.duplicateCheck) {
            return this.entries
                .filter(entryObject => entryObject.cmd === cmd && entryObject.macAddress === macAddress && entryObject.value === value)
                .length > 0;
        }
        return false;
    }

    isEmpty() {
        return (this.entries.length === 0);
    }

    notEmpty() {
        return (!this.isEmpty());
    }
}

module.exports = Queue;
