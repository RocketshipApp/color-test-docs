import path from 'path';

import PizzaPetsCache from './PizzaPetsCache.js';
import { OrdClient } from '../lib/ord-client-v2-0-0.js';
import { PizzaPet } from '../lib/pizza-pet-s1-v1-26-25.js';
import { fetchFromCache } from './fetchFromCache.js';
import { createHash } from 'crypto';

const PIZZA_PETS_THUMBNAIL_URL = 'https://thumbnails.api.pizzapets.fun';
const ORDINALS_HOST = 'https://cdn.app.pizzapets.fun';
const MAX_ATTEMPTS = 3;

const SILENT = true;
const CONCURRENCY = 64;
const IMMORTAL_BLOCK_DELAY = 7; // Set greater than zero to spread out immortal processing.

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
    // 1. Ensure we have a blockheight
    if (!this._blockheight) {
      this._blockheight = await this.getBlockheight();
      console.log('Current blockheight:', this._blockheight);
    }

    await this.cache.load();
  }

  async saveCache() {
    await this.cache.save(this._blockheight);
  }

  // Process one chunk of inscription IDs
  async processChunk(inscriptionIds, startingOrdinal) {
    // 2. Create tasks for each inscription
    //    Each task is a function that calls processInscriptionId.
    const tasks = inscriptionIds.map((inscriptionId, idx) => {
      return async () => {
        await this.processInscriptionId(inscriptionId, startingOrdinal + idx);
      };
    });

    // 3. Process them in parallel, but limited by CONCURRENCY
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
      // Slice out up to CONCURRENCY tasks
      const slice = tasks.slice(i, i + CONCURRENCY);
      // Run them in parallel
      await Promise.all(slice.map((fn) => fn()));
    }
  }

  // The core logic for a single inscription
  async processInscriptionId(inscriptionId, ordinal) {
    // First, get the cache.
    let cacheEntry = this.cache.get(inscriptionId);

    let skipReason = '';
    let shouldEvaluatePet = true;
    if (cacheEntry) {
      if (cacheEntry.lastCheckBlockheight === this._blockheight) {
        shouldEvaluatePet = false;
        skipReason = 'Pet already processed in block.';
      } else if (cacheEntry.isAlive === true) {
        if (cacheEntry.isImmortal === true) {
          const inBucket = this.isInImmortalBucket(inscriptionId, this._blockheight, IMMORTAL_BLOCK_DELAY + 1);
          if (!inBucket) {
            shouldEvaluatePet = false;
            skipReason = 'Immortal skipped due to block delay.';
          }
        }
      } else {
        // Pet is dead.
        shouldEvaluatePet = false;
        skipReason = 'Pet is dead.';
      }
    }

    // Now go ahead and init cacheEntry if needed.
    if (!cacheEntry) {
      cacheEntry = {}; // brand new
    }

    let success = false;
    let pet = null;
    if (shouldEvaluatePet) {
      // We want up to 3 attempts to do pet.update(blockheight)
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          // Create a PizzaPet
          pet = new PizzaPet(inscriptionId, this.ordClient);
          if (!SILENT) console.log(`  [Attempt #${attempt}] Calling pet.update(${this._blockheight})`);
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

      if (!success || !pet) {
        console.error(`  Failed to update pet for ${inscriptionId} after 3 attempts.`);

        this.cache.set(inscriptionId, {
          ...cacheEntry, // preserve any data that was there previously
          id: inscriptionId,
          isAlive: null, // wipe this out since we dont know
          lastError: `Failed update after 3 attempts on block ${this._blockheight}`,
          lastCheckAt: new Date().toISOString(),
        });
        return;
      }

      // Update the lastCheck data.
      cacheEntry.lastCheckBlockheight = this._blockheight;
      cacheEntry.lastCheckAt = new Date().toISOString();

      // 4. If we succeeded, check .isAlive()
      const petIsAlive = pet.isAlive();

      // We only add the new hash if it's different from the last known
      const thumbnailHash = petIsAlive ? await pet.thumbnailHash() : '<DEAD-PET-HASH>';
      const prevHashArr = Array.isArray(cacheEntry.thumbnailHashes) ? cacheEntry.thumbnailHashes : [];

      if (thumbnailHash && prevHashArr[prevHashArr.length - 1] !== thumbnailHash) {
        prevHashArr.push(thumbnailHash);
      }

      const numberOfChildInscriptions = Object.values(pet.children).reduce((sum, arr) => sum + arr.length, 0);

      if (!SILENT) {
        console.log(
          `  => isAlive? ${petIsAlive}\n  => thumbnailHash: ${thumbnailHash}\n  => timesFed: ${numberOfChildInscriptions}`
        );
      }

      // Update the cache.
      cacheEntry.isAlive = petIsAlive;
      cacheEntry.isImmortal = pet.state === 'immortal';
      cacheEntry.thumbnailHashes = prevHashArr;
      cacheEntry.timesFed = numberOfChildInscriptions;

      const imageName = `pet_${thumbnailHash}.png`;
      // ex: https://thumbnails.api.pizzapets.fun/pizza-pets/<inscriptionId>/pet_<hash>.png
      cacheEntry.thumbnail_url = `${PIZZA_PETS_THUMBNAIL_URL}/pizza-pets/${inscriptionId}/${imageName}`;

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

      cacheEntry.metadata = metadata;
    } else {
      if (!SILENT) {
        console.log(`X -- Skipping evaluation. Reason: ${skipReason}`);
      }
    }

    // 6. Update the cache
    this.cache.set(inscriptionId, {
      ...cacheEntry,
      id: inscriptionId,
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

  isInImmortalBucket(inscriptionId, blockheight, totalBuckets) {
    // Create a hash from the inscriptionId
    const digest = createHash('sha256').update(inscriptionId).digest();
    // Interpret first 4 bytes as unsigned int, then mod by totalBuckets
    const modVal = digest.readUInt32BE(0) % totalBuckets;
    return modVal === blockheight % totalBuckets;
  }
}
