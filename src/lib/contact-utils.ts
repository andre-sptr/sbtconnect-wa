export type ContactImportRow = {
  name: string;
  phone: string;
  team: string;
  role: string;
  tags: string[];
  optedIn: boolean;
};

const HEADER_ALIASES = {
  name: ["name", "nama"],
  phone: ["phone", "nomor", "number", "whatsapp", "wa"],
  team: ["team", "tim", "divisi", "department"],
  role: ["role", "jabatan", "posisi"],
  tags: ["tags", "tag", "label"],
  optIn: ["optin", "opt_in", "opted_in", "izin", "consent"],
};

function cleanPhoneInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeWhatsappNumber(input: string): string | null {
  const raw = cleanPhoneInput(input);
  if (!raw) return null;
  if (/[a-z]/i.test(raw.replace(/@c\.us$/i, ""))) return null;

  const withoutSuffix = raw.replace(/@c\.us$/i, "");
  let digits = withoutSuffix.replace(/[^\d]/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  if (digits.startsWith("8")) digits = `62${digits}`;

  if (!digits.startsWith("62")) return null;
  if (digits.length < 10 || digits.length > 15) return null;

  return `${digits}@c.us`;
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function headerIndex(headers: string[], key: keyof typeof HEADER_ALIASES) {
  return headers.findIndex((header) => HEADER_ALIASES[key].includes(normalizeHeader(header)));
}

function hasHeader(columns: string[]) {
  const normalized = columns.map(normalizeHeader);
  return normalized.some((header) => HEADER_ALIASES.phone.includes(header));
}

function boolFromCell(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return true;
  return ["true", "1", "yes", "ya", "y", "opt-in", "izin"].includes(normalized);
}

function tagsFromCell(value: string | undefined) {
  return (value ?? "")
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseContactRows(input: string): ContactImportRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const firstColumns = splitCsvLine(lines[0]);
  const containsHeader = hasHeader(firstColumns);
  const headers = containsHeader ? firstColumns : [];
  const dataLines = containsHeader ? lines.slice(1) : lines;
  const phoneIndex = containsHeader ? headerIndex(headers, "phone") : -1;
  const nameIndex = containsHeader ? headerIndex(headers, "name") : -1;
  const teamIndex = containsHeader ? headerIndex(headers, "team") : -1;
  const roleIndex = containsHeader ? headerIndex(headers, "role") : -1;
  const tagsIndex = containsHeader ? headerIndex(headers, "tags") : -1;
  const optInIndex = containsHeader ? headerIndex(headers, "optIn") : -1;

  return dataLines.flatMap((line) => {
    const columns = splitCsvLine(line);
    const phoneCell = containsHeader
      ? columns.length === 1
        ? columns[0]
        : columns[phoneIndex] ?? ""
      : columns.length === 1
        ? columns[0]
        : columns[1] ?? columns[0];
    const phone = normalizeWhatsappNumber(phoneCell);
    if (!phone) return [];

    return [
      {
        name: containsHeader
          ? columns.length === 1
            ? ""
            : columns[nameIndex] ?? ""
          : columns.length > 1
            ? columns[0] ?? ""
            : "",
        phone,
        team: containsHeader ? columns[teamIndex] ?? "" : columns[2] ?? "",
        role: containsHeader ? columns[roleIndex] ?? "" : columns[3] ?? "",
        tags: tagsFromCell(containsHeader ? columns[tagsIndex] : columns[4]),
        optedIn: boolFromCell(containsHeader ? columns[optInIndex] : columns[5]),
      },
    ];
  });
}

export function uniqueContactRows(rows: ContactImportRow[]) {
  const seen = new Set<string>();
  const unique: ContactImportRow[] = [];

  for (const row of rows) {
    if (seen.has(row.phone)) continue;
    seen.add(row.phone);
    unique.push(row);
  }

  return unique;
}
