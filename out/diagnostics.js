"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HATAI_DIAGNOSTIC_COLLECTION = void 0;
exports.subscribeToDocumentChanges = subscribeToDocumentChanges;
exports.refreshDiagnostics = refreshDiagnostics;
const vscode = require("vscode");
const detector_1 = require("./detector");
exports.HATAI_DIAGNOSTIC_COLLECTION = 'hatai';
function subscribeToDocumentChanges(context, hataiDiagnostics) {
    if (vscode.window.activeTextEditor) {
        refreshDiagnostics(vscode.window.activeTextEditor.document, hataiDiagnostics);
    }
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            refreshDiagnostics(editor.document, hataiDiagnostics);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, hataiDiagnostics)));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc => hataiDiagnostics.delete(doc.uri)));
}
function refreshDiagnostics(doc, hataiDiagnostics) {
    const diagnostics = [];
    const text = doc.getText();
    const config = vscode.workspace.getConfiguration('hatai');
    const whitelist = config.get('whitelist') || [];
    const matches = (0, detector_1.detectSecrets)(text, { whitelist });
    for (const match of matches) {
        const range = new vscode.Range(doc.positionAt(match.start), doc.positionAt(match.end));
        const diagnostic = new vscode.Diagnostic(range, `Potential secret detected (${match.type}). Please redact before sharing.`, vscode.DiagnosticSeverity.Warning);
        diagnostic.code = 'hatai_secret';
        diagnostic.source = 'Hatai';
        diagnostics.push(diagnostic);
    }
    hataiDiagnostics.set(doc.uri, diagnostics);
}
//# sourceMappingURL=diagnostics.js.map