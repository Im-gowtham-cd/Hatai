/**
 * @module core/redactor
 * Redaction strategies for sanitizing detected secrets.
 */

import type { SecretMatch } from './detector';

/** Available redaction strategies. */
export type RedactStrategy = 'full' | 'partial' | 'placeholder';

/**
 * Apply a redaction strategy to the given text, replacing all matched secrets.
 *
 * @param text     - Original text.
 * @param matches  - Detected secrets with offset information.
 * @param strategy - The redaction strategy to use.
 * @returns The text with all secrets replaced.
 */
export function redact(text: string, matches: SecretMatch[], strategy: RedactStrategy = 'placeholder'): string {
    if (matches.length === 0) {
        return text;
    }

    // Process in reverse order so that earlier offsets remain valid.
    const sorted = [...matches].sort((a, b) => b.start - a.start);
    let result = text;

    for (const match of sorted) {
        let replacement: string;

        switch (strategy) {
            case 'full':
                replacement = redactFull();
                break;
            case 'partial':
                replacement = redactPartial(match.value);
                break;
            case 'placeholder':
                replacement = redactPlaceholder(match.type);
                break;
        }

        result = result.substring(0, match.start) + replacement + result.substring(match.end);
    }

    return result;
}

/**
 * Full redaction — replaces the entire value with a fixed token.
 *
 * @returns `***REDACTED***`
 */
export function redactFull(): string {
    return '***REDACTED***';
}

/**
 * Partial redaction — preserves the first 2 and last 2 characters.
 *
 * @param value - The raw secret value.
 * @returns A partially masked string (e.g. `sk**********ef`).
 */
export function redactPartial(value: string): string {
    if (value.length <= 4) {
        return '*'.repeat(value.length);
    }

    const prefix = value.substring(0, 2);
    const suffix = value.substring(value.length - 2);
    return `${prefix}${'*'.repeat(Math.min(value.length - 4, 10))}${suffix}`;
}

/**
 * Placeholder redaction — generates a vault-style placeholder from the secret type.
 *
 * @param type - The secret type string (e.g. 'aws_access_key').
 * @returns A placeholder like `{{AWS_ACCESS_KEY}}`.
 */
export function redactPlaceholder(type: string): string {
    return `{{${type.toUpperCase()}}}`;
}
