/**
 * @module config/settings
 * Typed wrappers for all Antigravity VS Code settings.
 */

import * as vscode from 'vscode';
import { RedactStrategy } from '../core/redactor';

/** The configuration section name used in package.json. */
const SECTION = 'antigravity';

/**
 * Read the current `antigravity.redactStrategy` setting.
 * @returns `'full'`, `'partial'`, or `'placeholder'` (default: `'placeholder'`).
 */
export function getRedactStrategy(): RedactStrategy {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<RedactStrategy>('redactStrategy', 'placeholder');
}

/**
 * Whether real-time scanning on text change is enabled.
 * @returns `true` by default.
 */
export function isRealTimeScanningEnabled(): boolean {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<boolean>('enableRealTimeScanning', true);
}

/**
 * Whether to scan files automatically on save.
 * @returns `true` by default.
 */
export function isScanOnSaveEnabled(): boolean {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<boolean>('scanOnSave', true);
}

/**
 * The minimum Shannon entropy threshold for flagging high-entropy strings.
 * @returns `3.5` by default.
 */
export function getEntropyThreshold(): number {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<number>('entropyThreshold', 3.5);
}

/**
 * Whether to show colored gutter icons next to detected secrets.
 * @returns `true` by default.
 */
export function showGutterIcons(): boolean {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<boolean>('showGutterIcons', true);
}

/**
 * Pattern IDs that are currently ignored / disabled.
 * @returns An array of pattern ID strings.
 */
export function getIgnoredPatternIds(): string[] {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<string[]>('ignoredPatternIds', []);
}
