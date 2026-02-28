/**
 * @module sidebar/statsProvider
 * Webview panel showing session statistics: total secrets, breakdown by type, recent events.
 */

import * as vscode from 'vscode';
import { AuditLogEntry } from './auditLogProvider';

/**
 * Creates and manages the Antigravity Stats Dashboard webview panel.
 */
export class StatsProvider {
    private panel: vscode.WebviewPanel | undefined;

    constructor(private readonly getEntries: () => readonly AuditLogEntry[]) { }

    /**
     * Show (or reveal) the stats dashboard panel.
     */
    public show(): void {
        if (this.panel) {
            this.panel.reveal();
            this.refresh();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'antigravityStats',
            'Antigravity Stats',
            vscode.ViewColumn.Beside,
            { enableScripts: false },
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        this.refresh();
    }

    /**
     * Refresh the webview content with the latest data.
     */
    public refresh(): void {
        if (!this.panel) {
            return;
        }
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const entries = this.getEntries();
        const totalSecrets = entries.reduce((sum, e) => sum + e.secretCount, 0);
        const totalScans = entries.length;

        // Breakdown by action type.
        const actionCounts = new Map<string, number>();
        for (const e of entries) {
            actionCounts.set(e.action, (actionCounts.get(e.action) ?? 0) + 1);
        }

        // Recent 10 events.
        const recent = [...entries].reverse().slice(0, 10);

        // Build bars for the chart.
        const maxCount = Math.max(...Array.from(actionCounts.values()), 1);
        let barsHtml = '';
        const colors: Record<string, string> = {
            scan: '#4fc3f7',
            copyForAI: '#81c784',
            buildContext: '#ce93d8',
            redact: '#ffb74d',
            markSafe: '#aed581',
        };

        for (const [action, count] of actionCounts) {
            const pct = Math.round((count / maxCount) * 100);
            const color = colors[action] ?? '#90a4ae';
            barsHtml += `
                <div class="bar-row">
                    <span class="bar-label">${action}</span>
                    <div class="bar-track">
                        <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
                    </div>
                    <span class="bar-value">${count}</span>
                </div>`;
        }

        // Recent events list.
        let recentHtml = '';
        for (const e of recent) {
            const time = new Date(e.timestamp).toLocaleTimeString();
            const basename = e.fileName.split(/[\\/]/).pop() ?? e.fileName;
            recentHtml += `<tr><td>${time}</td><td>${e.action}</td><td>${basename}</td><td>${e.secretCount}</td></tr>`;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Antigravity Stats</title>
    <style>
        body { font-family: var(--vscode-font-family, 'Segoe UI', sans-serif); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; margin: 0; }
        h1 { font-size: 1.4em; margin-bottom: 4px; }
        h2 { font-size: 1.1em; margin-top: 24px; margin-bottom: 8px; opacity: 0.85; }
        .stat-cards { display: flex; gap: 12px; flex-wrap: wrap; }
        .card { background: var(--vscode-editorWidget-background, #1e1e1e); border: 1px solid var(--vscode-editorWidget-border, #333); border-radius: 6px; padding: 14px 18px; min-width: 120px; }
        .card .num { font-size: 2em; font-weight: 700; }
        .card .label { font-size: 0.85em; opacity: 0.7; }
        .bar-row { display: flex; align-items: center; margin-bottom: 6px; }
        .bar-label { width: 100px; font-size: 0.85em; }
        .bar-track { flex: 1; height: 14px; background: var(--vscode-editorWidget-border, #333); border-radius: 3px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
        .bar-value { width: 30px; text-align: right; font-size: 0.85em; margin-left: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
        th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--vscode-editorWidget-border, #333); }
        th { opacity: 0.7; }
    </style>
</head>
<body>
    <h1>🛡️ Antigravity Dashboard</h1>

    <div class="stat-cards">
        <div class="card"><div class="num">${totalSecrets}</div><div class="label">Secrets Detected</div></div>
        <div class="card"><div class="num">${totalScans}</div><div class="label">Total Actions</div></div>
    </div>

    <h2>Actions Breakdown</h2>
    ${barsHtml || '<p style="opacity:0.5">No actions yet.</p>'}

    <h2>Recent Events</h2>
    <table>
        <tr><th>Time</th><th>Action</th><th>File</th><th>Secrets</th></tr>
        ${recentHtml || '<tr><td colspan="4" style="opacity:0.5">No events yet.</td></tr>'}
    </table>
</body>
</html>`;
    }
}
