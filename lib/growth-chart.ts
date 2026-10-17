/** Keep small changes visible without turning missing measurements into zeroes. */
export function growthRange(values: number[], fromZero = false): [number, number] {
  const valid = values.filter(value => Number.isFinite(value) && value >= 0);
  if (!valid.length) return [0, 1];
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const padding = Math.max(1, Math.ceil((max - min) * 0.15));
  return [fromZero ? 0 : Math.max(0, min - padding), max + padding];
}
