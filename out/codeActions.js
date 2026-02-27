"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HataiCodeActionProvider = void 0;
const vscode = require("vscode");
const detector_1 = require("./detector");
const redactor_1 = require("./redactor");
class HataiCodeActionProvider {
    provideCodeActions(document, range, context, _token) {
        const hataiDiagnostics = context.diagnostics.filter(d => d.source === 'Hatai');
        if (hataiDiagnostics.length === 0) {
            return undefined;
        }
        const actions = [];
        const config = vscode.workspace.getConfiguration('hatai');
        const strategy = config.get('redactStrategy') || 'full';
        for (const diagnostic of hataiDiagnostics) {
            // Quick fix: redact this specific secret
            const secretText = document.getText(diagnostic.range);
            const matches = (0, detector_1.detectSecrets)(secretText);
            if (matches.length > 0) {
                const redactedValue = (0, redactor_1.redact)(secretText, matches, strategy);
                const fix = new vscode.CodeAction(`Redact this secret (${strategy})`, vscode.CodeActionKind.QuickFix);
                fix.edit = new vscode.WorkspaceEdit();
                fix.edit.replace(document.uri, diagnostic.range, redactedValue);
                fix.isPreferred = true;
                fix.diagnostics = [diagnostic];
                actions.push(fix);
            }
        }
        // Bulk action: redact all secrets in file
        if (hataiDiagnostics.length > 1) {
            const bulkFix = new vscode.CodeAction(`Redact ALL secrets in this file (${hataiDiagnostics.length} found)`, vscode.CodeActionKind.QuickFix);
            bulkFix.command = {
                command: 'hatai.redactSecrets',
                title: 'Redact All Secrets'
            };
            actions.push(bulkFix);
        }
        return actions;
    }
}
exports.HataiCodeActionProvider = HataiCodeActionProvider;
HataiCodeActionProvider.providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
];
//# sourceMappingURL=codeActions.js.map