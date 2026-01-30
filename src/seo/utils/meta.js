import { escapeHtml } from './text.js';
import { SITE, LANGS } from '../config.js';

export function renderHead({
  lang,
  title,
  description,
  canonical,
  alternates,
  noindex,
  ogImage,
  extraHead = ''
}){
  const langMeta = LANGS[lang] || LANGS.zh;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description || '');
  const safeCanonical = escapeHtml(canonical || `${SITE.origin}${langMeta.prefix}/`);
  const image = ogImage || SITE.ogDefault || SITE.ogFallback;
  const safeImage = escapeHtml(image.startsWith('http') ? image : `${SITE.origin}${image}`);
  const robots = noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow">';
  const altLinks = Array.isArray(alternates) ? alternates.map((alt)=>{
    return `<link rel="alternate" hreflang="${escapeHtml(alt.hreflang)}" href="${escapeHtml(alt.href)}">`;
  }).join('\n') : '';

  return `\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${safeTitle}</title>\n<meta name="description" content="${safeDesc}">\n<link rel="canonical" href="${safeCanonical}">\n${robots}\n<link rel="stylesheet" href="/assets/seo-pages.css">\n${altLinks}\n<meta property="og:type" content="website">\n<meta property="og:title" content="${safeTitle}">\n<meta property="og:description" content="${safeDesc}">\n<meta property="og:url" content="${safeCanonical}">\n<meta property="og:image" content="${safeImage}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${safeTitle}">\n<meta name="twitter:description" content="${safeDesc}">\n<meta name="twitter:image" content="${safeImage}">\n${extraHead}`;
}

export function buildAlternates(path){
  const cleanPath = String(path || '').replace(/^\\/(zh|en)(?=\\/)/, '');
  return [
    { hreflang: 'zh-Hant', href: `${SITE.origin}/zh${cleanPath}` },
    { hreflang: 'en', href: `${SITE.origin}/en${cleanPath}` },
    { hreflang: 'x-default', href: `${SITE.origin}/en${cleanPath}` }
  ];
}
