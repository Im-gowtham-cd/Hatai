"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redact = redact;
function redact(text, matches, strategy = 'full') {
    if (matches.length === 0) {
        return text;
    }
    // Sort matches in reverse order so string manipulation doesn't affect subsequent indices
    const sortedMatches = [...matches].sort((a, b) => b.start - a.start);
    let redactedText = text;
    for (const match of sortedMatches) {
        const replacement = getRedactedValue(match.value, strategy);
        redactedText =
            redactedText.substring(0, match.start) +
                replacement +
                redactedText.substring(match.end);
    }
    return redactedText;
}
function getRedactedValue(value, strategy) {
    if (strategy === 'full') {
        return '***REDACTED***';
    }
    if (value.length <= 8) {
        return '********';
    }
    // Partial: show first 2 and last 2 chars
    const prefix = value.substring(0, 2);
    const suffix = value.substring(value.length - 2);
    return `${prefix}**********${suffix}`;
}
//# sourceMappingURL=redactor.js.map