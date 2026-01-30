import fs from 'fs/promises';
import path from 'path';
import { SNAPSHOT_DIR, DEFAULT_CITY } from '../config.js';
import { ensureSlug } from '../utils/slug.js';
import { parseCoords } from '../utils/geo.js';

async function readJson(file){
  try{
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  }catch(_){
    return null;
  }
}

function normalizeList(input){
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.items)) return input.items;
  if (Array.isArray(input.data)) return input.data;
  return [];
}

function pickStr(obj, keys){
  for (const key of keys){
    const val = obj[key];
    if (val !== undefined && val !== null && String(val).trim()) return String(val).trim();
  }
  return '';
}

function pickNum(obj, keys){
  for (const key of keys){
    const val = obj[key];
    if (val === undefined || val === null || val === '') continue;
    const num = Number(val);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function pickList(obj, keys){
  for (const key of keys){
    const val = obj[key];
    if (Array.isArray(val)) return val.map(v=>String(v).trim()).filter(Boolean);
    if (typeof val === 'string') return val.split(/[，,]/).map(v=>v.trim()).filter(Boolean);
  }
  return [];
}

function normalizeRecord(record, kind){
  if (!record || typeof record !== 'object') return null;
  const id = String(record.id || record._id || record.slug || '').trim();
  const name = pickStr(record, ['name', 'title', 'label']);
  if (!id && !name) return null;
  const city = pickStr(record, ['city']) || DEFAULT_CITY.key;
  const region = pickStr(record, ['area', 'district', 'region', 'zone']);
  const category = pickStr(record, ['category', 'type']);
  const tags = pickList(record, ['tags', 'wishTags', 'wish_tags', 'keywords']);
  const price = pickStr(record, ['price', 'priceLevel', 'price_level']);
  const rating = pickNum(record, ['rating', 'score']);
  const address = pickStr(record, ['address', 'addr']);
  const hours = pickStr(record, ['hours', 'open', 'opening']);
  const transit = pickStr(record, ['transit', 'metro', 'mrt', 'bts']);
  const phone = pickStr(record, ['phone', 'tel', 'telephone']);
  const intro = pickStr(record, ['intro', 'summary', 'description', 'desc']);
  const detail = pickStr(record, ['detail', 'note']);
  const lat = pickNum(record, ['lat', 'latitude']);
  const lng = pickNum(record, ['lng', 'longitude']);
  const coords = parseCoords(lat, lng);
  const maps = pickStr(record, ['maps', 'map', 'mapUrl', 'mapsUrl']);
  const image = pickStr(record, ['cover', 'image', 'photo']);
  const slug = ensureSlug(record.slug || name || id, id || 'item');
  const updatedAt = pickStr(record, ['updatedAt', 'updated_at', 'updated', 'lastUpdated']) || '';

  return {
    id: id || slug,
    kind,
    name: name || slug,
    slug,
    city,
    region,
    category,
    tags,
    price,
    rating,
    address,
    hours,
    transit,
    phone,
    intro,
    detail,
    coords,
    maps,
    image,
    updatedAt,
    raw: record
  };
}

export async function loadSnapshots(){
  const foodFile = path.join(SNAPSHOT_DIR, 'foods.json');
  const templeFile = path.join(SNAPSHOT_DIR, 'temples.json');
  const foodsRaw = await readJson(foodFile);
  const templesRaw = await readJson(templeFile);
  const foods = normalizeList(foodsRaw).map(item=>normalizeRecord(item, 'food')).filter(Boolean);
  const temples = normalizeList(templesRaw).map(item=>normalizeRecord(item, 'temple')).filter(Boolean);
  return { foods, temples };
}
