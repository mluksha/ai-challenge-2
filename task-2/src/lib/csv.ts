// Excel/Sheets-safe CSV: UTF-8 BOM + CRLF + quoted fields.
export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    triggerDownload(filename, "\ufeff");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  triggerDownload(filename, "\ufeff" + lines.join("\r\n"));
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
