import { escapeHtml } from '../utils/text.js';
import { renderLinkCards } from './shared.js';

export function renderIndex({
  title,
  intro,
  sections
}){
  return `
<main>
  <div class="hero">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(intro)}</p>
  </div>
  <section class="cluster">
    ${sections.map((section)=>`<section class="card"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p>${renderLinkCards(section.items)}</section>`).join('')}
  </section>
</main>`;
}
