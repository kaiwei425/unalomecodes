import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { SITE, LANGS, OUTPUT_DIR, PAGE_SIZE, SITEMAP_LIMIT, QUALITY_THRESHOLDS, GUIDE_TYPES, DEFAULT_CITY, CACHE_DIR } from '../../src/seo/config.js';
import { loadSnapshots } from '../../src/seo/data/index.js';
import { renderLayout } from '../../src/seo/templates/layout.js';
import { renderListing } from '../../src/seo/templates/listing.js';
import { renderAggregation } from '../../src/seo/templates/aggregation.js';
import { renderGuide } from '../../src/seo/templates/guide.js';
import { renderAbout } from '../../src/seo/templates/about.js';
import { renderIndex } from '../../src/seo/templates/index.js';
import { renderSeoReport } from '../../src/seo/templates/report.js';
import { buildAlternates } from '../../src/seo/utils/meta.js';
import { escapeHtml, joinText, shortText } from '../../src/seo/utils/text.js';
import { slugify, uniqueSlug } from '../../src/seo/utils/slug.js';
import { haversineKm } from '../../src/seo/utils/geo.js';
import { formatDate } from '../../src/seo/utils/date.js';
import { breadcrumbSchema, listingSchema, itemListSchema, guideSchema } from '../../src/seo/utils/schema.js';
import { scorePage } from './quality-score.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outputRoot = path.join(repoRoot, OUTPUT_DIR);
const cacheFile = path.join(repoRoot, CACHE_DIR, 'manifest.json');

const TOOL_LINKS = [
  { url: '/templemap', zh: '寺廟地圖互動工具', en: 'Temple map tool' },
  { url: '/food-map', zh: '美食地圖互動工具', en: 'Food map tool' },
  { url: '/fortune/', zh: '祈願工具', en: 'Fortune tool' }
];
const MAX_SITEMAP_PAGES = 5;

function hashContent(text){
  return crypto.createHash('sha1').update(text).digest('hex');
}

async function readManifest(){
  try{
    const raw = await fs.readFile(cacheFile, 'utf8');
    return JSON.parse(raw);
  }catch(_){
    return { files: {} };
  }
}

async function writeManifest(manifest){
  await fs.mkdir(path.dirname(cacheFile), { recursive: true });
  await fs.writeFile(cacheFile, JSON.stringify(manifest, null, 2));
}

async function ensureDir(dir){
  await fs.mkdir(dir, { recursive: true });
}

async function writeFileIfChanged(filePath, content, manifest){
  const hash = hashContent(content);
  const key = path.relative(outputRoot, filePath);
  if (manifest.files[key] === hash){
    return false;
  }
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
  manifest.files[key] = hash;
  return true;
}

async function copyStatic(){
  const exclude = new Set(['.git', 'node_modules', OUTPUT_DIR, 'src', 'scripts', '.cache', '.DS_Store']);
  const entries = await fs.readdir(repoRoot, { withFileTypes: true });
  for (const entry of entries){
    if (exclude.has(entry.name)) continue;
    const src = path.join(repoRoot, entry.name);
    const dest = path.join(outputRoot, entry.name);
    await fs.cp(src, dest, { recursive: true });
  }
}

async function copySeoAssets(){
  const srcCss = path.join(repoRoot, 'src/seo/assets/seo-pages.css');
  const destCss = path.join(outputRoot, 'assets/seo-pages.css');
  try{
    await ensureDir(path.dirname(destCss));
    await fs.copyFile(srcCss, destCss);
  }catch(_){}
}

function pickCityMeta(cityKey){
  if (!cityKey) return DEFAULT_CITY;
  if (cityKey === DEFAULT_CITY.key) return DEFAULT_CITY;
  return { key: cityKey, zh: cityKey, en: cityKey };
}

function buildListingSummary(item, lang){
  const pieces = [];
  if (lang === 'zh'){
    pieces.push(`${item.name} 位於${item.region || item.city || '當地'}，適合${item.category || '探索'}旅程。`);
    if (item.address) pieces.push(`地址為${item.address}，可搭配附近路線規劃。`);
    if (item.tags && item.tags.length) pieces.push(`特色標籤：${item.tags.slice(0,3).join('、')}。`);
    if (item.hours) pieces.push(`營業時間概況：${item.hours}。`);
  } else {
    pieces.push(`${item.name} sits in ${item.region || item.city || 'the area'} and suits ${item.category || 'local exploration'}.`);
    if (item.address) pieces.push(`Address: ${item.address}.`);
    if (item.tags && item.tags.length) pieces.push(`Highlights: ${item.tags.slice(0,3).join(', ')}.`);
    if (item.hours) pieces.push(`Hours overview: ${item.hours}.`);
  }
  return joinText(pieces).trim();
}

function buildAggregationIntro(lang, stats){
  if (lang === 'zh'){
    return `${stats.cityName} 共彙整 ${stats.total} 個點位，平均評分 ${stats.avgRating || '—'}。熱門標籤包含 ${stats.topTags || '—'}，最常出現區域為 ${stats.topRegion || '—'}。`;
  }
  return `${stats.cityName} lists ${stats.total} places with an average rating of ${stats.avgRating || '—'}. Top tags include ${stats.topTags || '—'} and the most common region is ${stats.topRegion || '—'}.`;
}

