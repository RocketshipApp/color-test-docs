import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache'); // e.g. "./cache"
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export default class PizzaPetsCache {
  constructor(cacheFilePath) {
    this.cacheFilePath = cacheFilePath;

    // We'll maintain an internal structure like:
    // {
    //   order: ['id1', 'id2', ...],
    //   data: {
    //     id1: {...},
    //     id2: {...}
    //   }
    // }
    //
    // But you can store it however you wish.
    this._cache = {
      order: [],
      data: {},
    };
  }

  async load() {
    if (!fs.existsSync(this.cacheFilePath)) {
      console.log(`Cache file not found at ${this.cacheFilePath}, starting fresh.`);
      return;
    }
    try {
      const raw = fs.readFileSync(this.cacheFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      // Expecting the same structure
      this._cache.order = parsed.order || [];
      this._cache.data = parsed.data || {};
      console.log(`Loaded cache with ${this._cache.order.length} entries.`);
    } catch (err) {
      console.error('Error reading cache file. Starting with an empty cache.', err);
      this._cache = { order: [], data: {} };
    }
  }

  async save(blockHeight) {
    // We'll produce an object with { order, data }
    // so it's easy for a human to parse.  The order array ensures
    // the ordering, while data is keyed by inscriptionId.

    // Another approach is to create an *array of objects* for final output.
    // We'll keep the "order" array, but let’s just store the final file
    // in the same shape for simplicity.

    const finalObj = {
      blockHeight,
      order: this._cache.order,
      data: this._cache.data,
    };

    fs.writeFileSync(this.cacheFilePath, JSON.stringify(finalObj, null, 2), 'utf8');
    console.log(`Cache saved to ${this.cacheFilePath}`);
  }

  get(inscriptionId) {
    return this._cache.data[inscriptionId];
  }

  set(inscriptionId, entry) {
    if (!this._cache.data[inscriptionId]) {
      // If it's new, add it to the order array
      this._cache.order.push(inscriptionId);
    }
    this._cache.data[inscriptionId] = entry;
  }
}
