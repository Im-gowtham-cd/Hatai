/**
 * @module extension
 * Antigravity VS Code Extension — Entry point.
 *
 * Registers all commands, providers, sidebar views, and real-time scanning
 * listeners. This is the single activation/deactivation entry point.
 */

import * as vscode from 'vscode';

// Core
import { detectSecrets, SecretMatch, DetectorConfig } from './core/detector';
import { redact, RedactStrategy } from './core/redactor';

// Editor
import { applyDecorations, clearDecorations, allDecorationTypes } from './editor/decorations';
import { updateDiagnostics, DIAGNOSTIC_COLLECTION_NAME } from './editor/diagnostics';
import { AntigravityHoverProvider } from './editor/hoverProvider';
import { AntigravityCodeLensProvider } from './editor/codelens';

// Commands
import { registerCopyForAICommand } from './commands/copyForAI';
import { registerScanFileCommand } from './commands/scanFile';
import { registerBuildContextCommand } from './commands/buildContext';
import { registerInstallGitHookCommand } from './commands/installGitHook';

// Sidebar
import { AuditLogProvider, AuditLogEntry } from './sidebar/auditLogProvider';
import { StatsProvider } from './sidebar/statsProvider';

// Config
import {
    isRealTimeScanningEnabled,
    isScanOnSaveEnabled,
    getEntropyThreshold,
    getIgnoredPatternIds,
    getRedactStrategy,
    showGutterIcons,
} from './config/settings';
import { loadPolicy, policyPatternsToDefinitions, watchPolicyFile, TeamPolicy } from './config/policyLoader';
import { WhitelistStore } from './config/whitelist';

// ─── State ────────────────────────────────────────────────────────────────

let diagnosticCollection: vscode.DiagnosticCollection;
let hoverProvider: AntigravityHoverProvider;
let codeLensProvider: AntigravityCodeLensProvider;
let auditLogProvider: AuditLogProvider;
let statsProvider: StatsProvider;
let whitelistStore: WhitelistStore;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

/** Currently active detector config — rebuilt on settings / policy change. */
let detectorConfig: DetectorConfig = {};

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Build a fresh DetectorConfig from current settings + policy.
 */
function buildDetectorConfig(policy: TeamPolicy | undefined): DetectorConfig {
    return {
        customPatterns: policy ? policyPatternsToDefinitions(policy) : [],
        whitelist: policy?.whitelist ?? [],
        entropyThreshold: getEntropyThreshold(),
        ignoredPatternIds: getIgnoredPatternIds(),
    };
}

/**
 * Run the detector on a document and update all UI surfaces.
 */
function scanDocument(document: vscode.TextDocument): void {
    const text = document.getText();
    const matches = detectSecrets(text, detectorConfig);

    // Filter out whitelisted matches.
    const filtered = matches.filter((m) => !whitelistStore.isWhitelisted(m.value));

    // Diagnostics
    updateDiagnostics(document, filtered, diagnosticCollection);

    // Hover + CodeLens data
    hoverProvider.updateMatches(document.uri, filtered);
    codeLensProvider.updateMatches(document.uri, filtered);

    // Decorations (only for the active editor)
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
        if (showGutterIcons()) {
            applyDecorations(editor, filtered);
        } else {
            clearDecorations(editor);
        }
    }
}

/**
 * Debounced wrapper for scanDocument.
 */
function debouncedScan(document: vscode.TextDocument): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => scanDocument(document), 500);
}

/**
 * Helper to push an audit entry and refresh stats.
 */
function addAuditEntry(entry: AuditLogEntry): void {
    auditLogProvider.addEntry(entry);
    statsProvider.refresh();
}

