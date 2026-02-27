"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeLogger = void 0;
const vscode = require("vscode");
const detector_1 = require("./detector");
const redactor_1 = require("./redactor");
/**
 * A safe logger that redacts secrets before writing to the VS Code Output Channel.
 */
class SafeLogger {
    constructor(channelName = 'Hatai Safe Log', strategy = 'full', whitelist = []) {
        this.outputChannel = vscode.window.createOutputChannel(channelName);
        this.strategy = strategy;
        this.whitelist = whitelist;
    }
    sanitize(message) {
        const matches = (0, detector_1.detectSecrets)(message, { whitelist: this.whitelist });
        if (matches.length === 0) {
            return message;
        }
        return (0, redactor_1.redact)(message, matches, this.strategy);
    }
    formatArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'string') {
                return arg;
            }
            if (arg instanceof Error) {
                return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
            }
            try {
                return JSON.stringify(arg, null, 2);
            }
            catch {
                return String(arg);
            }
        }).join(' ');
    }
    log(...args) {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[LOG] ${message}`);
    }
    error(...args) {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[ERROR] ${message}`);
    }
    warn(...args) {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[WARN] ${message}`);
    }
    info(...args) {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[INFO] ${message}`);
    }
    debug(...args) {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[DEBUG] ${message}`);
    }
    show() {
        this.outputChannel.show();
    }
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.SafeLogger = SafeLogger;
//# sourceMappingURL=safeLogger.js.map