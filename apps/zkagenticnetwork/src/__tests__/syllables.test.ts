import { describe, it, expect } from 'vitest';
import { countSyllables, validateHaiku, parseHaikuLines } from '@/lib/syllables';

describe('countSyllables', () => {
  it('counts single-syllable words', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('dog')).toBe(1);
    expect(countSyllables('the')).toBe(1);
  });

  it('counts multi-syllable words', () => {
    expect(countSyllables('hello')).toBe(2);
    expect(countSyllables('beautiful')).toBe(3);
    expect(countSyllables('computer')).toBe(3);
  });

  it('handles silent e', () => {
    expect(countSyllables('make')).toBe(1);
    expect(countSyllables('love')).toBe(1);
    expect(countSyllables('time')).toBe(1);
  });

  it('counts syllables in a line', () => {
    expect(countSyllables('morning dew glistens')).toBe(5);
  });
});

describe('parseHaikuLines', () => {
  it('splits text into 3 lines', () => {
    const lines = parseHaikuLines('line one\nline two\nline three');
    expect(lines).toEqual(['line one', 'line two', 'line three']);
  });

  it('returns null for non-3-line input', () => {
    expect(parseHaikuLines('only one line')).toBeNull();
    expect(parseHaikuLines('one\ntwo')).toBeNull();
    expect(parseHaikuLines('one\ntwo\nthree\nfour')).toBeNull();
  });
});

describe('validateHaiku', () => {
  it('validates a correct 5-7-5 haiku', () => {
    const result = validateHaiku('An old silent pond\nA frog jumps into the pond\nSplash silence again');
    expect(result.valid).toBe(true);
    expect(result.syllables).toEqual([5, 7, 5]);
  });

  it('rejects non-5-7-5 patterns', () => {
    const result = validateHaiku('Too short\nAlso too short\nShort');
    expect(result.valid).toBe(false);
  });

  it('rejects text that is not 3 lines', () => {
    const result = validateHaiku('This is just one line');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
