export function escapeHtml(value: string): string { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
export function escapeXml(value: string): string { return escapeHtml(value); }
export function escapeMarkdown(value: string): string { return value.replaceAll('\\', '\\\\').replaceAll('|', '\\|').replaceAll('[', '\\[').replaceAll(']', '\\]'); }
