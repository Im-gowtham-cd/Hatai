"use strict";
/**
 * @module editor/diagnostics
 * VS Code Problems panel integration for detected secrets.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAGNOSTIC_COLLECTION_NAME = void 0;
exports.updateDiagnostics = updateDiagnostics;
exports.clearDiagnostics = clearDiagnostics;
const vscode = require("vscode");
/** Name of the diagnostic collection used by Antigravity. */
exports.DIAGNOSTIC_COLLECTION_NAME = 'antigravity';
/**
 * Map a secret severity to the corresponding VS Code diagnostic severity.
 */
function mapSeverity(severity) {
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
function updateDiagnostics(document, matches, collection) {
    const diagnostics = [];
    for (const match of matches) {
        const startPos = document.positionAt(match.start);
        const endPos = document.positionAt(match.end);
        const range = new vscode.Range(startPos, endPos);
        const entropyLabel = match.entropy.toFixed(2);
        const message = `[${match.severity.toUpperCase()}] Potential ${match.type} detected ` +
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
function clearDiagnostics(document, collection) {
    collection.delete(document.uri);
}
//# sourceMappingURL=diagnostics.js.map