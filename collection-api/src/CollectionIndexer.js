import path from 'path';

import PizzaPetsCache from './PizzaPetsCache.js';
import { OrdClient } from '../lib/ord-client-v2-0-0.js';
import { PizzaPet } from '../lib/pizza-pet-s1-v1-26-25.js';
import { fetchFromCache } from './fetchFromCache.js';

const ORDINALS_HOST = 'https://cdn.app.pizzapets.fun';
const MAX_ATTEMPTS = 3;

export default class CollectionIndexer {
  constructor() {
    // The cache manager
    this.cache = new PizzaPetsCache(path.resolve('./cache/collection-cache.json'));

    // Create an OrdClient
    this.ordClient = new OrdClient({
      host: ORDINALS_HOST,
      toJSON: (response) => response.json(),
      fetch: (url, opts) => fetchFromCache(url, opts),
      fetchOptions: { headers: { 'Content-Type': 'application/json' } },
    });

    // We'll load the blockheight once per run
    this._blockheight = null;
  }

  async loadCache() {
    await this.cache.load();
  }

  async saveCache() {
    await this.cache.save();
  }

  // Process one chunk of inscription IDs
  async processChunk(inscriptionIds, startingOrdinal) {
    // 1. Ensure we have a blockheight
    if (!this._blockheight) {
      this._blockheight = await this.getBlockheight();
      console.log('Current blockheight:', this._blockheight);
    }

    // 2. For each ID in the chunk, do the standard check
    let ordinal = startingOrdinal;
    for (const inscriptionId of inscriptionIds) {
      console.log(`\nProcessing inscriptionId = ${inscriptionId} ...`);
      await this.processInscriptionId(inscriptionId, ordinal);
      ordinal++;
    }
  }

  // The core logic for a single inscription
  async processInscriptionId(inscriptionId, ordinal) {
    // We want up to 3 attempts to do pet.update(blockheight)
    let success = false;
    let pet;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // Create a PizzaPet
        pet = new PizzaPet(inscriptionId, this.ordClient);
        console.log(`  [Attempt #${attempt}] Calling pet.update(${this._blockheight})`);
        await pet.update(this._blockheight);
        success = true;
        break;
      } catch (err) {
        console.error(`  pet.update() attempt #${attempt} failed`, err);
        if (attempt < MAX_ATTEMPTS) {
          const delayMs = 600 + Math.floor(Math.random() * 401);
          console.log(`  Retrying in ${delayMs}ms...`);
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }

    if (!success) {
      console.error(`  Failed to update pet for ${inscriptionId} after 3 attempts.`);
      // Optionally update cache to note the failure
      this.cache.set(inscriptionId, {
        isAlive: false,
        lastError: 'Failed update after 3 attempts',
        lastCheckBlockheight: this._blockheight,
        lastCheckAt: new Date().toISOString(),
      });
      return;
    }

    // 4. If we succeeded, check .isAlive()
    const alive = pet.isAlive();
    console.log(`  => isAlive? ${alive}`);

    // 5. Build metadata
    //    For example, we mirror the lambda’s approach. Some fields require
    //    pet.* methods you might already have in the PizzaPet library.
    const newPetHash = pet.getPetHash?.() || null; // If your library has getPetHash()
    // Or you might compute the hash some other way. This is a placeholder.

    let cacheEntry = this.cache.get(inscriptionId);
    if (!cacheEntry) {
      cacheEntry = {}; // brand new
    }

    const prevHashArr = Array.isArray(cacheEntry.thumbnailHashes) ? cacheEntry.thumbnailHashes : [];

    // We only add the new hash if it's different from the last known
    if (newPetHash && prevHashArr[prevHashArr.length - 1] !== newPetHash) {
      prevHashArr.push(newPetHash);
    }

    const name = `Pizza Pet #${ordinal}`;

    const metadata = {
      name,
      heartsRemaining: pet.health,
      stageOfEvolution: pet.state,
      elementalType: pet.type,
      pineappleWeakness: pet.weakness ?? 'immune',
      lastEventBlock: this._blockheight,
    };
    if (pet.deathAt) {
      metadata.deathAt = pet.deathAt;
    }

    // 6. Update the cache
    this.cache.set(inscriptionId, {
      isAlive: alive,
      metadata,
      lastCheckBlockheight: this._blockheight,
      lastCheckAt: new Date().toISOString(),
      thumbnailHashes: prevHashArr,
    });
  }

  // Helper to fetch the current blockheight once
  async getBlockheight() {
    const url = `${ORDINALS_HOST}/r/blockheight`;
    const response = await this.fetchWithRetries(url);
    const result = await response.json();
    return result;
  }

  // A simple fetchWithRetries helper with random jitter
  async fetchWithRetries(url, options = {}, maxRetries = 3) {
    let attempt = 0;
    let lastError;
    while (attempt < maxRetries) {
      attempt++;
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status} - ${response.statusText}`);
        }
        return response;
      } catch (err) {
        console.warn(`Fetch attempt #${attempt} failed:`, err);
        lastError = err;
        if (attempt < maxRetries) {
          // Simple jittered delay: 600-1000 ms
          const delayMs = 600 + Math.floor(Math.random() * 401);
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }
    throw lastError;
  }
}
