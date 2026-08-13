export function friendlyColumn(key: string) {
  const special: Record<string, string> = { id: 'ID', gst: 'GST', gstin: 'GSTIN', hsn: 'HSN', uom: 'UOM', kms: 'KMS', ot: 'OT', fy: 'FY' };
  return key.split('_').map((part) => special[part.toLowerCase()] ?? part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function isAmountColumn(key: string, label = '') {
  return /amount|total|balance|salary|rate|price|cost|fee|outstanding|billed|taxable|advance|deduction|earning|discount|credit|received|additional_paid|total_paid|allocated_amount|paid_amount/i.test(`${key} ${label}`);
}

export function reportValue(value: unknown, key: string) {
  if (value === null || value === undefined || value === '') return '\u2014';
  if (isAmountColumn(key) && !Number.isNaN(Number(value))) {
    return `₹ ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
  return String(value).replaceAll('_', ' ');
}

export function exportExcel(filename: string, rows: Record<string, unknown>[], columns: { key: string; label: string }[]) {
  const escape = (value: unknown) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  const table = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>table{border-collapse:collapse;font-family:Calibri,sans-serif;font-size:11pt}th{background:#082a56;color:#fff;font-weight:bold}th,td{border:1px solid #e2a47d;padding:6px 10px;white-space:nowrap}.num{text-align:right}tr:nth-child(even){background:#fff7ed}</style></head><body><table><thead><tr>${columns.map((column) => `<th${isAmountColumn(column.key,column.label)?' class="num"':''}>${escape(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td${isAmountColumn(column.key,column.label)?' class="num"':''}>${escape(row[column.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
  const blob = new Blob(['\ufeff', table], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.xls`;
  anchor.click();
  URL.revokeObjectURL(url);
}
