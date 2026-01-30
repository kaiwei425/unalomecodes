import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { SNAPSHOT_DIR } from '../../src/seo/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const SOURCE_CANDIDATES = [
  { kind: 'foods', files: ['data/foods.json', 'data/food.json', 'data/foods.snapshot.json'] },
  { kind: 'temples', files: ['data/temples.json', 'data/temple.json', 'data/temples.snapshot.json'] }
];

const SCAN_DIRS = ['data', 'js', 'lib', 'assets'];

async function readJson(file){
  try{
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  }catch(_){
    return null;
  }
}

async function loadFromEnv(){
  const envPath = process.env.SEO_SNAPSHOT_PATH || '';
  if (!envPath) return null;
  const abs = path.isAbsolute(envPath) ? envPath : path.join(repoRoot, envPath);
  return readJson(abs);
}

async function fetchFromApi(kind){
  const base = String(process.env.SEO_SNAPSHOT_API_BASE || '').trim();
  if (!base) return null;
  const endpoint = kind === 'foods' ? '/api/foods' : '/api/temples';
  try{
    const res = await fetch(base.replace(/\/$/, '') + endpoint, { headers: { 'accept': 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  }catch(_){
    return null;
  }
}

async function findCandidateJson(kind){
  const hits = [];
  for (const dir of SCAN_DIRS){
    const abs = path.join(repoRoot, dir);
    try{
      const stats = await fs.stat(abs);
      if (!stats.isDirectory()) continue;
    }catch(_){
      continue;
    }
    const files = await walk(abs);
    files.filter(f=>f.endsWith('.json') && f.toLowerCase().includes(kind.slice(0, -1)))
      .forEach(f=>hits.push(f));
  }
  for (const file of hits){
    const data = await readJson(file);
    if (data) return data;
  }
  return null;
}

async function walk(dir){
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries){
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()){
      out.push(...await walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function buildMock(kind, count){
  const items = [];
  for (let i = 1; i <= count; i += 1){
    const isFood = kind === 'foods';
    const id = `${isFood ? 'food' : 'temple'}-${String(i).padStart(3, '0')}`;
    const city = 'bangkok';
    const area = i % 2 === 0 ? 'Sukhumvit' : 'Old Town';
    const category = isFood ? (i % 2 === 0 ? 'Street Food' : 'Cafe') : 'Blessing';
    const tags = isFood ? ['Local', 'Recommended', i % 2 === 0 ? 'Night' : 'Lunch'] : ['祈福', '安定', '文化'];
    items.push({
      id,
      name: isFood ? `Mock Food ${i}` : `Mock Temple ${i}`,
      city,
      area,
      category,
      tags,
      address: `${i} Mock Street, ${area}, Bangkok`,
      lat: 13.7 + i * 0.001,
      lng: 100.5 + i * 0.001,
      hours: '09:00-18:00',
      priceLevel: isFood ? (i % 3) + 1 : undefined,
      rating: (i % 5) + 1,
      intro: isFood ? '用於驗收的示意資料，請日後替換真實內容。' : '用於驗收的示意資料，請日後替換真實內容。',
      _mock: true
    });
  }
  return items;
}

async function snapshotKind(kind, data, source = 'local'){
  await fs.mkdir(path.join(repoRoot, SNAPSHOT_DIR), { recursive: true });
  const file = path.join(repoRoot, SNAPSHOT_DIR, `${kind}.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    items: Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []),
    meta: {
      mock: false,
      source
    }
  };
  await fs.writeFile(file, JSON.stringify(payload, null, 2));
  await writeSchemaReport(kind, payload.items);
  return payload.items.length;
}

async function writeSchemaReport(kind, items){
  const report = {
    kind,
    total: items.length,
    missingName: 0,
    missingAddress: 0,
    missingCoords: 0
  };
  items.forEach(item=>{
    if (!item || !String(item.name || item.title || '').trim()) report.missingName += 1;
    if (!String(item.address || '').trim()) report.missingAddress += 1;
    const lat = Number(item.lat || item.latitude);
    const lng = Number(item.lng || item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) report.missingCoords += 1;
  });
  const file = path.join(repoRoot, SNAPSHOT_DIR, `${kind}-schema-report.json`);
  await fs.writeFile(file, JSON.stringify(report, null, 2));
}

async function main(){
  const written = new Set();
  let envData = await loadFromEnv();
  if (envData && envData.foods){
    await snapshotKind('foods', envData.foods, 'env');
    written.add('foods');
  }
  if (envData && envData.temples){
    await snapshotKind('temples', envData.temples, 'env');
    written.add('temples');
  }

  for (const group of SOURCE_CANDIDATES){
    if (written.has(group.kind)) continue;
    let loaded = null;
    let source = 'file';
    for (const rel of group.files){
      const abs = path.join(repoRoot, rel);
      loaded = await readJson(abs);
      if (loaded) break;
    }
    if (!loaded){
      source = 'scan';
      loaded = await findCandidateJson(group.kind);
    }
    if (!loaded){
      source = 'api';
      loaded = await fetchFromApi(group.kind);
    }
    if (!loaded){
      const mockItems = buildMock(group.kind, 20);
      const file = path.join(repoRoot, SNAPSHOT_DIR, `${group.kind}.json`);
      const payload = { generatedAt: new Date().toISOString(), items: mockItems, meta: { mock: true, source: 'mock' } };
      await fs.writeFile(file, JSON.stringify(payload, null, 2));
      await writeSchemaReport(group.kind, payload.items);
    } else {
      await snapshotKind(group.kind, loaded, source);
    }
  }

  console.log('[seo] snapshot completed');
}

main().catch((err)=>{
  console.error('[seo] snapshot failed', err);
  process.exitCode = 1;
});
