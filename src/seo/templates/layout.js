import { renderHead } from '../utils/meta.js';
import { orgSchema, websiteSchema } from '../utils/schema.js';
import { LANGS } from '../config.js';

export function renderLayout({
  lang,
  title,
  description,
  canonical,
  alternates,
  noindex,
  ogImage,
  body,
  jsonLd = [],
  extraHead = ''
}){
  const head = renderHead({ lang, title, description, canonical, alternates, noindex, ogImage, extraHead });
  const langMeta = LANGS[lang] || LANGS.zh;
  const schemas = [orgSchema(), websiteSchema(), ...jsonLd]
    .map((schema)=>`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\\\u003c')}</script>`)
    .join('\n');
  return `<!doctype html>
<html lang="${langMeta.locale}">
<head>${head}
${schemas}
</head>
<body>
<header class="site">
  <div class="wrap">
    <a href="${langMeta.prefix}/">Unalome Codes SEO</a>
    <div class="lang">${langMeta.label}</div>
  </div>
</header>
${body}
</body>
</html>`;
}
