export function ruNoun(n, one, few, many) {
  const value = Math.abs(Number(n)) || 0;
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 === 1) return one;
  if (mod10 > 1 && mod10 < 5) return few;
  return many;
}
