/**
 * @module config/policyLoader
 * Reads and watches the `.antigravity.json` team policy file from the workspace root.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PatternDefinition, PatternSeverity } from '../core/patterns';
import { RedactStrategy } from '../core/redactor';

/** Shape of the `.antigravity.json` team policy file. */
export interface TeamPolicy {
    version?: string;
    teamName?: string;
    customPatterns?: PolicyPatternEntry[];
    whitelist?: string[];
    redactStrategy?: RedactStrategy;
    ignoredFiles?: string[];
}

/** A single custom pattern defined in the policy file. */
interface PolicyPatternEntry {
    id: string;
    type: string;
    pattern: string; // regex string (not a RegExp object in JSON)
    severity: PatternSeverity;
    description: string;
}

/**
 * Load the team policy file from the workspace root.
 *
 * @returns The parsed policy, or `undefined` if no file exists.
 */
export function loadPolicy(): TeamPolicy | undefined {
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
        return JSON.parse(raw) as TeamPolicy;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showWarningMessage(
            `Antigravity: Failed to parse .antigravity.json — ${message}`,
        );
        return undefined;
    }
}

/**
 * Convert policy custom patterns to `PatternDefinition[]` consumable by the detector.
 */
export function policyPatternsToDefinitions(policy: TeamPolicy): PatternDefinition[] {
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
export function watchPolicyFile(
    onReload: (policy: TeamPolicy | undefined) => void,
): vscode.Disposable {
    const watcher = vscode.workspace.createFileSystemWatcher('**/.antigravity.json');

    const reload = () => onReload(loadPolicy());

    watcher.onDidCreate(reload);
    watcher.onDidChange(reload);
    watcher.onDidDelete(() => onReload(undefined));

    return watcher;
}
