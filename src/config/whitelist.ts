/**
 * @module config/whitelist
 * Hashed false-positive store — marks specific values as "safe" so they
 * are not flagged by future scans. Raw values are never persisted.
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';

const STATE_KEY = 'antigravity.whitelistHashes';

/**
 * Compute a SHA-256 hash of a value to store in the whitelist.
 * The raw value is never persisted.
 */
function hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Manages the whitelist of "safe" values stored as SHA-256 hashes
 * in VS Code workspace state.
 */
export class WhitelistStore {
    private hashes: Set<string>;

    constructor(private readonly state: vscode.Memento) {
        const persisted = state.get<string[]>(STATE_KEY, []);
        this.hashes = new Set(persisted);
    }

    /**
     * Check whether a raw value has been marked as safe.
     *
     * @param value - The raw secret value.
     * @returns `true` if the value is whitelisted.
     */
    public isWhitelisted(value: string): boolean {
        return this.hashes.has(hashValue(value));
    }

    /**
     * Mark a raw value as safe by storing its hash.
     * The raw value is never persisted.
     *
     * @param value - The raw secret value to whitelist.
     */
    public addToWhitelist(value: string): void {
        this.hashes.add(hashValue(value));
        this.persist();
    }

    /**
     * Remove a previously whitelisted value.
     *
     * @param value - The raw secret value to un-whitelist.
     */
    public removeFromWhitelist(value: string): void {
        this.hashes.delete(hashValue(value));
        this.persist();
    }

    /**
     * Clear the entire whitelist.
     */
    public clear(): void {
        this.hashes.clear();
        this.persist();
    }

    /**
     * Returns the total count of whitelisted entries.
     */
    public get size(): number {
        return this.hashes.size;
    }

    private persist(): void {
        void this.state.update(STATE_KEY, Array.from(this.hashes));
    }
}
