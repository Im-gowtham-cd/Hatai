import * as vscode from 'vscode';
import { detectSecrets } from './detector';

export const HATAI_DIAGNOSTIC_COLLECTION = 'hatai';

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, hataiDiagnostics: vscode.DiagnosticCollection): void {
    if (vscode.window.activeTextEditor) {
        refreshDiagnostics(vscode.window.activeTextEditor.document, hataiDiagnostics);
    }
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                refreshDiagnostics(editor.document, hataiDiagnostics);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, hataiDiagnostics))
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(doc => hataiDiagnostics.delete(doc.uri))
    );
}

export function refreshDiagnostics(doc: vscode.TextDocument, hataiDiagnostics: vscode.DiagnosticCollection): void {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = doc.getText();

    const config = vscode.workspace.getConfiguration('hatai');
    const whitelist = config.get<string[]>('whitelist') || [];

    const matches = detectSecrets(text, { whitelist });

    for (const match of matches) {
        const range = new vscode.Range(
            doc.positionAt(match.start),
            doc.positionAt(match.end)
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            `Potential secret detected (${match.type}). Please redact before sharing.`,
            vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'hatai_secret';
        diagnostic.source = 'Hatai';

        diagnostics.push(diagnostic);
    }

    hataiDiagnostics.set(doc.uri, diagnostics);
}
