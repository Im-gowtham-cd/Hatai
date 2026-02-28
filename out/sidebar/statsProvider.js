"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsProvider = void 0;
const vscode = require("vscode");
class StatsProvider {
    constructor(getEntries) {
        this.getEntries = getEntries;
    }
    show() {
        if (this.panel) {
            this.panel.reveal();
            this.refresh();
            return;
        }
        this.panel = vscode.window.createWebviewPanel('hataiStats', 'Hatai Stats', vscode.ViewColumn.Beside, { enableScripts: false });
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
        this.refresh();
    }
    refresh() {
        if (!this.panel) {
            return;
        }
        this.panel.webview.html = this.buildHtml();
    }
    buildHtml() {
        const entries = this.getEntries();
        const totalSecrets = entries.reduce((sum, e) => sum + e.secretCount, 0);
        const totalScans = entries.length;
        const actionCounts = new Map();
        for (const e of entries) {
            actionCounts.set(e.action, (actionCounts.get(e.action) ?? 0) + 1);
        }
        const recent = [...entries].reverse().slice(0, 10);
        const maxCount = Math.max(...Array.from(actionCounts.values()), 1);
        let barsHtml = '';
        const colors = {
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
    <title>Hatai Stats</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --border-color: rgba(255, 255, 255, 0.1);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #38bdf8;
        }

        body { 
            font-family: 'Outfit', sans-serif; 
            color: var(--text-main); 
            background: var(--bg-color); 
            background-image: radial-gradient(circle at top right, rgba(56, 189, 248, 0.15), transparent 40%),
                              radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.15), transparent 40%);
            padding: 24px; 
            margin: 0; 
            min-height: 100vh;
        }

        h1 { 
            font-size: 2em; 
            font-weight: 700;
            margin-bottom: 24px; 
            background: linear-gradient(90deg, #38bdf8, #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        h2 { 
            font-size: 1.25em; 
            font-weight: 500;
            margin-top: 32px; 
            margin-bottom: 16px; 
            color: var(--text-main);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 8px;
        }

        .stat-cards { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 16px; 
        }

        .card { 
            background: var(--card-bg); 
            border: 1px solid var(--border-color); 
            border-radius: 12px; 
            padding: 20px; 
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: transform 0.2s ease, border-color 0.2s ease;
        }
        
        .card:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .card .num { 
            font-size: 2.5em; 
            font-weight: 700; 
            color: var(--primary);
            line-height: 1;
            margin-bottom: 8px;
        }

        .card .label { 
            font-size: 0.9em; 
            color: var(--text-muted); 
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .bar-row { 
            display: flex; 
            align-items: center; 
            margin-bottom: 12px; 
            background: rgba(255, 255, 255, 0.02);
            padding: 8px 12px;
            border-radius: 8px;
        }

        .bar-label { 
            width: 120px; 
            font-size: 0.9em; 
            font-weight: 500;
        }

        .bar-track { 
            flex: 1; 
            height: 10px; 
            background: rgba(0,0,0,0.3); 
            border-radius: 5px; 
            overflow: hidden; 
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
        }

        .bar-fill { 
            height: 100%; 
            border-radius: 5px; 
            transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); 
            box-shadow: 0 0 10px rgba(255,255,255,0.2);
        }

        .bar-value { 
            width: 40px; 
            text-align: right; 
            font-size: 0.9em; 
            font-weight: 700;
            color: var(--primary);
        }

        table { 
            width: 100%; 
            border-collapse: separate; 
            border-spacing: 0 8px;
            font-size: 0.9em; 
        }

        th, td { 
            text-align: left; 
            padding: 12px 16px; 
        }

        th { 
            color: var(--text-muted);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 0.8em;
            border-bottom: 1px solid var(--border-color);
        }
        
        tr td {
            background: var(--card-bg);
            backdrop-filter: blur(4px);
        }
        
        tr td:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
        tr td:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }

    </style>
</head>
<body>
    <h1>🛡️ Hatai Dashboard</h1>

    <div class="stat-cards">
        <div class="card"><div class="num">${totalSecrets}</div><div class="label">Secrets Detected</div></div>
        <div class="card"><div class="num">${totalScans}</div><div class="label">Total Actions</div></div>
    </div>

    <h2>Actions Breakdown</h2>
    <div style="margin-top: 16px;">
        ${barsHtml || '<p style="color:var(--text-muted)">No actions yet.</p>'}
    </div>

    <h2>Recent Events</h2>
    <table>
        <tr><th>Time</th><th>Action</th><th>File</th><th>Secrets</th></tr>
        ${recentHtml || '<tr><td colspan="4" style="color:var(--text-muted)">No events yet.</td></tr>'}
    </table>
</body>
</html>`;
    }
}
exports.StatsProvider = StatsProvider;
//# sourceMappingURL=statsProvider.js.map