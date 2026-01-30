import { escapeHtml, formatList } from '../utils/text.js';
import { renderBreadcrumb, renderBadges, renderLinkCards } from './shared.js';

export function renderListing({
  lang,
  title,
  summary,
  item,
  breadcrumbs,
  sections,
  updatedAt,
  sourceLabel,
  links
}){
  const metaItems = [
    { label: lang === 'en' ? 'Address' : '地址', value: item.address || '-' },
    { label: lang === 'en' ? 'Area' : '區域', value: item.region || '-' },
    { label: lang === 'en' ? 'Category' : '分類', value: item.category || '-' },
    { label: lang === 'en' ? 'Tags' : '標籤', value: formatList(item.tags) || '-' },
    { label: lang === 'en' ? 'Price' : '價位', value: item.price || '-' },
    { label: lang === 'en' ? 'Rating' : '評分', value: item.rating || '-' },
    { label: lang === 'en' ? 'Hours' : '營業時間', value: item.hours || '-' },
    { label: lang === 'en' ? 'Transit' : '交通', value: item.transit || '-' },
    { label: lang === 'en' ? 'Phone' : '電話', value: item.phone || '-' }
  ];
  const detailBlocks = sections.map((section)=>{
    return `<section class="card"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`;
  }).join('');

  return `
<main>
  ${renderBreadcrumb(breadcrumbs)}
  <div class="hero">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(summary)}</p>
    ${renderBadges(item.tags)}
  </div>
  <section class="card">
    <div class="meta-grid">
      ${metaItems.map((row)=>`<div class="item"><div class="label">${escapeHtml(row.label)}</div><div class="value">${escapeHtml(row.value)}</div></div>`).join('')}
    </div>
    <p class="footer">${lang === 'en' ? 'Last updated' : '最後更新'}：${escapeHtml(updatedAt)}｜${lang === 'en' ? 'Source' : '資料來源'}：${escapeHtml(sourceLabel)}</p>
  </section>
  ${detailBlocks}
  <section class="card">
    <h2>${lang === 'en' ? 'Nearby & related' : '附近與相關推薦'}</h2>
    ${links.map((group)=>`<h3>${escapeHtml(group.title)}</h3>${renderLinkCards(group.items)}`).join('')}
  </section>
</main>`;
}
