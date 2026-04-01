/**
 * Parses a CSV string into an array of objects keyed by header names.
 * Handles quoted fields (including commas and newlines inside quotes).
 */
export function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let current = "";
  let inQuote = false;
  let row: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const ch = lines[i];
    if (ch === '"') {
      if (inQuote && lines[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      row.push(current.trim());
      current = "";
    } else if (ch === "\n" && !inQuote) {
      row.push(current.trim());
      current = "";
      rows.push(row);
      row = [];
    } else {
      current += ch;
    }
  }
  if (current || row.length) {
    row.push(current.trim());
    rows.push(row);
  }

  // Filter out empty rows
  const nonEmpty = rows.filter((r) => r.some((c) => c !== ""));
  if (nonEmpty.length < 2) return [];

  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? "";
    });
    return obj;
  });
}
