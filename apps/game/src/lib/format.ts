/**
 * Format a number for HUD display: integers as bare digits, fractional
 * values to at most 2 decimal places (trailing zeros trimmed), and
 * scientific notation for very large or very small magnitudes.
 *
 *   0         → "0"
 *   3090      → "3090"
 *   42.7      → "42.7"
 *   42.75     → "42.75"
 *   0.068     → "0.07"
 *   1234567   → "1.23e6"
 *   0.00034   → "3.40e-4"
 *
 * Previously this used 4 fixed decimals everywhere, which produced
 * "3090.0000" / "0.0000" noise on a HUD whose values are usually
 * counter-style integers (CPU Energy, AGNTC balance, Data Frags).
 */
export function sciFormat(n: number): string {
  if (n === 0) return '0';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  // Scientific notation for very large (>=1e6) or very small (<0.01) values
  if (abs >= 1e6 || (abs > 0 && abs < 0.01)) {
    const exp = Math.floor(Math.log10(abs));
    const mantissa = abs / Math.pow(10, exp);
    return `${sign}${mantissa.toFixed(2)}e${exp}`;
  }

  // Integer values: render without decimals
  if (Number.isInteger(abs)) {
    return `${sign}${abs}`;
  }
  // Fractional: at most 2 decimal places, trailing zeros trimmed by parseFloat
  return `${sign}${parseFloat(abs.toFixed(2))}`;
}

/**
 * Short scientific format for rate displays (+X/t).
 * Uses 2 decimal places to keep it compact.
 */
export function sciRate(n: number): string {
  if (n === 0) return '0.00';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '+';

  if (abs >= 1e6 || (abs > 0 && abs < 0.01)) {
    const exp = Math.floor(Math.log10(abs));
    const mantissa = abs / Math.pow(10, exp);
    return `${sign}${mantissa.toFixed(2)}e${exp}`;
  }

  return `${sign}${abs.toFixed(2)}`;
}
