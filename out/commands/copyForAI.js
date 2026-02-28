"use strict";
/**
 * @module commands/copyForAI
 * AI-safe clipboard command that redacts secrets and appends a summary.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCopyForAICommand = registerCopyForAICommand;
const vscode = require("vscode");
const detector_1 = require("../core/detector");
const redactor_1 = require("../core/redactor");
/**
 * Register the `antigravity.copyForAI` command.
 *
 * Gets selected text (or entire document), applies placeholder redaction,
 * appends a summary of what was redacted, and copies to clipboard.
 */
function registerCopyForAICommand(context, detectorConfig, onAuditEntry) {
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
        const matches = (0, detector_1.detectSecrets)(text, detectorConfig);
        if (matches.length === 0) {
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage('Antigravity: ✅ Copied — no secrets found.');
            return;
        }
        // Apply placeholder redaction.
        let result = (0, redactor_1.redact)(text, matches, 'placeholder');
        // Build a summary grouped by type.
        const typeCounts = new Map();
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
        vscode.window.showInformationMessage(`Antigravity: ✅ Copied (${matches.length} secret(s) redacted)`);
        onAuditEntry({
            timestamp: Date.now(),
            fileName: editor.document.fileName,
            secretCount: matches.length,
            action: 'copyForAI',
        });
    });
}
//# sourceMappingURL=copyForAI.js.map