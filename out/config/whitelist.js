"use strict";
/**
 * @module config/whitelist
 * Hashed false-positive store — marks specific values as "safe" so they
 * are not flagged by future scans. Raw values are never persisted.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhitelistStore = void 0;
const crypto = require("crypto");
const STATE_KEY = 'antigravity.whitelistHashes';
/**
 * Compute a SHA-256 hash of a value to store in the whitelist.
 * The raw value is never persisted.
 */
function hashValue(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}
/**
 * Manages the whitelist of "safe" values stored as SHA-256 hashes
 * in VS Code workspace state.
 */
class WhitelistStore {
    constructor(state) {
        this.state = state;
        const persisted = state.get(STATE_KEY, []);
        this.hashes = new Set(persisted);
    }
    /**
     * Check whether a raw value has been marked as safe.
     *
     * @param value - The raw secret value.
     * @returns `true` if the value is whitelisted.
     */
    isWhitelisted(value) {
        return this.hashes.has(hashValue(value));
    }
    /**
     * Mark a raw value as safe by storing its hash.
     * The raw value is never persisted.
     *
     * @param value - The raw secret value to whitelist.
     */
    addToWhitelist(value) {
        this.hashes.add(hashValue(value));
        this.persist();
    }
    /**
     * Remove a previously whitelisted value.
     *
     * @param value - The raw secret value to un-whitelist.
     */
    removeFromWhitelist(value) {
        this.hashes.delete(hashValue(value));
        this.persist();
    }
    /**
     * Clear the entire whitelist.
     */
    clear() {
        this.hashes.clear();
        this.persist();
    }
    /**
     * Returns the total count of whitelisted entries.
     */
    get size() {
        return this.hashes.size;
    }
    persist() {
        void this.state.update(STATE_KEY, Array.from(this.hashes));
    }
}
exports.WhitelistStore = WhitelistStore;
//# sourceMappingURL=whitelist.js.map