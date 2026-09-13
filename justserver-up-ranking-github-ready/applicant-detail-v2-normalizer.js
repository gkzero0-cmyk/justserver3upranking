function cleanLine(value) {
  return String(value ?? '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '').trim();
}

function parseHeaderLine(line) {
  const match = cleanLine(line).match(/^(.+?)\s*\/\s*([0-9][0-9,]*(?:\s*명)?)\s*$/u);
  if (!match) return null;
  return { name: match[1].trim(), countText: match[2].trim() };
}

function parseMoveInFeeLine(line) {
  const text = cleanLine(line);
  let match = text.match(/^입\s*주\s*비\s*(?:동\s*의\s*)?여\s*부\s*[:：-]?\s*(.+)$/u);
  if (match) return match[1].trim();
  match = text.match(/^입\s*주\s*비\s*[:：-]\s*(.+)$/u);
  return match ? match[1].trim() : '';
}

function repairStructuredDetail(detail) {
  if (!detail || typeof detail !== 'object') return detail;
  const originalComment = cleanLine(detail.originalComment);
  if (!originalComment) return detail;

  const lines = originalComment.split(/\r?\n/).map(cleanLine).filter(Boolean);
  if (lines.length < 3) return detail;
  const header = parseHeaderLine(lines[0]);
  if (!header) return detail;

  let feeIndex = -1;
  let moveInFee = '';
  for (let index = lines.length - 1; index >= 1; index -= 1) {
    const fee = parseMoveInFeeLine(lines[index]);
    if (!fee) continue;
    feeIndex = index;
    moveInFee = fee;
    break;
  }
  if (feeIndex < 0) return detail;

  const message = lines.slice(1, feeIndex).join('\n').trim();
  if (!message) return detail;

  return {
    ...detail,
    name: header.name || detail.name,
    message,
    moveInFee
  };
}

module.exports = { cleanLine, parseHeaderLine, parseMoveInFeeLine, repairStructuredDetail };
