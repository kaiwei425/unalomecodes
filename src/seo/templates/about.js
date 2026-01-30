import { escapeHtml } from '../utils/text.js';
import { renderBreadcrumb, renderLinkCards } from './shared.js';

export function renderAbout({
  title,
  sections,
  breadcrumbs,
  links
}){
  return `
<main>
  ${renderBreadcrumb(breadcrumbs)}
  <div class="hero">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml('内容已預留，可持續擴充實地經驗與研究方法。')}</p>
  </div>
  ${sections.map((section)=>`<section class="card"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`).join('')}
  <section class="card">
    <h2>${escapeHtml('了解更多')}</h2>
    ${renderLinkCards(links)}
  </section>
</main>`;
}