function buildGuideIntro(lang, cityName){
  if (lang === 'zh'){
    return `${cityName} 的寺廟與美食密度高，本指南根據站內資料彙整第一次到訪、雨天與避雷情境的可用方案。`;
  }
  return `${cityName} is packed with temples and local food. This guide distills first-time, rainy-day, and safety scenarios from on-site data.`;
}

function buildScenario(lang, guideKey, cityName){
  const zh = {
    'first-time': `第一次到${cityName}，建議從交通方便的核心區域開始，避開過度擁擠的時段。`,
    'rainy-day': `雨天可優先選擇交通連結良好且室內空間較多的點位，搭配短距離移動。`,
    'scams': `熱門區域可能有推銷或臨時加價情況，請確認價目與交通方式後再行動。`,
    'temple-etiquette': `${cityName} 的寺廟多有服裝與參拜規範，建議攜帶薄外套或圍巾以便遵守禮儀。`
  };
  const en = {
    'first-time': `For a first visit in ${cityName}, start with transit-friendly districts and avoid peak crowds.`,
    'rainy-day': `On rainy days, prioritize places with indoor areas and short-distance travel.`,
    'scams': `Tourist zones may include upsells or price changes. Confirm fares and costs before committing.`,
    'temple-etiquette': `Temples in ${cityName} often require modest dress and calm behavior; carry a light cover-up.`
  };
  return {
    title: lang === 'zh' ? '場景化建議' : 'Scenario advice',
    body: lang === 'zh' ? zh[guideKey] : en[guideKey]
  };
}

function buildFaq(lang, stats){
  const qas = [];
  if (lang === 'zh'){
    qas.push({ q: '這個分類目前有多少筆資料？', a: `目前收錄 ${stats.total} 筆，仍持續擴充。` });
    qas.push({ q: '平均評分是多少？', a: `平均評分約 ${stats.avgRating || '—'}。` });
    qas.push({ q: '最多人去的區域？', a: stats.topRegion ? `最多集中在 ${stats.topRegion}。` : '資料仍在整理。' });
    qas.push({ q: '熱門標籤有哪些？', a: stats.topTags ? `常見標籤為 ${stats.topTags}。` : '尚未有足夠標籤。' });
    qas.push({ q: '沒有看到我要的類別？', a: '可改用同城其他分類或使用地圖工具搜尋。' });
  } else {
    qas.push({ q: 'How many entries are listed?', a: `${stats.total} entries are listed and still growing.` });
    qas.push({ q: 'Average rating?', a: `Average rating is ${stats.avgRating || '—'}.` });
    qas.push({ q: 'Most common region?', a: stats.topRegion ? `${stats.topRegion} appears most often.` : 'Still organizing regions.' });
    qas.push({ q: 'Popular tags?', a: stats.topTags ? `Common tags include ${stats.topTags}.` : 'Not enough tag data yet.' });
    qas.push({ q: 'Missing a category?', a: 'Try other categories in the same city or use the map tools.' });
  }
  return qas;
}

function topByDistance(origin, items, limit){
  if (!origin || !origin.coords) return [];
  return items
    .filter(it=>it.coords)
    .map(it=>({ item: it, dist: haversineKm(origin.coords, it.coords) }))
    .filter(it=>Number.isFinite(it.dist))
    .sort((a,b)=>a.dist - b.dist)
    .slice(0, limit)
    .map(entry=>({ ...entry.item, distance: entry.dist }));
}

