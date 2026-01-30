import crypto from 'crypto';

function ngrams(text, n = 3){
  const clean = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (clean.length < n) return new Set();
  const out = new Set();
  for (let i = 0; i <= clean.length - n; i += 1){
    out.add(clean.slice(i, i + n));
  }
  return out;
}

function jaccard(a, b){
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const item of a){
    if (b.has(item)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

export function scorePage({ type, text, fields, siblingSets }){
  const minLen = type === 'listing' ? 420 : type === 'aggregation' ? 520 : type === 'guide' ? 580 : 200;
  const lenScore = Math.min(1, String(text || '').length / minLen);
  const fieldValues = Object.values(fields || {});
  const fieldScore = fieldValues.length ? fieldValues.filter(Boolean).length / fieldValues.length : 0.5;
  const grams = ngrams(text, 3);
  let maxSim = 0;
  if (Array.isArray(siblingSets)){
    siblingSets.forEach((set)=>{
      maxSim = Math.max(maxSim, jaccard(grams, set));
    });
  }
  const uniqueness = 1 - maxSim;
  const score = Math.round((lenScore * 0.45 + fieldScore * 0.35 + uniqueness * 0.20) * 100);
  const reason = [
    lenScore < 0.8 ? 'low_text' : '',
    fieldScore < 0.6 ? 'missing_fields' : '',
    uniqueness < 0.4 ? 'similarity_high' : ''
  ].filter(Boolean).join(',') || 'ok';
  const hash = crypto.createHash('sha1').update(String(text || '')).digest('hex');
  return { score, reason, grams, hash };
}
