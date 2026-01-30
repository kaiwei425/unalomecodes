import { escapeHtml } from '../utils/text.js';

export function renderSeoReport({
  title,
  generatedAt,
  summary,
  missingStats,
  lowPages,
  slugConflicts,
  sitemaps,
  gateNotice
}){
  return `
<main>
  <div class="hero">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(gateNotice)}</p>
  </div>
  <section class="card">
    <h2>Summary</h2>
    <div class="meta-grid">
      ${summary.map(row=>`<div class="item"><div class="label">${escapeHtml(row.label)}</div><div class="value">${escapeHtml(row.value)}</div></div>`).join('')}
    </div>
    <p class="footer">Generated at ${escapeHtml(generatedAt)}</p>
  </section>
  <section class="card">
    <h2>Missing Fields</h2>
    <table class="table">
      <thead><tr><th>Field</th><th>Count</th></tr></thead>
      <tbody>${missingStats.map(row=>`<tr><td>${escapeHtml(row.field)}</td><td>${escapeHtml(String(row.count))}</td></tr>`).join('')}</tbody>
    </table>
  </section>
  <section class="card">
    <h2>Lowest Quality Pages</h2>
    <table class="table">
      <thead><tr><th>URL</th><th>Score</th><th>Reason</th></tr></thead>
      <tbody>${lowPages.map(row=>`<tr><td><a href="${escapeHtml(row.url)}">${escapeHtml(row.url)}</a></td><td>${escapeHtml(String(row.score))}</td><td>${escapeHtml(row.reason)}</td></tr>`).join('')}</tbody>
    </table>
  </section>
  <section class="card">
    <h2>Slug Conflicts</h2>
    <table class="table">
      <thead><tr><th>Slug</th><th>Count</th></tr></thead>
      <tbody>${slugConflicts.map(row=>`<tr><td>${escapeHtml(row.slug)}</td><td>${escapeHtml(String(row.count))}</td></tr>`).join('') || '<tr><td colspan="2">None</td></tr>'}</tbody>
    </table>
  </section>
  <section class="card">
    <h2>Sitemap Files</h2>
    <table class="table">
      <thead><tr><th>File</th><th>URLs</th></tr></thead>
      <tbody>${sitemaps.map(row=>`<tr><td>${escapeHtml(row.file)}</td><td>${escapeHtml(String(row.count))}</td></tr>`).join('')}</tbody>
    </table>
  </section>
</main>`;
}
