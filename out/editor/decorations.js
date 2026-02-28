"use strict";
/**
 * @module editor/decorations
 * Severity-based inline decorations and gutter icons for detected secrets.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.allDecorationTypes = void 0;
exports.applyDecorations = applyDecorations;
exports.clearDecorations = clearDecorations;
const vscode = require("vscode");
/** Decoration type for critical-severity secrets (red). */
const criticalDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: new vscode.ThemeIcon('error').id ? undefined : undefined,
    gutterIconSize: 'contain',
    overviewRulerColor: '#ff1744',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    backgroundColor: 'rgba(255, 23, 68, 0.08)',
    border: '1px solid rgba(255, 23, 68, 0.4)',
    borderRadius: '2px',
    after: {
        contentText: ' 🔴',
        margin: '0 0 0 4px',
    },
});
/** Decoration type for high-severity secrets (orange). */
const highDecoration = vscode.window.createTextEditorDecorationType({
    overviewRulerColor: '#ff9100',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    backgroundColor: 'rgba(255, 145, 0, 0.08)',
    border: '1px solid rgba(255, 145, 0, 0.4)',
    borderRadius: '2px',
    after: {
        contentText: ' 🟠',
        margin: '0 0 0 4px',
    },
});
/** Decoration type for medium-severity secrets (yellow). */
const mediumDecoration = vscode.window.createTextEditorDecorationType({
    overviewRulerColor: '#ffd600',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    backgroundColor: 'rgba(255, 214, 0, 0.06)',
    border: '1px solid rgba(255, 214, 0, 0.35)',
    borderRadius: '2px',
    after: {
        contentText: ' 🟡',
        margin: '0 0 0 4px',
    },
});
/** All decoration types used by Antigravity — needed for disposal. */
exports.allDecorationTypes = [criticalDecoration, highDecoration, mediumDecoration];
/**
 * Apply severity-based decorations to the editor for each detected secret.
 *
 * @param editor  - The active text editor.
 * @param matches - Detected secrets.
 */
function applyDecorations(editor, matches) {
    const critical = [];
    const high = [];
    const medium = [];
    for (const match of matches) {
        const startPos = editor.document.positionAt(match.start);
        const endPos = editor.document.positionAt(match.end);
        const range = new vscode.Range(startPos, endPos);
        const option = {
            range,
            hoverMessage: new vscode.MarkdownString(`$(shield) **Antigravity** — ${match.severity.toUpperCase()} severity\n\n` +
                `Type: \`${match.type}\` · Entropy: \`${match.entropy.toFixed(2)}\``),
        };
        switch (match.severity) {
            case 'critical':
                critical.push(option);
                break;
            case 'high':
                high.push(option);
                break;
            case 'medium':
                medium.push(option);
                break;
        }
    }
    editor.setDecorations(criticalDecoration, critical);
    editor.setDecorations(highDecoration, high);
    editor.setDecorations(mediumDecoration, medium);
}
/**
 * Clear all Antigravity decorations from the editor.
 *
 * @param editor - The active text editor.
 */
function clearDecorations(editor) {
    editor.setDecorations(criticalDecoration, []);
    editor.setDecorations(highDecoration, []);
    editor.setDecorations(mediumDecoration, []);
}
//# sourceMappingURL=decorations.js.map