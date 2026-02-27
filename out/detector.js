"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSecrets = detectSecrets;
const patterns_1 = require("./patterns");
function detectSecrets(text, options = {}) {
    const matches = [];
    const patterns = [...patterns_1.PREDEFINED_PATTERNS, ...(options.customPatterns || [])];
    const whitelist = options.whitelist || [];
    for (const { type, pattern } of patterns) {
        let match;
        // Reset regex index if global
        if (pattern.global) {
            pattern.lastIndex = 0;
        }
        while ((match = pattern.exec(text)) !== null) {
            const value = match[0];
            // Check whitelist
            if (whitelist.includes(value)) {
                continue;
            }
            // Avoid overlapping matches of the same type or near-duplicates
            const alreadyFound = matches.some(m => (m.start <= match.index && m.end >= match.index + value.length) ||
                (match.index <= m.start && match.index + value.length >= m.end));
            if (!alreadyFound) {
                matches.push({
                    type,
                    value,
                    start: match.index,
                    end: match.index + value.length
                });
            }
        }
    }
    // Sort by start position
    return matches.sort((a, b) => a.start - b.start);
}
//# sourceMappingURL=detector.js.map