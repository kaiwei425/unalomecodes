export function slugify(value, fallback = 'item'){
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const normalized = raw.normalize('NFKD').toLowerCase();
  const slug = normalized
    .replace(/&/g, ' and ')
    .replace(/[\s\u00A0]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

export function ensureSlug(value, fallback){
  const slug = slugify(value || '', fallback || 'item');
  return slug || fallback || 'item';
}

export function uniqueSlug(base, existing){
  let slug = base;
  let i = 2;
  while (existing.has(slug)){
    slug = `${base}-${i}`;
    i += 1;
  }
  existing.add(slug);
  return slug;
}
