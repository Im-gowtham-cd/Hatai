import * as vscode from 'vscode';
import { detectSecrets } from './detector';
import { redact, RedactStrategy } from './redactor';

export class HataiCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        const hataiDiagnostics = context.diagnostics.filter(d => d.source === 'Hatai');
        if (hataiDiagnostics.length === 0) {
            return undefined;
        }

        const actions: vscode.CodeAction[] = [];
        const config = vscode.workspace.getConfiguration('hatai');
        const strategy = config.get<RedactStrategy>('redactStrategy') || 'full';

        for (const diagnostic of hataiDiagnostics) {
            // Quick fix: redact this specific secret
            const secretText = document.getText(diagnostic.range);
            const matches = detectSecrets(secretText);
            if (matches.length > 0) {
                const redactedValue = redact(secretText, matches, strategy);

                const fix = new vscode.CodeAction(
                    `Redact this secret (${strategy})`,
                    vscode.CodeActionKind.QuickFix
                );
                fix.edit = new vscode.WorkspaceEdit();
                fix.edit.replace(document.uri, diagnostic.range, redactedValue);
                fix.isPreferred = true;
                fix.diagnostics = [diagnostic];
                actions.push(fix);
            }
        }

        // Bulk action: redact all secrets in file
        if (hataiDiagnostics.length > 1) {
            const bulkFix = new vscode.CodeAction(
                `Redact ALL secrets in this file (${hataiDiagnostics.length} found)`,
                vscode.CodeActionKind.QuickFix
            );
            bulkFix.command = {
                command: 'hatai.redactSecrets',
                title: 'Redact All Secrets'
            };
            actions.push(bulkFix);
        }

        return actions;
    }
}
