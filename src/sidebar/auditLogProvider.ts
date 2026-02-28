/**
 * @module sidebar/auditLogProvider
 * TreeView provider for the session audit log showing scan & redaction events.
 */

import * as vscode from 'vscode';

/** A single audit log entry. */
export interface AuditLogEntry {
    /** Unix timestamp (ms). */
    timestamp: number;
    /** File that was scanned or redacted. */
    fileName: string;
    /** Number of secrets found. */
    secretCount: number;
    /** Action that was performed. */
    action: 'scan' | 'copyForAI' | 'buildContext' | 'redact' | 'markSafe';
}

/** TreeItem wrapper for an AuditLogEntry. */
class AuditLogItem extends vscode.TreeItem {
    constructor(public readonly entry: AuditLogEntry) {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const basename = entry.fileName.split(/[\\/]/).pop() ?? entry.fileName;
        const label = `${time} — ${entry.action}`;

        super(label, vscode.TreeItemCollapsibleState.None);

        this.description = `${basename} · ${entry.secretCount} secret(s)`;
        this.tooltip = new vscode.MarkdownString(
            `**Action**: ${entry.action}\n\n` +
            `**File**: \`${entry.fileName}\`\n\n` +
            `**Secrets**: ${entry.secretCount}\n\n` +
            `**Time**: ${new Date(entry.timestamp).toLocaleString()}`,
        );

        // Icon based on action
        switch (entry.action) {
            case 'scan':
                this.iconPath = new vscode.ThemeIcon('search', new vscode.ThemeColor('charts.blue'));
                break;
            case 'copyForAI':
                this.iconPath = new vscode.ThemeIcon('clippy', new vscode.ThemeColor('charts.green'));
                break;
            case 'buildContext':
                this.iconPath = new vscode.ThemeIcon('files', new vscode.ThemeColor('charts.purple'));
                break;
            case 'redact':
                this.iconPath = new vscode.ThemeIcon('shield', new vscode.ThemeColor('charts.orange'));
                break;
            case 'markSafe':
                this.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'));
                break;
        }
    }
}

/**
 * TreeDataProvider that displays a time-ordered audit log of all
 * Antigravity scan / redaction events for the current session.
 */
export class AuditLogProvider implements vscode.TreeDataProvider<AuditLogItem> {
    private entries: AuditLogEntry[] = [];
    private _onDidChangeTreeData = new vscode.EventEmitter<AuditLogItem | undefined | void>();
    public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly workspaceState: vscode.Memento) {
        // Restore persisted entries from workspace state.
        const persisted = workspaceState.get<AuditLogEntry[]>('antigravity.auditLog');
        if (persisted) {
            this.entries = persisted;
        }
    }

    getTreeItem(element: AuditLogItem): vscode.TreeItem {
        return element;
    }

    getChildren(_element?: AuditLogItem): AuditLogItem[] {
        // Entries in reverse chronological order (newest first).
        return [...this.entries]
            .reverse()
            .map((entry) => new AuditLogItem(entry));
    }

    /**
     * Add an entry to the audit log and persist.
     */
    public addEntry(entry: AuditLogEntry): void {
        this.entries.push(entry);
        this.persist();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Clear the entire audit log.
     */
    public clearLog(): void {
        this.entries = [];
        this.persist();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Return all current entries (for stats).
     */
    public getEntries(): readonly AuditLogEntry[] {
        return this.entries;
    }

    private persist(): void {
        void this.workspaceState.update('antigravity.auditLog', this.entries);
    }
}
