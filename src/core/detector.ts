/**
 * @module core/detector
 * Secret detection engine combining regex pattern matching with entropy scoring.
 */

import * as crypto from 'crypto';
import { BuiltInPatterns, PatternDefinition, PatternSeverity } from './patterns';
import { calculateEntropy } from './entropy';
import { redactPartial } from './redactor';

/** A single detected secret with full context. */
export interface SecretMatch {
    /** Unique identifier for this match. */
    id: string;
    /** Category type of the secret (e.g. 'aws_access_key'). */
    type: string;
    /** Severity level. */
    severity: PatternSeverity;
    /** The raw matched value. */
    value: string;
    /** A partially redacted preview of the value. */
    redactedValue: string;
    /** Start offset in the full text. */
    start: number;
    /** End offset (exclusive) in the full text. */
    end: number;
    /** Zero-based line number. */
    line: number;
    /** Zero-based column number. */
    column: number;
    /** Shannon entropy score of the matched value. */
    entropy: number;
    /** ID of the pattern that detected this match. */
    patternId: string;
}

/** Configuration options for the detector. */
export interface DetectorConfig {
    /** Additional patterns to scan for. */
    customPatterns?: PatternDefinition[];
    /** Values to ignore (exact match). */
    whitelist?: string[];
    /** Minimum entropy threshold for flagging high-entropy strings. */
    entropyThreshold?: number;
    /** Pattern IDs to skip. */
    ignoredPatternIds?: string[];
}

/**
 * Build a lookup of line-start offsets for fast line/column calculation.
 */
function buildLineIndex(text: string): number[] {
    const starts: number[] = [0];
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
            starts.push(i + 1);
        }
    }
    return starts;
}

/**
 * Given an offset and pre-computed line starts, return { line, column } (0-based).
 */
function offsetToLineColumn(offset: number, lineStarts: number[]): { line: number; column: number } {
    let low = 0;
    let high = lineStarts.length - 1;

    while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (lineStarts[mid] <= offset) {
            low = mid;
        } else {
            high = mid - 1;
        }
    }

    return { line: low, column: offset - lineStarts[low] };
}

/**
 * Detect secrets in the given text using pattern matching and entropy analysis.
 *
 * @param text   - The source text to scan.
 * @param config - Optional detection configuration.
 * @returns An array of `SecretMatch` objects sorted by start position.
 */
export function detectSecrets(text: string, config?: DetectorConfig): SecretMatch[] {
    const matches: SecretMatch[] = [];
    const whitelist = new Set(config?.whitelist ?? []);
    const ignoredIds = new Set(config?.ignoredPatternIds ?? []);

    const patterns: PatternDefinition[] = [
        ...BuiltInPatterns,
        ...(config?.customPatterns ?? []),
    ];

    const lineStarts = buildLineIndex(text);

    for (const patternDef of patterns) {
        if (ignoredIds.has(patternDef.id)) {
            continue;
        }

        // Clone the regex to avoid shared lastIndex state.
        const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
        let regexMatch: RegExpExecArray | null;

        while ((regexMatch = regex.exec(text)) !== null) {
            const value = regexMatch[0];

            // Skip whitelisted values.
            if (whitelist.has(value)) {
                continue;
            }

            const start = regexMatch.index;
            const end = start + value.length;

            // Skip if this range overlaps an existing match.
            const overlaps = matches.some(
                (m) =>
                    (m.start <= start && m.end > start) ||
                    (start <= m.start && end > m.start),
            );
            if (overlaps) {
                continue;
            }

            const entropy = calculateEntropy(value);
            const { line, column } = offsetToLineColumn(start, lineStarts);

            matches.push({
                id: crypto.randomUUID(),
                type: patternDef.type,
                severity: patternDef.severity,
                value,
                redactedValue: redactPartial(value),
                start,
                end,
                line,
                column,
                entropy,
                patternId: patternDef.id,
            });

            // Prevent infinite loop on zero-length matches.
            if (value.length === 0) {
                regex.lastIndex++;
            }
        }
    }

    return matches.sort((a, b) => a.start - b.start);
}
