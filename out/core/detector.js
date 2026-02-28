"use strict";
/**
 * @module core/detector
 * Secret detection engine combining regex pattern matching with entropy scoring.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSecrets = detectSecrets;
const crypto = require("crypto");
const patterns_1 = require("./patterns");
const entropy_1 = require("./entropy");
const redactor_1 = require("./redactor");
/**
 * Build a lookup of line-start offsets for fast line/column calculation.
 */
function buildLineIndex(text) {
    const starts = [0];
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
function offsetToLineColumn(offset, lineStarts) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (lineStarts[mid] <= offset) {
            low = mid;
        }
        else {
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
function detectSecrets(text, config) {
    const matches = [];
    const whitelist = new Set(config?.whitelist ?? []);
    const ignoredIds = new Set(config?.ignoredPatternIds ?? []);
    const patterns = [
        ...patterns_1.BuiltInPatterns,
        ...(config?.customPatterns ?? []),
    ];
    const lineStarts = buildLineIndex(text);
    for (const patternDef of patterns) {
        if (ignoredIds.has(patternDef.id)) {
            continue;
        }
        // Clone the regex to avoid shared lastIndex state.
        const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
        let regexMatch;
        while ((regexMatch = regex.exec(text)) !== null) {
            const value = regexMatch[0];
            // Skip whitelisted values.
            if (whitelist.has(value)) {
                continue;
            }
            const start = regexMatch.index;
            const end = start + value.length;
            // Skip if this range overlaps an existing match.
            const overlaps = matches.some((m) => (m.start <= start && m.end > start) ||
                (start <= m.start && end > m.start));
            if (overlaps) {
                continue;
            }
            const entropy = (0, entropy_1.calculateEntropy)(value);
            const { line, column } = offsetToLineColumn(start, lineStarts);
            matches.push({
                id: crypto.randomUUID(),
                type: patternDef.type,
                severity: patternDef.severity,
                value,
                redactedValue: (0, redactor_1.redactPartial)(value),
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
//# sourceMappingURL=detector.js.map