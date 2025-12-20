const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

export const highlightPenman = (penman: string): string => {
  const escaped = escapeHtml(penman)
  return escaped
    .replace(/(\()/g, '<span style="color:#1976d2;font-weight:700;">$1</span>')
    .replace(/(\))/g, '<span style="color:#d81b60;font-weight:700;">$1</span>')
    .replace(/(:[A-Za-z0-9_-]+)/g, '<span style="color:#388e3c;font-weight:700;">$1</span>')
}

export const analyzeParens = (text: string): { balanced: boolean; openings: number; closings: number } => {
  let openings = 0
  let closings = 0
  for (const char of text) {
    if (char === '(') openings += 1
    if (char === ')') closings += 1
  }
  return { balanced: openings === closings, openings, closings }
}
