export function normalizeUsername(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/\s+/g, '_').toLowerCase();
}

export function isValidMessage(content) {
  return typeof content === 'string' && content.trim().length > 0 && content.length <= 1000;
}
