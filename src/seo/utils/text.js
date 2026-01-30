export function escapeHtml(text){
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sentenceCase(text){
  const raw = String(text || '').trim();
  if (!raw) return '';
  return raw[0].toUpperCase() + raw.slice(1);
}

export function joinText(parts, sep = ' '){
  return parts.filter(Boolean).join(sep).replace(/\s+/g, ' ').trim();
}

export function shortText(text, max = 160){
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (raw.length <= max) return raw;
  return raw.slice(0, max - 1) + '…';
}

export function toTitle(text){
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function formatList(list){
  if (!Array.isArray(list) || !list.length) return '';
  return list.filter(Boolean).join('、');
}
