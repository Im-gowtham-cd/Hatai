"use strict";
/**
 * @module sidebar/auditLogProvider
 * TreeView provider for the session audit log showing scan & redaction events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogProvider = void 0;
const vscode = require("vscode");
/** TreeItem wrapper for an AuditLogEntry. */
class AuditLogItem extends vscode.TreeItem {
    constructor(entry) {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const basename = entry.fileName.split(/[\\/]/).pop() ?? entry.fileName;
        const label = `${time} — ${entry.action}`;
        super(label, vscode.TreeItemCollapsibleState.None);
        this.entry = entry;
        this.description = `${basename} · ${entry.secretCount} secret(s)`;
        this.tooltip = new vscode.MarkdownString(`**Action**: ${entry.action}\n\n` +
            `**File**: \`${entry.fileName}\`\n\n` +
            `**Secrets**: ${entry.secretCount}\n\n` +
            `**Time**: ${new Date(entry.timestamp).toLocaleString()}`);
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
class AuditLogProvider {
    constructor(workspaceState) {
        this.workspaceState = workspaceState;
        this.entries = [];
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        // Restore persisted entries from workspace state.
        const persisted = workspaceState.get('antigravity.auditLog');
        if (persisted) {
            this.entries = persisted;
        }
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(_element) {
        // Entries in reverse chronological order (newest first).
        return [...this.entries]
            .reverse()
            .map((entry) => new AuditLogItem(entry));
    }
    /**
     * Add an entry to the audit log and persist.
     */
    addEntry(entry) {
        this.entries.push(entry);
        this.persist();
        this._onDidChangeTreeData.fire();
    }
    /**
     * Clear the entire audit log.
     */
    clearLog() {
        this.entries = [];
        this.persist();
        this._onDidChangeTreeData.fire();
    }
    /**
     * Return all current entries (for stats).
     */
    getEntries() {
        return this.entries;
    }
    persist() {
        void this.workspaceState.update('antigravity.auditLog', this.entries);
    }
}
exports.AuditLogProvider = AuditLogProvider;
//# sourceMappingURL=auditLogProvider.js.map