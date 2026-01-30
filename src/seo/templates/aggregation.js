import { escapeHtml } from '../utils/text.js';
import { renderBreadcrumb, renderLinkCards, renderBadges } from './shared.js';

export function renderAggregation({
  lang = 'en',
  title,
  intro,
  stats,
  list,
  faq,
  related,
  breadcrumbs,
  notice
}){
  const statBlocks = stats.map((stat)=>`<div class="item"><div class="label">${escapeHtml(stat.label)}</div><div class="value">${escapeHtml(stat.value)}</div></div>`).join('');
  return `
<main>
  ${renderBreadcrumb(breadcrumbs)}
  <div class="hero">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(intro)}</p>
  </div>
  <section class="card">
    <div class="meta-grid">${statBlocks}</div>
  </section>
  ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ''}
  <section class="card">
    <h2>${lang === 'zh' ? '精選清單' : 'Top Picks'}</h2>
    ${renderLinkCards(list)}
  </section>
  <section class="card faq">
    <h2>${lang === 'zh' ? '常見問題' : 'FAQ'}</h2>
    ${faq.map((item)=>`<h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p>`).join('')}
  </section>
  <section class="card">
    <h2>${escapeHtml(related.title)}</h2>
    ${renderBadges(related.tags)}
    ${renderLinkCards(related.items)}
  </section>
</main>`;
}
