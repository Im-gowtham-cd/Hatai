/**
 * @module editor/codelens
 * CodeLens actions displayed above lines containing detected secrets.
 */

import * as vscode from 'vscode';
import { SecretMatch } from '../core/detector';

/**
 * Provides CodeLens items (Redact / Mark as Safe / Copy Redacted) above secret lines.
 */
export class AntigravityCodeLensProvider implements vscode.CodeLensProvider {
    private matchesByUri = new Map<string, SecretMatch[]>();
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    /**
     * Update the stored matches for a document and refresh CodeLenses.
     */
    public updateMatches(uri: vscode.Uri, matches: SecretMatch[]): void {
        this.matchesByUri.set(uri.toString(), matches);
        this._onDidChangeCodeLenses.fire();
    }

    /**
     * Clear stored matches for a document.
     */
    public clearMatches(uri: vscode.Uri): void {
        this.matchesByUri.delete(uri.toString());
        this._onDidChangeCodeLenses.fire();
    }

    public provideCodeLenses(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken,
    ): vscode.CodeLens[] {
        const matches = this.matchesByUri.get(document.uri.toString());
        if (!matches || matches.length === 0) {
            return [];
        }

        // Group matches by line to avoid duplicate CodeLenses on the same line.
        const lineMap = new Map<number, SecretMatch[]>();
        for (const match of matches) {
            const line = document.positionAt(match.start).line;
            const group = lineMap.get(line) ?? [];
            group.push(match);
            lineMap.set(line, group);
        }

        const lenses: vscode.CodeLens[] = [];

        for (const [line, lineMatches] of lineMap) {
            const range = new vscode.Range(line, 0, line, 0);
            const firstMatch = lineMatches[0];
            const count = lineMatches.length;
            const label = count > 1 ? `${count} secrets` : firstMatch.type;

            // Redact action
            lenses.push(
                new vscode.CodeLens(range, {
                    title: `🔒 Redact (${label})`,
                    command: 'antigravity.redactLine',
                    arguments: [document.uri, line],
                    tooltip: 'Replace secret(s) on this line with redacted placeholders',
                }),
            );

            // Mark as Safe action
            lenses.push(
                new vscode.CodeLens(range, {
                    title: 'Mark as Safe',
                    command: 'antigravity.markSafe',
                    arguments: [firstMatch.value],
                    tooltip: 'Add this value to the whitelist (hashed — the raw value is never stored)',
                }),
            );

            // Copy Redacted action
            lenses.push(
                new vscode.CodeLens(range, {
                    title: 'Copy Redacted',
                    command: 'antigravity.copyRedactedLine',
                    arguments: [document.uri, line],
                    tooltip: 'Copy this line with secrets replaced to clipboard',
                }),
            );
        }

        return lenses;
    }
}
