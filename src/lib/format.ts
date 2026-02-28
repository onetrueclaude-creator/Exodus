/**
 * Format a number in scientific notation for large/small values,
 * or as a compact decimal for mid-range values.
 * Shows 2 decimal places (0.00).
 *
 *   1234567   → "1.23e6"
 *   0.00034   → "3.40e-4"
 *   42.7      → "42.70"
 *   0         → "0.00"
 */
export function sciFormat(n: number): string {
  if (n === 0) return '0.00';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  // Use scientific notation for very large (>=1e6) or very small (<0.01) values
  if (abs >= 1e6 || (abs > 0 && abs < 0.01)) {
    const exp = Math.floor(Math.log10(abs));
    const mantissa = abs / Math.pow(10, exp);
    return `${sign}${mantissa.toFixed(2)}e${exp}`;
  }

  // Mid-range: show fixed 2 decimal places
  return `${sign}${abs.toFixed(2)}`;
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
