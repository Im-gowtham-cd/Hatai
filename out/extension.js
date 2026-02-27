"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const detector_1 = require("./detector");
const redactor_1 = require("./redactor");
const diagnostics_1 = require("./diagnostics");
const codeActions_1 = require("./codeActions");
const safeLogger_1 = require("./safeLogger");
let safeLogger;
function activate(context) {
    console.log('Hatai extension is now active');
    // Initialize diagnostic collection
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(diagnostics_1.HATAI_DIAGNOSTIC_COLLECTION);
    context.subscriptions.push(diagnosticCollection);
    // Subscribe to document changes for real-time diagnostics
    (0, diagnostics_1.subscribeToDocumentChanges)(context, diagnosticCollection);
    // Initialize SafeLogger
    const config = vscode.workspace.getConfiguration('hatai');
    const strategy = config.get('redactStrategy') || 'full';
    const whitelist = config.get('whitelist') || [];
    safeLogger = new safeLogger_1.SafeLogger('Hatai Safe Log', strategy, whitelist);
    context.subscriptions.push({ dispose: () => safeLogger.dispose() });
    // Register Code Action Provider for all file types
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, new codeActions_1.HataiCodeActionProvider(), { providedCodeActionKinds: codeActions_1.HataiCodeActionProvider.providedCodeActionKinds }));
    // --- Commands ---
    // Scan File Command
    const scanCommand = vscode.commands.registerCommand('hatai.scanFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Hatai: Open a file to scan.');
            return;
        }
        (0, diagnostics_1.refreshDiagnostics)(editor.document, diagnosticCollection);
        const diagnostics = diagnosticCollection.get(editor.document.uri);
        const count = diagnostics ? diagnostics.length : 0;
        if (count > 0) {
            vscode.window.showWarningMessage(`Hatai: ⚠️ Found ${count} potential secret(s) in this file.`);
            safeLogger.warn(`Scanned ${editor.document.fileName}: ${count} secret(s) found.`);
        }
        else {
            vscode.window.showInformationMessage('Hatai: ✅ No secrets found in this file.');
            safeLogger.info(`Scanned ${editor.document.fileName}: Clean.`);
        }
        safeLogger.show();
    });
    // Redact Secrets Command
    const redactCommand = vscode.commands.registerCommand('hatai.redactSecrets', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Hatai: Open a file to redact.');
            return;
        }
        const document = editor.document;
        const text = document.getText();
        const currentConfig = vscode.workspace.getConfiguration('hatai');
        const currentWhitelist = currentConfig.get('whitelist') || [];
        const currentStrategy = currentConfig.get('redactStrategy') || 'full';
        const matches = (0, detector_1.detectSecrets)(text, { whitelist: currentWhitelist });
        if (matches.length === 0) {
            vscode.window.showInformationMessage('Hatai: ✅ No secrets found to redact.');
            return;
        }
        const redactedText = (0, redactor_1.redact)(text, matches, currentStrategy);
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, redactedText);
        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            vscode.window.showInformationMessage(`Hatai: 🎭 Redacted ${matches.length} secret(s) using '${currentStrategy}' strategy.`);
            safeLogger.info(`Redacted ${matches.length} secret(s) in ${document.fileName}.`);
        }
    });
    context.subscriptions.push(scanCommand, redactCommand);
}
function deactivate() {
    if (safeLogger) {
        safeLogger.dispose();
    }
}
//# sourceMappingURL=extension.js.map