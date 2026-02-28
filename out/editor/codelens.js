"use strict";
/**
 * @module editor/codelens
 * CodeLens actions displayed above lines containing detected secrets.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntigravityCodeLensProvider = void 0;
const vscode = require("vscode");
/**
 * Provides CodeLens items (Redact / Mark as Safe / Copy Redacted) above secret lines.
 */
class AntigravityCodeLensProvider {
    constructor() {
        this.matchesByUri = new Map();
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
    }
    /**
     * Update the stored matches for a document and refresh CodeLenses.
     */
    updateMatches(uri, matches) {
        this.matchesByUri.set(uri.toString(), matches);
        this._onDidChangeCodeLenses.fire();
    }
    /**
     * Clear stored matches for a document.
     */
    clearMatches(uri) {
        this.matchesByUri.delete(uri.toString());
        this._onDidChangeCodeLenses.fire();
    }
    provideCodeLenses(document, _token) {
        const matches = this.matchesByUri.get(document.uri.toString());
        if (!matches || matches.length === 0) {
            return [];
        }
        // Group matches by line to avoid duplicate CodeLenses on the same line.
        const lineMap = new Map();
        for (const match of matches) {
            const line = document.positionAt(match.start).line;
            const group = lineMap.get(line) ?? [];
            group.push(match);
            lineMap.set(line, group);
        }
        const lenses = [];
        for (const [line, lineMatches] of lineMap) {
            const range = new vscode.Range(line, 0, line, 0);
            const firstMatch = lineMatches[0];
            const count = lineMatches.length;
            const label = count > 1 ? `${count} secrets` : firstMatch.type;
            // Redact action
            lenses.push(new vscode.CodeLens(range, {
                title: `🔒 Redact (${label})`,
                command: 'antigravity.redactLine',
                arguments: [document.uri, line],
                tooltip: 'Replace secret(s) on this line with redacted placeholders',
            }));
            // Mark as Safe action
            lenses.push(new vscode.CodeLens(range, {
                title: 'Mark as Safe',
                command: 'antigravity.markSafe',
                arguments: [firstMatch.value],
                tooltip: 'Add this value to the whitelist (hashed — the raw value is never stored)',
            }));
            // Copy Redacted action
            lenses.push(new vscode.CodeLens(range, {
                title: 'Copy Redacted',
                command: 'antigravity.copyRedactedLine',
                arguments: [document.uri, line],
                tooltip: 'Copy this line with secrets replaced to clipboard',
            }));
        }
        return lenses;
    }
}
exports.AntigravityCodeLensProvider = AntigravityCodeLensProvider;
//# sourceMappingURL=codelens.js.map