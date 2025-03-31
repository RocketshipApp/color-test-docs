import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  const cachePath = path.join(__dirname, '..', 'cache', 'collection-cache.json');
  const statusPath = path.join(__dirname, '..', 'cache', 'status.json');

  // 1. Read the existing collection-cache.json file.
  let collectionCache;
  try {
    const rawData = fs.readFileSync(cachePath, 'utf8');
    collectionCache = JSON.parse(rawData);
  } catch (err) {
    console.error('Failed to read or parse collection-cache.json:', err);
    process.exit(1);
  }

  // Ensure the expected structure exists.
  if (!collectionCache.order || !collectionCache.data) {
    console.error('Invalid structure in collection-cache.json. Missing "order" or "data" keys.');
    process.exit(1);
  }

  // 2. Compute summary metrics.
  let alive = 0;
  let dead = 0;
  let fedCount = 0; // how many pets have been fed (> 0 timesFed)
  let timesFedTotal = 0;
  let childCount = 0;
  let babyCount = 0;
  let teenCount = 0;
  let adultCount = 0;
  let immortalCount = 0;
  let maxLastCheckBlockHeight = 0;

  const allPetIds = collectionCache.order;
  for (const petId of allPetIds) {
    const petData = collectionCache.data[petId];
    if (!petData) continue;

    // isAlive / isImmortal
    if (petData.isAlive) {
      alive += 1;

      if (petData.isImmortal) {
        immortalCount += 1;
      }

      // stageOfEvolution
      const stage = petData.metadata?.stageOfEvolution;
      if (stage === 'child') childCount += 1;
      if (stage === 'baby') babyCount += 1;
      if (stage === 'teen') teenCount += 1;
      if (stage === 'adult') adultCount += 1;
    } else {
      dead += 1;
    }

    // timesFed
    const tf = petData.timesFed || 0;
    timesFedTotal += tf;
    if (tf > 0) {
      fedCount += 1;
    }
  }

  // 3. Construct the status object.
  // Note: Some fields (like lastBlockStart, lastBlockEnd) aren’t derivable from the cache alone;
  // we’ll set them to null or placeholder values. Adjust as needed to fit your real data flow.
  const statusJson = {
    blockHeight: collectionCache.blockHeight,
    blockProcessing: false, // set this according to your actual processing logic
    blockMetrics: {
      alivePetCount: alive,
      lastBlockStart: null, // no direct info in collection-cache.json
      lastBlockEnd: null, // no direct info in collection-cache.json
      lastBlockCompleted: collectionCache.blockHeight,
      sync: 'inSync', // adjust as needed
      isBlockDelayed: false, // adjust as needed
    },
    petMetrics: {
      dead: dead,
      alive: alive,
      validPetCounts: alive + dead === allPetIds.length,
      fed: fedCount,
      child: childCount,
      baby: babyCount,
      adult: adultCount,
      teen: teenCount,
      immortal: immortalCount,
    },
    // These are "top-level" metrics that mirror some of the petMetrics.
    alivePets: alive,
    deadPets: dead,
    timesFed: timesFedTotal.toString(),
    immortalsProcessed: immortalCount.toString(),
  };

  // 4. Write status.json to the same cache folder.
  try {
    fs.writeFileSync(statusPath, JSON.stringify(statusJson, null, 2), 'utf8');
    console.log('Status file has been written to:', statusPath);
  } catch (err) {
    console.error('Failed to write status.json:', err);
    process.exit(1);
  }
}

// Execute the script.
main();
