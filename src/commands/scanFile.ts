/**
 * @module commands/scanFile
 * Full-file scan command that shows results in a new document and updates diagnostics.
 */

import * as vscode from 'vscode';
import { detectSecrets, DetectorConfig } from '../core/detector';
import { redact } from '../core/redactor';
import { updateDiagnostics } from '../editor/diagnostics';
import { AuditLogEntry } from '../sidebar/auditLogProvider';

/**
 * Register the `antigravity.scanFile` command.
 *
 * Scans the active file, updates the Problems panel, and opens a new
 * untitled document with the redacted output.
 */
export function registerScanFileCommand(
    context: vscode.ExtensionContext,
    diagnosticCollection: vscode.DiagnosticCollection,
    detectorConfig: DetectorConfig,
    onAuditEntry: (entry: AuditLogEntry) => void,
): vscode.Disposable {
    return vscode.commands.registerCommand('antigravity.scanFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Antigravity: Open a file to scan.');
            return;
        }

        const text = editor.document.getText();
        const matches = detectSecrets(text, detectorConfig);

        // Always update diagnostics.
        updateDiagnostics(editor.document, matches, diagnosticCollection);

        if (matches.length === 0) {
            vscode.window.showInformationMessage('Antigravity: ✅ No secrets found in this file.');
            onAuditEntry({
                timestamp: Date.now(),
                fileName: editor.document.fileName,
                secretCount: 0,
                action: 'scan',
            });
            return;
        }

        vscode.window.showWarningMessage(
            `Antigravity: ⚠️ Found ${matches.length} potential secret(s).`,
        );

        // Open a new document showing the redacted output.
        const redactedText = redact(text, matches, 'placeholder');

        const header =
            `// ── Antigravity Scan Results ──\n` +
            `// File: ${editor.document.fileName}\n` +
            `// Secrets found: ${matches.length}\n` +
            `// Strategy: placeholder\n` +
            `// ─────────────────────────────\n\n`;

        const doc = await vscode.workspace.openTextDocument({
            content: header + redactedText,
            language: editor.document.languageId,
        });
        await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });

        onAuditEntry({
            timestamp: Date.now(),
            fileName: editor.document.fileName,
            secretCount: matches.length,
            action: 'scan',
        });
    });
}
