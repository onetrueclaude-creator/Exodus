/**
 * Count syllables in a word using vowel-group heuristics.
 * Handles: silent e, vowel dipthongs, common suffixes.
 * For a line/sentence, splits on whitespace and sums word counts.
 */
export function countSyllables(input: string): number {
  const words = input.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return words.reduce((total, word) => total + countWordSyllables(word), 0);
}

function countWordSyllables(word: string): number {
  word = word.replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;

  // Remove trailing silent e
  let processed = word;
  if (processed.endsWith('e') && !processed.endsWith('le')) {
    processed = processed.slice(0, -1);
  }

  // Count vowel groups
  const vowelGroups = processed.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;

  // Handle -le ending (adds syllable)
  if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
    count++;
  }

  // Handle -ed ending (usually not a syllable unless preceded by t/d)
  if (word.endsWith('ed') && word.length > 3) {
    const beforeEd = word[word.length - 3];
    if (beforeEd !== 't' && beforeEd !== 'd') {
      count = Math.max(1, count - 1);
    }
  }

  return Math.max(1, count);
}

export function parseHaikuLines(text: string): [string, string, string] | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length !== 3) return null;
  return [lines[0], lines[1], lines[2]];
}

export interface HaikuValidation {
  valid: boolean;
  syllables?: [number, number, number];
  error?: string;
}

export function validateHaiku(text: string): HaikuValidation {
  const lines = parseHaikuLines(text);
  if (!lines) {
    return { valid: false, error: 'Haiku must be exactly 3 lines' };
  }

  const syllables: [number, number, number] = [
    countSyllables(lines[0]),
    countSyllables(lines[1]),
    countSyllables(lines[2]),
  ];

  const expected: [number, number, number] = [5, 7, 5];
  const valid = syllables[0] === expected[0]
    && syllables[1] === expected[1]
    && syllables[2] === expected[2];

  if (!valid) {
    return {
      valid: false,
      syllables,
      error: `Expected 5-7-5, got ${syllables.join('-')}`,
    };
  }

  return { valid: true, syllables };
}
