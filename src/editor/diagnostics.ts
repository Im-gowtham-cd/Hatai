/**
 * @module editor/diagnostics
 * VS Code Problems panel integration for detected secrets.
 */

import * as vscode from 'vscode';
import { SecretMatch } from '../core/detector';

/** Name of the diagnostic collection used by Antigravity. */
export const DIAGNOSTIC_COLLECTION_NAME = 'antigravity';

/**
 * Map a secret severity to the corresponding VS Code diagnostic severity.
 */
function mapSeverity(severity: SecretMatch['severity']): vscode.DiagnosticSeverity {
    switch (severity) {
        case 'critical':
            return vscode.DiagnosticSeverity.Error;
        case 'high':
            return vscode.DiagnosticSeverity.Warning;
        case 'medium':
            return vscode.DiagnosticSeverity.Information;
    }
}

/**
 * Update the Problems panel with diagnostics for detected secrets.
 *
 * @param document    - The text document that was scanned.
 * @param matches     - Detected secrets.
 * @param collection  - The diagnostic collection to update.
 */
export function updateDiagnostics(
    document: vscode.TextDocument,
    matches: SecretMatch[],
    collection: vscode.DiagnosticCollection,
): void {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const match of matches) {
        const startPos = document.positionAt(match.start);
        const endPos = document.positionAt(match.end);
        const range = new vscode.Range(startPos, endPos);

        const entropyLabel = match.entropy.toFixed(2);
        const message =
            `[${match.severity.toUpperCase()}] Potential ${match.type} detected ` +
            `(entropy: ${entropyLabel}). Redact before sharing.`;

        const diagnostic = new vscode.Diagnostic(range, message, mapSeverity(match.severity));
        diagnostic.code = match.patternId;
        diagnostic.source = 'Antigravity';

        diagnostics.push(diagnostic);
    }

    collection.set(document.uri, diagnostics);
}

/**
 * Clear diagnostics for a specific document.
 *
 * @param document   - The document to clear.
 * @param collection - The diagnostic collection.
 */
export function clearDiagnostics(
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection,
): void {
    collection.delete(document.uri);
}
