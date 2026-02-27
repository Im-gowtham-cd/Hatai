import * as vscode from 'vscode';
import { detectSecrets } from './detector';
import { redact, RedactStrategy } from './redactor';
import { subscribeToDocumentChanges, HATAI_DIAGNOSTIC_COLLECTION, refreshDiagnostics } from './diagnostics';
import { HataiCodeActionProvider } from './codeActions';
import { SafeLogger } from './safeLogger';

let safeLogger: SafeLogger;

export function activate(context: vscode.ExtensionContext) {
    console.log('Hatai extension is now active');

    // Initialize diagnostic collection
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(HATAI_DIAGNOSTIC_COLLECTION);
    context.subscriptions.push(diagnosticCollection);

    // Subscribe to document changes for real-time diagnostics
    subscribeToDocumentChanges(context, diagnosticCollection);

    // Initialize SafeLogger
    const config = vscode.workspace.getConfiguration('hatai');
    const strategy = config.get<RedactStrategy>('redactStrategy') || 'full';
    const whitelist = config.get<string[]>('whitelist') || [];
    safeLogger = new SafeLogger('Hatai Safe Log', strategy, whitelist);
    context.subscriptions.push({ dispose: () => safeLogger.dispose() });

    // Register Code Action Provider for all file types
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file' },
            new HataiCodeActionProvider(),
            { providedCodeActionKinds: HataiCodeActionProvider.providedCodeActionKinds }
        )
    );

    // --- Commands ---

    // Scan File Command
    const scanCommand = vscode.commands.registerCommand('hatai.scanFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Hatai: Open a file to scan.');
            return;
        }

        refreshDiagnostics(editor.document, diagnosticCollection);
        const diagnostics = diagnosticCollection.get(editor.document.uri);
        const count = diagnostics ? diagnostics.length : 0;

        if (count > 0) {
            vscode.window.showWarningMessage(`Hatai: ⚠️ Found ${count} potential secret(s) in this file.`);
            safeLogger.warn(`Scanned ${editor.document.fileName}: ${count} secret(s) found.`);
        } else {
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
        const currentWhitelist = currentConfig.get<string[]>('whitelist') || [];
        const currentStrategy = currentConfig.get<RedactStrategy>('redactStrategy') || 'full';

        const matches = detectSecrets(text, { whitelist: currentWhitelist });

        if (matches.length === 0) {
            vscode.window.showInformationMessage('Hatai: ✅ No secrets found to redact.');
            return;
        }

        const redactedText = redact(text, matches, currentStrategy);

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );
        edit.replace(document.uri, fullRange, redactedText);

        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            vscode.window.showInformationMessage(`Hatai: 🎭 Redacted ${matches.length} secret(s) using '${currentStrategy}' strategy.`);
            safeLogger.info(`Redacted ${matches.length} secret(s) in ${document.fileName}.`);
        }
    });

    context.subscriptions.push(scanCommand, redactCommand);
}

export function deactivate() {
    if (safeLogger) {
        safeLogger.dispose();
    }
}
