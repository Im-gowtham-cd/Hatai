"use strict";
/**
 * @module config/settings
 * Typed wrappers for all Antigravity VS Code settings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedactStrategy = getRedactStrategy;
exports.isRealTimeScanningEnabled = isRealTimeScanningEnabled;
exports.isScanOnSaveEnabled = isScanOnSaveEnabled;
exports.getEntropyThreshold = getEntropyThreshold;
exports.showGutterIcons = showGutterIcons;
exports.getIgnoredPatternIds = getIgnoredPatternIds;
const vscode = require("vscode");
/** The configuration section name used in package.json. */
const SECTION = 'antigravity';
/**
 * Read the current `antigravity.redactStrategy` setting.
 * @returns `'full'`, `'partial'`, or `'placeholder'` (default: `'placeholder'`).
 */
function getRedactStrategy() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('redactStrategy', 'placeholder');
}
/**
 * Whether real-time scanning on text change is enabled.
 * @returns `true` by default.
 */
function isRealTimeScanningEnabled() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('enableRealTimeScanning', true);
}
/**
 * Whether to scan files automatically on save.
 * @returns `true` by default.
 */
function isScanOnSaveEnabled() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('scanOnSave', true);
}
/**
 * The minimum Shannon entropy threshold for flagging high-entropy strings.
 * @returns `3.5` by default.
 */
function getEntropyThreshold() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('entropyThreshold', 3.5);
}
/**
 * Whether to show colored gutter icons next to detected secrets.
 * @returns `true` by default.
 */
function showGutterIcons() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('showGutterIcons', true);
}
/**
 * Pattern IDs that are currently ignored / disabled.
 * @returns An array of pattern ID strings.
 */
function getIgnoredPatternIds() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('ignoredPatternIds', []);
}
//# sourceMappingURL=settings.js.map