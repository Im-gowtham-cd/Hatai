/**
 * @module core/entropy
 * Shannon entropy scoring for identifying high-randomness strings
 * that may be generated secrets or tokens.
 */

/**
 * Calculate the Shannon entropy of a string.
 *
 * Entropy measures the randomness / unpredictability of the characters.
 * Higher values indicate more random strings (likely generated tokens).
 *
 * Formula: H = -Σ p(x) * log2(p(x))
 *
 * @param value - The string to evaluate.
 * @returns The Shannon entropy value (bits per character).
 */
export function calculateEntropy(value: string): number {
    if (value.length === 0) {
        return 0;
    }

    const frequencyMap = new Map<string, number>();

    for (const char of value) {
        frequencyMap.set(char, (frequencyMap.get(char) ?? 0) + 1);
    }

    let entropy = 0;
    const length = value.length;

    for (const count of frequencyMap.values()) {
        const probability = count / length;
        if (probability > 0) {
            entropy -= probability * Math.log2(probability);
        }
    }

    return entropy;
}

/**
 * Determine whether a string has high entropy (likely a generated secret).
 *
 * @param value     - The string to evaluate.
 * @param threshold - Minimum entropy to be considered "high". Defaults to 3.5.
 * @returns `true` if the entropy exceeds the threshold.
 */
export function isHighEntropy(value: string, threshold: number = 3.5): boolean {
    return calculateEntropy(value) >= threshold;
}
