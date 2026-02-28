/**
 * @module commands/copyForAI
 * AI-safe clipboard command that redacts secrets and appends a summary.
 */

import * as vscode from 'vscode';
import { detectSecrets, DetectorConfig } from '../core/detector';
import { redact } from '../core/redactor';
import { AuditLogEntry } from '../sidebar/auditLogProvider';

/**
 * Register the `antigravity.copyForAI` command.
 *
 * Gets selected text (or entire document), applies placeholder redaction,
 * appends a summary of what was redacted, and copies to clipboard.
 */
export function registerCopyForAICommand(
    context: vscode.ExtensionContext,
    detectorConfig: DetectorConfig,
    onAuditEntry: (entry: AuditLogEntry) => void,
): vscode.Disposable {
    return vscode.commands.registerCommand('antigravity.copyForAI', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Antigravity: Open a file first.');
            return;
        }

        const selection = editor.selection;
        const text = selection.isEmpty
            ? editor.document.getText()
            : editor.document.getText(selection);

        const matches = detectSecrets(text, detectorConfig);

        if (matches.length === 0) {
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage('Antigravity: ✅ Copied — no secrets found.');
            return;
        }

        // Apply placeholder redaction.
        let result = redact(text, matches, 'placeholder');

        // Build a summary grouped by type.
        const typeCounts = new Map<string, number>();
        for (const m of matches) {
            typeCounts.set(m.type, (typeCounts.get(m.type) ?? 0) + 1);
        }
        const breakdown = Array.from(typeCounts.entries())
            .map(([type, count]) => `${count}× ${type}`)
            .join(', ');

        result +=
            `\n\n--- ANTIGRAVITY REDACTION SUMMARY ---\n` +
            `${matches.length} secret(s) redacted: ${breakdown}\n` +
            `Safe to share with AI tools.\n`;

        await vscode.env.clipboard.writeText(result);
        vscode.window.showInformationMessage(
            `Antigravity: ✅ Copied (${matches.length} secret(s) redacted)`,
        );

        onAuditEntry({
            timestamp: Date.now(),
            fileName: editor.document.fileName,
            secretCount: matches.length,
            action: 'copyForAI',
        });
    });
}
