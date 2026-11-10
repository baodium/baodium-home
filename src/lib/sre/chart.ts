/** Preserve missing measurements as gaps and use simulation timestamps on x. */
export function seriesPath<T extends { t: number }>(
  rows: T[],
  pick: (row: T) => number | null,
  x: (t: number) => number,
  y: (value: number) => number,
): string {
  let penDown = false;
  return rows
    .map((row) => {
      const value = pick(row);
      if (value == null || !Number.isFinite(value)) {
        penDown = false;
        return "";
      }
      const command = penDown ? "L" : "M";
      penDown = true;
      return `${command}${x(row.t).toFixed(2)},${y(value).toFixed(2)}`;
    })
    .filter(Boolean)
    .join(" ");
}
