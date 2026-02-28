"use strict";
/**
 * @module commands/buildContext
 * Multi-file AI context builder: select files, concatenate, redact, copy.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBuildContextCommand = registerBuildContextCommand;
const vscode = require("vscode");
const detector_1 = require("../core/detector");
const redactor_1 = require("../core/redactor");
/**
 * Register the `antigravity.buildContext` command.
 *
 * Opens a QuickPick listing all open text editors so the user can select
 * multiple files. Concatenates them with headers, redacts secrets across
 * the combined text, and copies the result to the clipboard.
 */
function registerBuildContextCommand(context, detectorConfig, onAuditEntry) {
    return vscode.commands.registerCommand('antigravity.buildContext', async () => {
        // Gather open text documents.
        const openDocs = vscode.workspace.textDocuments.filter((d) => d.uri.scheme === 'file' && !d.isClosed);
        if (openDocs.length === 0) {
            vscode.window.showInformationMessage('Antigravity: No open files to build context from.');
            return;
        }
        const items = openDocs.map((doc) => ({
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
        const matches = (0, detector_1.detectSecrets)(combined, detectorConfig);
        let result = (0, redactor_1.redact)(combined, matches, 'placeholder');
        // Append summary.
        if (matches.length > 0) {
            const typeCounts = new Map();
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
        }
        else {
            result +=
                `\n--- ANTIGRAVITY CONTEXT SUMMARY ---\n` +
                    `Files included: ${selected.length}\n` +
                    `No secrets found. Safe to share.\n`;
        }
        await vscode.env.clipboard.writeText(result);
        vscode.window.showInformationMessage(`Antigravity: ✅ Context copied (${selected.length} files, ${matches.length} secret(s) redacted)`);
        onAuditEntry({
            timestamp: Date.now(),
            fileName: `${selected.length} files`,
            secretCount: matches.length,
            action: 'buildContext',
        });
    });
}
//# sourceMappingURL=buildContext.js.map