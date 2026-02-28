"use strict";
/**
 * @module config/policyLoader
 * Reads and watches the `.antigravity.json` team policy file from the workspace root.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicy = loadPolicy;
exports.policyPatternsToDefinitions = policyPatternsToDefinitions;
exports.watchPolicyFile = watchPolicyFile;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
/**
 * Load the team policy file from the workspace root.
 *
 * @returns The parsed policy, or `undefined` if no file exists.
 */
function loadPolicy() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }
    const policyPath = path.join(workspaceFolders[0].uri.fsPath, '.antigravity.json');
    if (!fs.existsSync(policyPath)) {
        return undefined;
    }
    try {
        const raw = fs.readFileSync(policyPath, 'utf-8');
        return JSON.parse(raw);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showWarningMessage(`Antigravity: Failed to parse .antigravity.json — ${message}`);
        return undefined;
    }
}
/**
 * Convert policy custom patterns to `PatternDefinition[]` consumable by the detector.
 */
function policyPatternsToDefinitions(policy) {
    if (!policy.customPatterns) {
        return [];
    }
    return policy.customPatterns.map((p) => ({
        id: p.id,
        type: p.type,
        pattern: new RegExp(p.pattern, 'g'),
        severity: p.severity,
        description: p.description,
    }));
}
/**
 * Watch the `.antigravity.json` file for changes and invoke a callback on reload.
 *
 * @param onReload - Callback invoked with the newly loaded policy (or `undefined`).
 * @returns A disposable that stops watching.
 */
function watchPolicyFile(onReload) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/.antigravity.json');
    const reload = () => onReload(loadPolicy());
    watcher.onDidCreate(reload);
    watcher.onDidChange(reload);
    watcher.onDidDelete(() => onReload(undefined));
    return watcher;
}
//# sourceMappingURL=policyLoader.js.map