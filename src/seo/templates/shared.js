import { escapeHtml } from '../utils/text.js';

export function renderBreadcrumb(items){
  const links = items.map((item, idx)=>{
    const label = escapeHtml(item.name);
    if (idx === items.length - 1) return label;
    return `<a href="${escapeHtml(item.url)}">${label}</a>`;
  }).join(' / ');
  return `<nav class="breadcrumb" aria-label="Breadcrumb">${links}</nav>`;
}

export function renderLinkCards(items){
  if (!items || !items.length) return '<div class="notice">資料仍在擴充中。</div>';
  return `<div class="list">${items.map((item)=>{
    return `<a href="${escapeHtml(item.url)}"><strong>${escapeHtml(item.name)}</strong><br><span class="muted">${escapeHtml(item.meta || '')}</span></a>`;
  }).join('')}</div>`;
}

export function renderBadges(list){
  if (!Array.isArray(list) || !list.length) return '';
  return `<div class="badges">${list.map(tag=>`<span class="badge">${escapeHtml(tag)}</span>`).join('')}</div>`;
}