// ─── Activation ───────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    // ── Diagnostics ──
    diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME);
    context.subscriptions.push(diagnosticCollection);

    // ── Policy & config ──
    const policy = loadPolicy();
    detectorConfig = buildDetectorConfig(policy);

    const policyWatcher = watchPolicyFile((newPolicy) => {
        detectorConfig = buildDetectorConfig(newPolicy);
        // Re-scan all visible editors.
        for (const editor of vscode.window.visibleTextEditors) {
            scanDocument(editor.document);
        }
    });
    context.subscriptions.push(policyWatcher);

    // Re-build config when VS Code settings change.
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('antigravity')) {
                detectorConfig = buildDetectorConfig(loadPolicy());
                for (const editor of vscode.window.visibleTextEditors) {
                    scanDocument(editor.document);
                }
            }
        }),
    );

    // ── Whitelist ──
    whitelistStore = new WhitelistStore(context.workspaceState);

    // ── Hover provider ──
    hoverProvider = new AntigravityHoverProvider();
    context.subscriptions.push(
        vscode.languages.registerHoverProvider({ scheme: 'file' }, hoverProvider),
    );

    // ── CodeLens provider ──
    codeLensProvider = new AntigravityCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider),
    );

    // ── Sidebar: Audit log ──
    auditLogProvider = new AuditLogProvider(context.workspaceState);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('antigravityAuditLog', auditLogProvider),
    );

    // ── Sidebar: Stats ──
    statsProvider = new StatsProvider(() => auditLogProvider.getEntries());

    // ── Real-time scanning ──
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (isRealTimeScanningEnabled() && e.document.uri.scheme === 'file') {
                debouncedScan(e.document);
            }
        }),
    );

    // ── Scan on save ──
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (isScanOnSaveEnabled() && doc.uri.scheme === 'file') {
                scanDocument(doc);
            }
        }),
    );

    // ── Scan on editor focus ──
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.uri.scheme === 'file') {
                scanDocument(editor.document);
            }
        }),
    );

    // ── Clean up closed documents ──
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((doc) => {
            diagnosticCollection.delete(doc.uri);
            hoverProvider.clearMatches(doc.uri);
            codeLensProvider.clearMatches(doc.uri);
        }),
    );

    // ─── Commands ─────────────────────────────────────────────────────────

    // Copy for AI
    context.subscriptions.push(
        registerCopyForAICommand(context, detectorConfig, addAuditEntry),
    );

    // Scan File
    context.subscriptions.push(
        registerScanFileCommand(context, diagnosticCollection, detectorConfig, addAuditEntry),
    );

    // Build Context
    context.subscriptions.push(
        registerBuildContextCommand(context, detectorConfig, addAuditEntry),
    );

    // Install Git Hook
    context.subscriptions.push(registerInstallGitHookCommand(context));

    // Show Stats Dashboard
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity.showStats', () => {
            statsProvider.show();
        }),
    );

    // Clear Audit Log
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity.clearAuditLog', () => {
            auditLogProvider.clearLog();
            statsProvider.refresh();
            vscode.window.showInformationMessage('Antigravity: Audit log cleared.');
        }),
    );

    // Mark Safe (from CodeLens)
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity.markSafe', (value: string) => {
            whitelistStore.addToWhitelist(value);
            vscode.window.showInformationMessage('Antigravity: ✅ Value marked as safe.');

            // Re-scan active editor to remove the decoration.
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                scanDocument(editor.document);
            }

            addAuditEntry({
                timestamp: Date.now(),
                fileName: editor?.document.fileName ?? 'unknown',
                secretCount: 0,
                action: 'markSafe',
            });
        }),
    );

    // Redact Line (from CodeLens)
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'antigravity.redactLine',
            async (uri: vscode.Uri, lineNumber: number) => {
                const doc = await vscode.workspace.openTextDocument(uri);
                const lineText = doc.lineAt(lineNumber).text;
                const matches = detectSecrets(lineText, detectorConfig);

                if (matches.length === 0) {
                    return;
                }

                const strategy = getRedactStrategy();
                const redacted = redact(lineText, matches, strategy);
                const lineRange = doc.lineAt(lineNumber).range;

                const edit = new vscode.WorkspaceEdit();
                edit.replace(uri, lineRange, redacted);
                await vscode.workspace.applyEdit(edit);

                addAuditEntry({
                    timestamp: Date.now(),
                    fileName: doc.fileName,
                    secretCount: matches.length,
                    action: 'redact',
                });
            },
        ),
    );

    // Copy Redacted Line (from CodeLens)
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'antigravity.copyRedactedLine',
            async (uri: vscode.Uri, lineNumber: number) => {
                const doc = await vscode.workspace.openTextDocument(uri);
                const lineText = doc.lineAt(lineNumber).text;
                const matches = detectSecrets(lineText, detectorConfig);
                const redacted = redact(lineText, matches, 'placeholder');

                await vscode.env.clipboard.writeText(redacted);
                vscode.window.showInformationMessage(
                    `Antigravity: ✅ Redacted line copied (${matches.length} secret(s))`,
                );
            },
        ),
    );

    // ── Initial scan of all visible editors ──
    for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.scheme === 'file') {
            scanDocument(editor.document);
        }
    }

    // ── Welcome message on first install ──
    const hasShownWelcome = context.globalState.get<boolean>('antigravity.welcomeShown');
    if (!hasShownWelcome) {
        vscode.window
            .showInformationMessage(
                '🛡️ Antigravity activated! Your secrets are now protected.',
                'Open Dashboard',
            )
            .then((choice) => {
                if (choice === 'Open Dashboard') {
                    statsProvider.show();
                }
            });
        void context.globalState.update('antigravity.welcomeShown', true);
    }
}

// ─── Deactivation ─────────────────────────────────────────────────────────

export function deactivate(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    // Clear all decorations from visible editors.
    for (const editor of vscode.window.visibleTextEditors) {
        clearDecorations(editor);
    }

    // Dispose decoration types.
    for (const dt of allDecorationTypes) {
        dt.dispose();
    }
}
