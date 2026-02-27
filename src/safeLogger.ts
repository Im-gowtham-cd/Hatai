import * as vscode from 'vscode';
import { detectSecrets } from './detector';
import { redact, RedactStrategy } from './redactor';

/**
 * A safe logger that redacts secrets before writing to the VS Code Output Channel.
 */
export class SafeLogger {
    private outputChannel: vscode.OutputChannel;
    private strategy: RedactStrategy;
    private whitelist: string[];

    constructor(channelName: string = 'Hatai Safe Log', strategy: RedactStrategy = 'full', whitelist: string[] = []) {
        this.outputChannel = vscode.window.createOutputChannel(channelName);
        this.strategy = strategy;
        this.whitelist = whitelist;
    }

    private sanitize(message: string): string {
        const matches = detectSecrets(message, { whitelist: this.whitelist });
        if (matches.length === 0) {
            return message;
        }
        return redact(message, matches, this.strategy);
    }

    private formatArgs(args: unknown[]): string {
        return args.map(arg => {
            if (typeof arg === 'string') {
                return arg;
            }
            if (arg instanceof Error) {
                return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
            }
            try {
                return JSON.stringify(arg, null, 2);
            } catch {
                return String(arg);
            }
        }).join(' ');
    }

    log(...args: unknown[]): void {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[LOG] ${message}`);
    }

    error(...args: unknown[]): void {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[ERROR] ${message}`);
    }

    warn(...args: unknown[]): void {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[WARN] ${message}`);
    }

    info(...args: unknown[]): void {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[INFO] ${message}`);
    }

    debug(...args: unknown[]): void {
        const message = this.sanitize(this.formatArgs(args));
        this.outputChannel.appendLine(`[DEBUG] ${message}`);
    }

    show(): void {
        this.outputChannel.show();
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}
