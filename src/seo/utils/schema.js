import { SITE } from '../config.js';
import { formatDateTime } from './date.js';

export function orgSchema(){
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.origin,
    logo: `${SITE.origin}${SITE.ogFallback}`,
    sameAs: []
  };
}

export function websiteSchema(){
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.origin
  };
}

export function breadcrumbSchema(items){
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx)=>({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function listingSchema({ item, url, isFood }){
  const openingHours = buildOpeningHours(item.hours);
  const schema = {
    '@context': 'https://schema.org',
    '@type': isFood ? 'Restaurant' : 'Place',
    additionalType: isFood ? undefined : 'https://schema.org/BuddhistTemple',
    name: item.name,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: item.address || '',
      addressLocality: item.city || '',
      addressRegion: item.region || '',
      addressCountry: 'TH'
    },
    geo: item.coords ? {
      '@type': 'GeoCoordinates',
      latitude: item.coords.lat,
      longitude: item.coords.lng
    } : undefined,
    openingHoursSpecification: openingHours || undefined,
    aggregateRating: item.rating ? {
      '@type': 'AggregateRating',
      ratingValue: item.rating,
      ratingCount: item.ratingCount || 1
    } : undefined,
    keywords: item.tags && item.tags.length ? item.tags.join(',') : undefined,
    image: item.image || `${SITE.origin}${SITE.ogFallback}`
  };
  clean(schema);
  return schema;
}

export function itemListSchema(items){
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, idx)=>({
      '@type': 'ListItem',
      position: idx + 1,
      url: item.url,
      name: item.name
    }))
  };
}

export function guideSchema({ title, description, url, about, items, date }){
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    dateModified: formatDateTime(date),
    datePublished: formatDateTime(date),
    author: {
      '@type': 'Person',
      name: 'Kaiwei'
    },
    about,
    mentions: items && items.length ? items.map(it=>({
      '@type': 'Thing',
      name: it.name,
      url: it.url
    })) : undefined
  };
  clean(schema);
  return schema;
}

function clean(obj){
  Object.keys(obj).forEach((key)=>{
    if (obj[key] === undefined || obj[key] === null || obj[key] === '') delete obj[key];
  });
}

function buildOpeningHours(hours){
  const raw = String(hours || '').trim();
  const m = raw.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!m) return null;
  return [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    opens: m[1],
    closes: m[2]
  }];
}
