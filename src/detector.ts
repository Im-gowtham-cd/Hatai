import { PREDEFINED_PATTERNS, SecretPattern } from './patterns';

export interface SecretMatch {
    type: string;
    value: string;
    start: number;
    end: number;
}

export interface DetectorOptions {
    whitelist?: string[];
    customPatterns?: SecretPattern[];
}

export function detectSecrets(text: string, options: DetectorOptions = {}): SecretMatch[] {
    const matches: SecretMatch[] = [];
    const patterns = [...PREDEFINED_PATTERNS, ...(options.customPatterns || [])];
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
            const alreadyFound = matches.some(m =>
                (m.start <= match!.index && m.end >= match!.index + value.length) ||
                (match!.index <= m.start && match!.index + value.length >= m.end)
            );

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
