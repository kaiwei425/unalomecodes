import { escapeHtml } from '../utils/text.js';
import { renderBreadcrumb, renderLinkCards } from './shared.js';

export function renderGuide({
  title,
  intro,
  scenario,
  list,
  cta,
  stats,
  breadcrumbs,
  related
}){
  return `
<main>
  ${renderBreadcrumb(breadcrumbs)}
  <div class="hero">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(intro)}</p>
  </div>
  <section class="card">
    <h2>${escapeHtml(scenario.title)}</h2>
    <p>${escapeHtml(scenario.body)}</p>
    <div class="meta-grid">${stats.map((stat)=>`<div class="item"><div class="label">${escapeHtml(stat.label)}</div><div class="value">${escapeHtml(stat.value)}</div></div>`).join('')}</div>
  </section>
  <section class="card">
    <h2>${escapeHtml(list.title)}</h2>
    ${renderLinkCards(list.items)}
  </section>
  <section class="card">
    <h2>${escapeHtml(cta.title)}</h2>
    <p>${escapeHtml(cta.body)}</p>
    <a class="cta" href="${escapeHtml(cta.url)}">${escapeHtml(cta.label)}</a>
  </section>
  <section class="card">
    <h2>${escapeHtml(related.title)}</h2>
    ${renderLinkCards(related.items)}
  </section>
</main>`;
}
