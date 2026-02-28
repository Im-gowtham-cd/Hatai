/**
 * @module commands/buildContext
 * Multi-file AI context builder: select files, concatenate, redact, copy.
 */

import * as vscode from 'vscode';
import { detectSecrets, DetectorConfig } from '../core/detector';
import { redact } from '../core/redactor';
import { AuditLogEntry } from '../sidebar/auditLogProvider';

interface FileQuickPickItem extends vscode.QuickPickItem {
    uri: vscode.Uri;
}

/**
 * Register the `antigravity.buildContext` command.
 *
 * Opens a QuickPick listing all open text editors so the user can select
 * multiple files. Concatenates them with headers, redacts secrets across
 * the combined text, and copies the result to the clipboard.
 */
export function registerBuildContextCommand(
    context: vscode.ExtensionContext,
    detectorConfig: DetectorConfig,
    onAuditEntry: (entry: AuditLogEntry) => void,
): vscode.Disposable {
    return vscode.commands.registerCommand('antigravity.buildContext', async () => {
        // Gather open text documents.
        const openDocs = vscode.workspace.textDocuments.filter(
            (d) => d.uri.scheme === 'file' && !d.isClosed,
        );

        if (openDocs.length === 0) {
            vscode.window.showInformationMessage('Antigravity: No open files to build context from.');
            return;
        }

        const items: FileQuickPickItem[] = openDocs.map((doc) => ({
            label: vscode.workspace.asRelativePath(doc.uri),
            description: doc.languageId,
            uri: doc.uri,
            picked: true,
        }));

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: 'Select files to include in the AI-safe context',
            title: 'Antigravity: Build Context',
        });

        if (!selected || selected.length === 0) {
            return;
        }

        // Concatenate files with path headers.
        let combined = '';
        for (const item of selected) {
            const doc = await vscode.workspace.openTextDocument(item.uri);
            const relativePath = vscode.workspace.asRelativePath(item.uri);
            combined += `// ── ${relativePath} ──\n${doc.getText()}\n\n`;
        }

        // Detect & redact across the combined text.
        const matches = detectSecrets(combined, detectorConfig);
        let result = redact(combined, matches, 'placeholder');

        // Append summary.
        if (matches.length > 0) {
            const typeCounts = new Map<string, number>();
            for (const m of matches) {
                typeCounts.set(m.type, (typeCounts.get(m.type) ?? 0) + 1);
            }
            const breakdown = Array.from(typeCounts.entries())
                .map(([type, count]) => `${count}× ${type}`)
                .join(', ');

            result +=
                `\n--- ANTIGRAVITY REDACTION SUMMARY ---\n` +
                `Files included: ${selected.length}\n` +
                `${matches.length} secret(s) redacted: ${breakdown}\n` +
                `Safe to share with AI tools.\n`;
        } else {
            result +=
                `\n--- ANTIGRAVITY CONTEXT SUMMARY ---\n` +
                `Files included: ${selected.length}\n` +
                `No secrets found. Safe to share.\n`;
        }

        await vscode.env.clipboard.writeText(result);
        vscode.window.showInformationMessage(
            `Antigravity: ✅ Context copied (${selected.length} files, ${matches.length} secret(s) redacted)`,
        );

        onAuditEntry({
            timestamp: Date.now(),
            fileName: `${selected.length} files`,
            secretCount: matches.length,
            action: 'buildContext',
        });
    });
}