function statSummary(items){
  const total = items.length;
  const ratings = items.map(it=>Number(it.rating)).filter(n=>Number.isFinite(n));
  const avgRating = ratings.length ? (ratings.reduce((a,b)=>a+b,0) / ratings.length).toFixed(1) : '';
  const regionCounts = new Map();
  const tagCounts = new Map();
  items.forEach(it=>{
    if (it.region) regionCounts.set(it.region, (regionCounts.get(it.region) || 0) + 1);
    (it.tags || []).forEach(tag=>tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
  });
  const topRegion = [...regionCounts.entries()].sort((a,b)=>b[1]-a[1])[0];
  const topTags = [...tagCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(entry=>entry[0]).join('、');
  return { total, avgRating, topRegion: topRegion ? topRegion[0] : '', topTags };
}

function buildItemLink(lang, item){
  const prefix = lang === 'en' ? '/en' : '/zh';
  const base = item.kind === 'temple' ? 'temple' : 'food';
  return {
    url: `${prefix}/${base}/spot/${item.slug}/`,
    name: item.name,
    meta: item.region || item.category || ''
  };
}

function buildBreadcrumb(lang, segments){
  const prefix = lang === 'en' ? '/en' : '/zh';
  const crumbs = [{ name: lang === 'en' ? 'Home' : '首頁', url: `${prefix}/` }];
  segments.forEach(seg=>crumbs.push(seg));
  return crumbs;
}

function buildPageMeta({ lang, title, description, path }){
  return {
    lang,
    title,
    description,
    canonical: `${SITE.origin}${path}`,
    alternates: buildAlternates(path),
    ogImage: SITE.ogDefault
  };
}

async function generate(){
  await ensureDir(outputRoot);
  await copyStatic();
  await copySeoAssets();

  let spotImages = new Set();
  try{
    const files = await fs.readdir(path.join(repoRoot, 'public/assets/spots'));
    files.forEach(file=>spotImages.add(file));
  }catch(_){}

  const { foods, temples } = await loadSnapshots();
  const allItems = [...foods, ...temples];
  const validItems = allItems.filter(it=>it.name && it.address && it.coords);

  const slugSet = new Set();
  const slugIndex = new Map();
  const slugConflicts = [];
  validItems.forEach(item=>{
    const baseSlug = slugify(item.slug || item.name || item.id, item.id);
    if (!slugIndex.has(baseSlug)){
      slugIndex.set(baseSlug, baseSlug);
      slugSet.add(baseSlug);
      item.slug = baseSlug;
      item.canonicalSlug = baseSlug;
    } else {
      const canonicalSlug = slugIndex.get(baseSlug);
      const unique = uniqueSlug(baseSlug, slugSet);
      item.slug = unique;
      item.canonicalSlug = canonicalSlug;
    }
  });
  const conflictCounts = {};
  validItems.forEach(item=>{
    if (item.slug !== item.canonicalSlug){
      conflictCounts[item.canonicalSlug] = (conflictCounts[item.canonicalSlug] || 0) + 1;
    }
  });
  Object.keys(conflictCounts).forEach(slug=>{
    slugConflicts.push({ slug, count: conflictCounts[slug] + 1 });
  });

  const cityGroups = new Map();
  validItems.forEach(item=>{
    const cityKey = item.city || DEFAULT_CITY.key;
    if (!cityGroups.has(cityKey)) cityGroups.set(cityKey, []);
    cityGroups.get(cityKey).push(item);
  });
  if (!cityGroups.size){
    cityGroups.set(DEFAULT_CITY.key, []);
  }

  const pages = [];
  const reportMissing = {
    address: 0,
    coords: 0,
    description: 0,
    schema: 0,
    canonical: 0
  };

  const manifest = await readManifest();
  const siblingSets = { listing: [], aggregation: [], guide: [] };

  function registerPage(page){
    if (page.sitemap === undefined) page.sitemap = true;
    pages.push(page);
    if (page.grams) siblingSets[page.type].push(page.grams);
  }

  for (const item of validItems){
    const langKeys = Object.keys(LANGS);
    for (const lang of langKeys){
      const prefix = lang === 'en' ? '/en' : '/zh';
      const base = item.kind === 'temple' ? 'temple' : 'food';
      const pathUrl = `${prefix}/${base}/spot/${item.slug}/`;
      const cityMeta = pickCityMeta(item.city);
      const title = lang === 'zh' ? `${item.name}｜${cityMeta.zh}` : `${item.name} | ${cityMeta.en}`;
      const summary = buildListingSummary(item, lang);
      const sections = [];
      if (item.kind === 'temple'){
        sections.push({
          title: lang === 'zh' ? '參拜建議' : 'Visit guidance',
          body: item.detail || (lang === 'zh' ? '建議穿著得體，尊重寺廟公告與工作人員指示。' : 'Dress modestly and follow temple notices or staff guidance.')
        });
        sections.push({
          title: lang === 'zh' ? '禁忌提醒' : 'Cautions',
          body: lang === 'zh' ? '避免喧嘩、請勿攀爬佛像，拍照前留意標示。' : 'Avoid loud behavior, do not climb statues, and check photo signs first.'
        });
        sections.push({
          title: lang === 'zh' ? '適合祈求' : 'Suitable for',
          body: item.tags && item.tags.length ? (lang === 'zh' ? `可參考標籤：${item.tags.slice(0,3).join('、')}` : `Suggested intents: ${item.tags.slice(0,3).join(', ')}`) : (lang === 'zh' ? '依個人需求與當地習俗調整。' : 'Adjust based on your needs and local customs.')
        });
      } else {
        sections.push({
          title: lang === 'zh' ? '用餐情境' : 'Dining context',
          body: item.detail || (lang === 'zh' ? '適合安排在行程中段或臨近景點時補給。' : 'Works well as a mid-route stop or near nearby attractions.')
        });
        sections.push({
          title: lang === 'zh' ? '注意事項' : 'Notes',
          body: lang === 'zh' ? '實際營業狀態以店家公告為準。' : 'Operating hours may change; check official notices.'
        });
      }

      const nearby = topByDistance(item, validItems.filter(it=>it.id !== item.id), 6).map(it=>buildItemLink(lang, it));
      const sameCategory = validItems.filter(it=>it.kind === item.kind && it.category && it.category === item.category && it.id !== item.id).slice(0,6).map(it=>buildItemLink(lang, it));
      const sameRegion = validItems.filter(it=>it.kind === item.kind && it.region && it.region === item.region && it.id !== item.id).slice(0,6).map(it=>buildItemLink(lang, it));
      const cross = validItems.filter(it=>it.kind !== item.kind && it.id !== item.id && it.coords && item.coords).map(it=>({ item: it, dist: haversineKm(item.coords, it.coords) })).filter(it=>Number.isFinite(it.dist)).sort((a,b)=>a.dist - b.dist).slice(0,6).map(entry=>buildItemLink(lang, entry.item));

      const breadcrumb = buildBreadcrumb(lang, [
        { name: lang === 'zh' ? (item.kind === 'temple' ? '寺廟' : '美食') : (item.kind === 'temple' ? 'Temples' : 'Food'), url: `${prefix}/${base}/${item.city || DEFAULT_CITY.key}/` },
        { name: item.name, url: pathUrl }
      ]);

      const localImage = spotImages.has(`${item.slug}.jpg`) ? `/assets/spots/${item.slug}.jpg` : '';
      const imageUrl = item.image || localImage || SITE.ogDefault;
      const jsonLd = [
        listingSchema({ item: { ...item, city: cityMeta.en, region: item.region, image: imageUrl }, url: `${SITE.origin}${pathUrl}`, isFood: item.kind !== 'temple' }),
        breadcrumbSchema(breadcrumb.map(b=>({ name: b.name, url: `${SITE.origin}${b.url}` })))
      ];

      const canonicalPath = item.slug !== item.canonicalSlug ? `${prefix}/${base}/spot/${item.canonicalSlug}/` : pathUrl;
      const meta = buildPageMeta({ lang, title, description: shortText(summary, 180), path: canonicalPath });
      const text = joinText([title, summary, sections.map(s=>s.body).join(' ')]);
      const fields = {
        address: item.address,
        region: item.region,
        category: item.category,
        tags: item.tags && item.tags.length,
        hours: item.hours,
        phone: item.phone
      };
      const quality = scorePage({ type: 'listing', text, fields, siblingSets: siblingSets.listing });

      const noindex = quality.score < QUALITY_THRESHOLDS.listing || item.slug !== item.canonicalSlug;
      if (noindex) reportMissing.canonical += item.slug !== item.canonicalSlug ? 1 : 0;

      const body = renderListing({
        lang,
        title,
        summary,
        item: {
          ...item,
          region: item.region || cityMeta[lang],
          price: item.price || (lang === 'zh' ? '現場查詢' : 'Check on site')
        },
        breadcrumbs: breadcrumb,
        sections,
        updatedAt: formatDate(item.updatedAt || new Date()),
        sourceLabel: 'internal',
        links: [
          { title: lang === 'zh' ? '附近推薦' : 'Nearby', items: nearby },
          { title: lang === 'zh' ? '同類別' : 'Same category', items: sameCategory },
          { title: lang === 'zh' ? '同區域' : 'Same region', items: sameRegion },
          { title: lang === 'zh' ? '相關跨類' : 'Related cross-links', items: cross }
        ]
      });

      const ogImage = imageUrl || SITE.ogDefault;
      const html = renderLayout({
        ...meta,
        noindex,
        body,
        jsonLd,
        ogImage
      });

      registerPage({ type: 'listing', path: pathUrl, html, lang, score: quality.score, reason: quality.reason, grams: quality.grams, noindex, text, sitemap: !noindex, sitemapGroup: `${item.kind}-${lang}` });
    }
  }

  function buildAggregationPages(kind){
    const items = validItems.filter(it=>it.kind === kind);
    const cityMap = new Map();
    items.forEach(item=>{
      const cityKey = item.city || DEFAULT_CITY.key;
      if (!cityMap.has(cityKey)) cityMap.set(cityKey, []);
      cityMap.get(cityKey).push(item);
    });
    if (!cityMap.size){
      cityMap.set(DEFAULT_CITY.key, []);
    }

    function createAggPages({ lang, basePath, title, intro, stats, groupItems, faq, related, breadcrumb, jsonLdBuilder, notice, sitemapGroup }){
      const totalPages = Math.max(1, Math.ceil(groupItems.length / PAGE_SIZE));
      for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1){
        const slice = groupItems.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE);
        const pagePath = pageIndex === 1 ? basePath : `${basePath}page/${pageIndex}/`;
        const pageTitle = pageIndex === 1 ? title : (lang === 'zh' ? `${title} 第${pageIndex}頁` : `${title} Page ${pageIndex}`);
        const list = slice.map(it=>buildItemLink(lang, it));
        const relPrev = pageIndex > 1 ? `${SITE.origin}${pageIndex === 2 ? basePath : `${basePath}page/${pageIndex - 1}/`}` : '';
        const relNext = pageIndex < totalPages ? `${SITE.origin}${basePath}page/${pageIndex + 1}/` : '';
        const extraHead = [
          relPrev ? `<link rel="prev" href="${relPrev}">` : '',
          relNext ? `<link rel="next" href="${relNext}">` : ''
        ].filter(Boolean).join('\n');

        const body = renderAggregation({
          lang,
          title: pageTitle,
          intro,
          stats: [
            { label: lang === 'zh' ? '點位數量' : 'Total places', value: String(stats.total) },
            { label: lang === 'zh' ? '平均評分' : 'Avg rating', value: stats.avgRating || '—' },
            { label: lang === 'zh' ? '熱門標籤' : 'Top tags', value: stats.topTags || '—' },
            { label: lang === 'zh' ? '常見區域' : 'Top region', value: stats.topRegion || '—' }
          ],
          list,
          faq,
          related,
          breadcrumbs: breadcrumb,
          notice: notice || (stats.total < 10 ? (lang === 'zh' ? '資料仍在擴充，若少於 10 筆仍可先參考。' : 'Dataset is still growing; fewer than 10 entries for now.') : '')
        });
        const meta = buildPageMeta({ lang, title: pageTitle, description: shortText(intro, 180), path: pagePath });
        const text = joinText([pageTitle, intro, list.map(it=>it.name).join(' ')]);
        const quality = scorePage({ type: 'aggregation', text, fields: { total: stats.total, tags: stats.topTags, region: stats.topRegion }, siblingSets: siblingSets.aggregation });
        const noindex = quality.score < QUALITY_THRESHOLDS.aggregation;
        const jsonLd = typeof jsonLdBuilder === 'function' ? jsonLdBuilder(list, breadcrumb) : [];
        const html = renderLayout({ ...meta, noindex, body, jsonLd, extraHead });
        registerPage({ type: 'aggregation', path: pagePath, html, lang, score: quality.score, reason: quality.reason, grams: quality.grams, noindex, text, sitemap: !noindex && pageIndex <= MAX_SITEMAP_PAGES, sitemapGroup });
      }
    }

    for (const [cityKey, cityItems] of cityMap.entries()){
      const cityMeta = pickCityMeta(cityKey);
      const categories = new Map();
      cityItems.forEach(item=>{
        const cat = (kind === 'temple') ? (item.tags && item.tags[0]) : item.category;
        if (!cat) return;
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat).push(item);
      });

      const regions = new Map();
      cityItems.forEach(item=>{
        if (!item.region) return;
        if (!regions.has(item.region)) regions.set(item.region, []);
        regions.get(item.region).push(item);
      });

      const langKeys = Object.keys(LANGS);
      for (const lang of langKeys){
        const prefix = lang === 'en' ? '/en' : '/zh';
        const base = kind === 'temple' ? 'temple' : 'food';
        const cityPath = `${prefix}/${base}/${cityKey}/`;
        const stat = statSummary(cityItems);
        const title = lang === 'zh' ? `2026 ${cityMeta.zh} ${kind === 'temple' ? '寺廟' : '美食'}推薦` : `2026 ${cityMeta.en} ${kind === 'temple' ? 'Temples' : 'Food'} Picks`;
        const intro = buildAggregationIntro(lang, { ...stat, cityName: lang === 'zh' ? cityMeta.zh : cityMeta.en });
        const topList = cityItems.slice().sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)).slice(0,10).map(it=>buildItemLink(lang, it));
        const faq = buildFaq(lang, { ...stat, cityName: lang === 'zh' ? cityMeta.zh : cityMeta.en });
        const related = {
          title: lang === 'zh' ? '同城其他分類' : 'Other categories in city',
          tags: [...categories.keys()].slice(0,6),
          items: [...categories.keys()].slice(0,6).map(cat=>({
            url: `${prefix}/${base}/${cityKey}/${slugify(cat)}/`,
            name: cat,
            meta: cityMeta[lang]
          }))
        };
        const breadcrumb = buildBreadcrumb(lang, [
          { name: lang === 'zh' ? (kind === 'temple' ? '寺廟' : '美食') : (kind === 'temple' ? 'Temples' : 'Food'), url: `${prefix}/${base}/${cityKey}/` }
        ]);
        createAggPages({
          lang,
          basePath: cityPath,
          title,
          intro,
          stats: stat,
          groupItems: cityItems,
          faq,
          related,
          breadcrumb,
          jsonLdBuilder: (list, crumbs)=>[
            itemListSchema(list.map(item=>({ name: item.name, url: `${SITE.origin}${item.url}` }))),
            breadcrumbSchema(crumbs.map(b=>({ name: b.name, url: `${SITE.origin}${b.url}` })))
          ],
          sitemapGroup: `${base}-${lang}`
        });

        for (const [cat, catItems] of categories.entries()){
          const catSlug = slugify(cat);
          const catPath = `${prefix}/${base}/${cityKey}/${catSlug}/`;
          const catStat = statSummary(catItems);
          const catTitle = lang === 'zh' ? `2026 ${cityMeta.zh} ${cat} 推薦` : `2026 ${cityMeta.en} ${cat} picks`;
          const catIntro = buildAggregationIntro(lang, { ...catStat, cityName: lang === 'zh' ? cityMeta.zh : cityMeta.en });
          const catList = catItems.slice().sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)).slice(0,10).map(it=>buildItemLink(lang, it));
          const catFaq = buildFaq(lang, { ...catStat, cityName: lang === 'zh' ? cityMeta.zh : cityMeta.en });
          const catRelated = {
            title: lang === 'zh' ? '同類別其他區域' : 'Other regions for this category',
            tags: [...regions.keys()].slice(0,6),
            items: [...regions.keys()].slice(0,6).map(region=>({
              url: `${prefix}/${base}/${cityKey}/${catSlug}/${slugify(region)}/`,
              name: region,
              meta: cat
            }))
          };
          const catBreadcrumb = buildBreadcrumb(lang, [
            { name: lang === 'zh' ? (kind === 'temple' ? '寺廟' : '美食') : (kind === 'temple' ? 'Temples' : 'Food'), url: `${prefix}/${base}/${cityKey}/` },
            { name: cat, url: catPath }
          ]);
          createAggPages({
            lang,
            basePath: catPath,
            title: catTitle,
            intro: catIntro,
            stats: catStat,
            groupItems: catItems,
            faq: catFaq,
            related: catRelated,
            breadcrumb: catBreadcrumb,
            jsonLdBuilder: (list, crumbs)=>[
              itemListSchema(list.map(it=>({ name: it.name, url: `${SITE.origin}${it.url}` }))),
              breadcrumbSchema(crumbs.map(b=>({ name: b.name, url: `${SITE.origin}${b.url}` })))
            ],
            sitemapGroup: `${base}-${lang}`
          });

          for (const [region, regionItems] of regions.entries()){
            const regionItemsFiltered = regionItems.filter(it=>catItems.includes(it));
            if (!regionItemsFiltered.length) continue;
            const regionSlug = slugify(region);
            const regionPath = `${prefix}/${base}/${cityKey}/${catSlug}/${regionSlug}/`;
            const regionStat = statSummary(regionItemsFiltered);
            const regionTitle = lang === 'zh' ? `2026 ${cityMeta.zh} ${cat} ${region} 推薦` : `2026 ${cityMeta.en} ${cat} ${region} picks`;
            const regionIntro = buildAggregationIntro(lang, { ...regionStat, cityName: lang === 'zh' ? cityMeta.zh : cityMeta.en });
            const regionList = regionItemsFiltered.slice().sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)).slice(0,10).map(it=>buildItemLink(lang, it));
            const regionFaq = buildFaq(lang, { ...regionStat, cityName: lang === 'zh' ? cityMeta.zh : cityMeta.en });
            const regionRelated = {
              title: lang === 'zh' ? '同分類其他區域' : 'Other regions',
              tags: [...regions.keys()].slice(0,6),
              items: [...regions.keys()].slice(0,6).map(regionName=>({
                url: `${prefix}/${base}/${cityKey}/${catSlug}/${slugify(regionName)}/`,
                name: regionName,
                meta: cat
              }))
            };
            const regionBreadcrumb = buildBreadcrumb(lang, [
              { name: lang === 'zh' ? (kind === 'temple' ? '寺廟' : '美食') : (kind === 'temple' ? 'Temples' : 'Food'), url: `${prefix}/${base}/${cityKey}/` },
              { name: cat, url: catPath },
              { name: region, url: regionPath }
            ]);
            createAggPages({
              lang,
              basePath: regionPath,
              title: regionTitle,
              intro: regionIntro,
              stats: regionStat,
              groupItems: regionItemsFiltered,
              faq: regionFaq,
              related: regionRelated,
              breadcrumb: regionBreadcrumb,
              jsonLdBuilder: (list, crumbs)=>[
                itemListSchema(list.map(it=>({ name: it.name, url: `${SITE.origin}${it.url}` }))),
                breadcrumbSchema(crumbs.map(b=>({ name: b.name, url: `${SITE.origin}${b.url}` })))
              ],
              sitemapGroup: `${base}-${lang}`
            });
          }
        }
      }
    }
  }

  buildAggregationPages('food');
  buildAggregationPages('temple');

  for (const [cityKey, cityItems] of cityGroups.entries()){
    const cityMeta = pickCityMeta(cityKey);
    const foodsInCity = cityItems.filter(it=>it.kind === 'food');
    const templesInCity = cityItems.filter(it=>it.kind === 'temple');
    for (const lang of Object.keys(LANGS)){
      const prefix = lang === 'en' ? '/en' : '/zh';
      const cityName = lang === 'zh' ? cityMeta.zh : cityMeta.en;
      for (const guide of GUIDE_TYPES){
        const pathUrl = `${prefix}/guides/${cityKey}/${guide.key}/`;
        const title = lang === 'zh' ? `${cityName} ${guide.zh} 指南` : `${cityName} ${guide.en} guide`;
        const intro = buildGuideIntro(lang, cityName);
        const scenario = buildScenario(lang, guide.key, cityName);
        const picks = [...foodsInCity, ...templesInCity].slice(0,10).map(it=>buildItemLink(lang, it));
        const stats = statSummary(cityItems);
        const ctaLink = TOOL_LINKS[guide.key === 'temple-etiquette' ? 0 : 1] || TOOL_LINKS[0];
        const body = renderGuide({
          title,
          intro,
          scenario,
          list: { title: lang === 'zh' ? '推薦清單' : 'Recommended list', items: picks },
          cta: {
            title: lang === 'zh' ? '你也可以用的工具' : 'Useful tools',
            body: lang === 'zh' ? '搭配互動工具快速定位路線與附近點位。' : 'Use the interactive tools to locate routes and nearby places.',
            url: ctaLink.url,
            label: lang === 'zh' ? ctaLink.zh : ctaLink.en
          },
          stats: [
            { label: lang === 'zh' ? '點位總數' : 'Total places', value: String(stats.total) },
            { label: lang === 'zh' ? '熱門標籤' : 'Top tags', value: stats.topTags || '—' },
            { label: lang === 'zh' ? '常見區域' : 'Top region', value: stats.topRegion || '—' }
          ],
          breadcrumbs: buildBreadcrumb(lang, [
            { name: lang === 'zh' ? '指南' : 'Guides', url: `${prefix}/guides/${cityKey}/` },
            { name: title, url: pathUrl }
          ]),
          related: {
            title: lang === 'zh' ? '同城聚合頁' : 'City aggregation pages',
            items: [
              { url: `${prefix}/food/${cityKey}/`, name: lang === 'zh' ? `${cityName} 美食` : `${cityName} food`, meta: '' },
              { url: `${prefix}/temple/${cityKey}/`, name: lang === 'zh' ? `${cityName} 寺廟` : `${cityName} temples`, meta: '' }
            ]
          }
        });
        const breadcrumb = buildBreadcrumb(lang, [
          { name: lang === 'zh' ? '指南' : 'Guides', url: `${prefix}/guides/${cityKey}/` },
          { name: title, url: pathUrl }
        ]);
        const jsonLd = [
          guideSchema({ title, description: shortText(intro, 180), url: `${SITE.origin}${pathUrl}`, about: title, items: picks.map(p=>({ name: p.name, url: `${SITE.origin}${p.url}` })), date: new Date() }),
          itemListSchema(picks.map(p=>({ name: p.name, url: `${SITE.origin}${p.url}` }))),
          breadcrumbSchema(breadcrumb.map(b=>({ name: b.name, url: `${SITE.origin}${b.url}` })))
        ];
        const meta = buildPageMeta({ lang, title, description: shortText(intro, 180), path: pathUrl });
        const text = joinText([title, intro, scenario.body, picks.map(p=>p.name).join(' ')]);
        const quality = scorePage({ type: 'guide', text, fields: { total: stats.total, tags: stats.topTags }, siblingSets: siblingSets.guide });
        const noindex = quality.score < QUALITY_THRESHOLDS.guide;
        const html = renderLayout({ ...meta, noindex, body, jsonLd });
        registerPage({ type: 'guide', path: pathUrl, html, lang, score: quality.score, reason: quality.reason, grams: quality.grams, noindex, text, sitemapGroup: `guides-${lang}` });
      }
    }
  }

  for (const lang of Object.keys(LANGS)){
    const prefix = lang === 'en' ? '/en' : '/zh';
    const indexPath = `${prefix}/`;
    const title = lang === 'zh' ? '泰國點位 SEO 索引入口' : 'Thailand SEO index';
    const intro = lang === 'zh' ? '從這裡進入各城市與分類的靜態索引，包含美食與寺廟聚合頁。' : 'Enter the static indexes for cities and categories, covering food and temples.';
    const sections = [
      {
        title: lang === 'zh' ? '美食索引' : 'Food indexes',
        body: lang === 'zh' ? '以城市與分類建立的聚合頁。' : 'Aggregation pages by city and category.',
        items: [...cityGroups.keys()].map(cityKey=>({
          url: `${prefix}/food/${cityKey}/`,
          name: lang === 'zh' ? `${pickCityMeta(cityKey).zh} 美食` : `${pickCityMeta(cityKey).en} food`,
          meta: ''
        }))
      },
      {
        title: lang === 'zh' ? '寺廟索引' : 'Temple indexes',
        body: lang === 'zh' ? '以城市與標籤建立的聚合頁。' : 'Aggregation pages by city and tag.',
        items: [...cityGroups.keys()].map(cityKey=>({
          url: `${prefix}/temple/${cityKey}/`,
          name: lang === 'zh' ? `${pickCityMeta(cityKey).zh} 寺廟` : `${pickCityMeta(cityKey).en} temples`,
          meta: ''
        }))
      },
      {
        title: lang === 'zh' ? '城市指南' : 'City guides',
        body: lang === 'zh' ? '首次到訪、雨天與防詐提醒。' : 'First-time, rainy day, and scam awareness guides.',
        items: [...cityGroups.keys()].map(cityKey=>({
          url: `${prefix}/guides/${cityKey}/first-time/`,
          name: lang === 'zh' ? `${pickCityMeta(cityKey).zh} 指南` : `${pickCityMeta(cityKey).en} guide`,
          meta: ''
        }))
      }
    ];
    const body = renderIndex({ title, intro, sections });
    const meta = buildPageMeta({ lang, title, description: shortText(intro, 160), path: indexPath });
    const html = renderLayout({ ...meta, noindex: false, body, jsonLd: [] });
    registerPage({ type: 'index', path: indexPath, html, lang, score: QUALITY_THRESHOLDS.index, reason: 'ok', grams: null, noindex: false, text: joinText([title, intro]), sitemapGroup: 'misc' });
  }

  for (const lang of Object.keys(LANGS)){
    const prefix = lang === 'en' ? '/en' : '/zh';
    const pathUrl = `${prefix}/about/kaiwei/`;
    const title = lang === 'zh' ? '作者介紹｜Kaiwei' : 'About the author | Kaiwei';
    const sections = [
      { title: lang === 'zh' ? 'Experience' : 'Experience', body: lang === 'zh' ? '長期居住曼谷，實地走訪寺廟與在地美食，收集一手資料。' : 'Lives in Bangkok and visits temples and local food spots in person.' },
      { title: lang === 'zh' ? 'Expertise' : 'Expertise', body: lang === 'zh' ? '專注地圖化資料整理、旅程結構化與文化背景研究。' : 'Focuses on mapped data curation, itinerary structure, and cultural research.' },
      { title: lang === 'zh' ? 'Trust' : 'Trust', body: lang === 'zh' ? '提供聯絡與更正機制，資料更新紀錄公開。' : 'Provides a correction channel and transparent update policy.' }
    ];
    const links = [
      { url: `${prefix}/about/kaiwei/`, name: lang === 'zh' ? '關於作者' : 'About the author', meta: '' },
      { url: `${prefix}/guides/${DEFAULT_CITY.key}/first-time/`, name: lang === 'zh' ? '內容政策' : 'Content policy', meta: '' },
      { url: `${prefix}/guides/${DEFAULT_CITY.key}/scams/`, name: lang === 'zh' ? '資料更新政策' : 'Update policy', meta: '' }
    ];
    const body = renderAbout({ title, sections, breadcrumbs: buildBreadcrumb(lang, [
      { name: lang === 'zh' ? '關於' : 'About', url: pathUrl }
    ]), links });
    const meta = buildPageMeta({ lang, title, description: shortText(sections.map(s=>s.body).join(' '), 160), path: pathUrl });
    const html = renderLayout({ ...meta, noindex: false, body, jsonLd: [] });
    registerPage({ type: 'about', path: pathUrl, html, lang, score: QUALITY_THRESHOLDS.about, reason: 'ok', grams: null, noindex: false, text: joinText([title, sections.map(s=>s.body).join(' ')]), sitemapGroup: 'misc' });
  }

  const aboutRedirect = `<!doctype html><html><head><meta http-equiv="refresh" content="0; url=/zh/about/kaiwei/"></head><body>Redirecting...</body></html>`;
  await writeFileIfChanged(path.join(outputRoot, 'about/kaiwei/index.html'), aboutRedirect, manifest);

  const sitemapBuckets = new Map();
  const noindexPages = [];
  const indexablePages = [];
  const sitemapNames = {
    'food-zh': 'sitemap-food-zh',
    'food-en': 'sitemap-food-en',
    'temple-zh': 'sitemap-temple-zh',
    'temple-en': 'sitemap-temple-en',
    'guides-zh': 'sitemap-guides-zh',
    'guides-en': 'sitemap-guides-en',
    'misc': 'sitemap-misc'
  };

  for (const page of pages){
    const filePath = path.join(outputRoot, page.path, 'index.html');
    await writeFileIfChanged(filePath, page.html, manifest);
    if (page.noindex){
      noindexPages.push(page);
      continue;
    }
    indexablePages.push(page);
    if (!page.sitemap) continue;
    const key = page.sitemapGroup || `${page.type}-${page.lang}`;
    if (!sitemapBuckets.has(key)) sitemapBuckets.set(key, []);
    sitemapBuckets.get(key).push(page);
  }

  const sitemaps = [];
  const requiredGroups = ['food-zh','food-en','temple-zh','temple-en','guides-zh','guides-en','misc'];
  requiredGroups.forEach((group)=>{
    if (!sitemapBuckets.has(group)) sitemapBuckets.set(group, []);
  });
  for (const [key, list] of sitemapBuckets.entries()){
    const chunks = [];
    for (let i = 0; i < list.length; i += SITEMAP_LIMIT){
      chunks.push(list.slice(i, i + SITEMAP_LIMIT));
    }
    for (let i = 0; i < chunks.length; i += 1){
      const bucket = chunks[i];
      const baseName = sitemapNames[key] || `sitemap-${key}`;
      const fileName = `${baseName}${chunks.length > 1 ? `-${i+1}` : ''}.xml`;
      const filePath = path.join(outputRoot, 'sitemaps', fileName);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${bucket.map(page=>`  <url><loc>${escapeHtml(`${SITE.origin}${page.path}`)}</loc><lastmod>${formatDate(new Date())}</lastmod></url>`).join('\n')}\n</urlset>`;
      await writeFileIfChanged(filePath, xml, manifest);
      sitemaps.push({ file: `/sitemaps/${fileName}`, count: bucket.length });
    }
  }

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps.map(sm=>`  <sitemap><loc>${SITE.origin}${sm.file}</loc><lastmod>${formatDate(new Date())}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>`;
  await writeFileIfChanged(path.join(outputRoot, 'sitemap-index.xml'), sitemapIndex, manifest);

  const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE.origin}/sitemap-index.xml\n`;
  await writeFileIfChanged(path.join(outputRoot, 'robots.txt'), robots, manifest);

  const rssItems = indexablePages.filter(p=>p.type === 'listing').slice(0, 20).map(page=>{
    return `  <item>\n    <title>${escapeHtml(page.path)}</title>\n    <link>${SITE.origin}${page.path}</link>\n    <guid>${SITE.origin}${page.path}</guid>\n    <pubDate>${new Date().toUTCString()}</pubDate>\n  </item>`;
  }).join('\n');
  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>Unalome Codes SEO Updates</title>\n  <link>${SITE.origin}</link>\n  <description>Latest listing pages</description>\n${rssItems}\n</channel>\n</rss>`;
  await writeFileIfChanged(path.join(outputRoot, 'rss.xml'), rss, manifest);

  const reportSummary = [
    { label: 'Total pages (zh)', value: String(pages.filter(p=>p.lang === 'zh').length) },
    { label: 'Total pages (en)', value: String(pages.filter(p=>p.lang === 'en').length) },
    { label: 'Indexable pages', value: String(indexablePages.length) },
    { label: 'Noindex pages', value: String(noindexPages.length) }
  ];

  const missingStats = [
    { field: 'missing_address', count: allItems.filter(it=>!it.address).length },
    { field: 'missing_coords', count: allItems.filter(it=>!it.coords).length },
    { field: 'missing_description', count: allItems.filter(it=>!it.intro && !it.detail).length },
    { field: 'missing_schema', count: reportMissing.schema },
    { field: 'missing_canonical', count: reportMissing.canonical }
  ];

  const lowPages = pages.slice().sort((a,b)=>a.score - b.score).slice(0,50).map(page=>({
    url: page.path,
    score: page.score,
    reason: page.reason
  }));

  const reportHtml = renderLayout({
    lang: 'zh',
    title: 'SEO 品質報表',
    description: 'SEO quality report',
    canonical: `${SITE.origin}/dev/seo-report/`,
    alternates: [],
    noindex: true,
    body: renderSeoReport({
      title: 'SEO 品質報表',
      generatedAt: new Date().toISOString(),
      summary: reportSummary,
      missingStats,
      lowPages,
      slugConflicts,
      sitemaps,
      gateNotice: '此頁面需 token 才能看完整內容。'
    }),
    jsonLd: []
  });
  await writeFileIfChanged(path.join(outputRoot, 'dev/seo-report/index.html'), reportHtml, manifest);

  await writeManifest(manifest);

  console.log('[seo] pages generated', { pages: pages.length, indexable: indexablePages.length, noindex: noindexPages.length, sitemaps: sitemaps.length });
}

generate().catch((err)=>{
  console.error('[seo] generate failed', err);
  process.exitCode = 1;
});
