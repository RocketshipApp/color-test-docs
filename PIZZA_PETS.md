# Pizza Pets Collection API Documentation

## Overview
The **Pizza Pets Collection API** provides a real-time endpoint for Ordinals Marketplaces to retrieve the current state of a single dynamic collection of Bitcoin Ordinals known as **Pizza Pets**. With each new Bitcoin block, the state of these pets is recalculated—some pets evolve, and others may die. Dead pets are removed from the collection and no longer appear in the API results.

**Key Concepts:**
- **Dynamic Collection**: The collection of living Pizza Pets changes over time, as pets can die and thus be removed from subsequent responses.
- **Block-Height Syncing**: The `blockheight` returned by the API indicates the block at which this snapshot of the collection was computed. Marketplaces should compare returned `blockheight` values and update their displayed data only when a new, higher `blockheight` is detected.
- **Real-Time Updates**: As soon as a new block is processed, the collection and its metadata should be updated accordingly. Pets that die in the new block will not appear in the new `blockheight` results.

## Endpoint
**Base URL**:  
`https://collection.api.pizzapets.fun/`

**Available Path**:  
- **GET `/`**: Retrieves a paginated list of currently alive Pizza Pets for the latest `blockheight`.

**Example Requests**:
- First page (default): `https://collection.api.pizzapets.fun/`
- Second page: `https://collection.api.pizzapets.fun/?page=2`

### Query Parameters
- **page** (optional): Page number for pagination. Defaults to `1` if omitted.
- **magicEden** (optional): A marketplace-specific flag.
  - If not present, normal metadata is returned.
  - If present without a value (e.g. `?magicEden`), simplified metadata is returned suitable for Magic Eden.
  - If `?magicEden=true` or `?magicEden=false` is specified, the metadata format is still chosen based on the presence of the parameter.

**Marketplace-Specific Flags**:
- `?magicEden`: When set, the API returns a `meta` object containing `name`, `collection_page_img_url`, and `attributes` arrays, formatted for Magic Eden’s expected structure. Without `magicEden`, the API returns metadata fields inline, along with `thumbnail_url`.

## Synchronization & Delay Expectations
- The update process is designed to complete within approximately four minutes after a block is mined.
- The process will only begin once internal Ordinal nodes are synchronized.
- A 300-second debounce is in place, preventing multiple simultaneous syncs for rapidly mined blocks, which can introduce delays.
- It is possible for a resync to occur, allowing previously removed pets to be reintroduced into the collection if conditions change.

## Request Headers
- **Authorization**: A `Bearer` token unique to each partner (e.g., `Bearer [Partner API Key]`).
- **Content-Type**: `application/json`

**Example `curl` Request**:
```bash
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.api.pizzapets.fun/
```

## API Response Structure
Each response returns the current `blockheight` and a list of `items`. Only alive pets are listed. If a pet died before this `blockheight`, it won't appear in the results.

**Fields**:
- **blockheight** (string): The block at which this snapshot was computed.
- **items** (array): An array of pets for the requested page.
  - Default:
    ```json
    {
      "id": "some-inscription-id",
      "name": "Pizza Pet #42",
      "heartsRemaining": "3",
      "stageOfEvolution": "adult",
      "elementalType": "fire",
      "pineappleWeakness": "immune",
      "thumbnail_url": "https://thumbnails.api.pizzapets.fun/pizza-pets/[ord id]/pet_[thumbnailHash].png"
    }
    ```
  - With `magicEden`:
    ```json
    {
      "id": "some-inscription-id",
      "meta": {
        "name": "Pizza Pet #42",
        "collection_page_img_url": "https://thumbnails.api.pizzapets.fun/pizza-pets/[ord id]/pet_[thumbnailHash].png",
        "attributes": [
          { "trait_type": "heartsRemaining", "value": "3" },
          { "trait_type": "stageOfEvolution", "value": "adult" },
          { "trait_type": "elementalType", "value": "fire" },
          { "trait_type": "pineappleWeakness", "value": "immune" }
        ]
      }
    }
    ```
- **last_page** (boolean): `true` if this is the final page of results.

**Sample Response (Normal)**:
```json
{
  "blockheight": "833800",
  "items": [
    {
      "id": "ceed87ed12d755fca49b3a62cfe1be302d65863b2cda9bf1ffa8cd9d3745e100i0",
      "name": "Pizza Pet #1",
      "heartsRemaining": "3",
      "stageOfEvolution": "baby",
      "elementalType": "water",
      "pineappleWeakness": "immune",
      "thumbnail_url": "https://thumbnails.api.pizzapets.fun/pizza-pets/[ord id]/pet_[thumbnailHash].png"
    }
  ],
  "last_page": false
}
```

**Sample Response (with `magicEden`)**:
```json
{
  "blockheight": "833800",
  "items": [
    {
      "id": "ceed87ed12d755fca49b3a62cfe1be302d65863b2cda9bf1ffa8cd9d3745e100i0",
      "meta": {
        "name": "Pizza Pet #1",
        "collection_page_img_url": "https://thumbnails.api.pizzapets.fun/pizza-pets/[ord id]/pet_[thumbnailHash].png",
        "attributes": [
          { "trait_type": "heartsRemaining", "value": "3" },
          { "trait_type": "stageOfEvolution", "value": "baby" },
          { "trait_type": "elementalType", "value": "water" },
          { "trait_type": "pineappleWeakness", "value": "immune" }
        ]
      }
    }
  ],
  "last_page": false
}
```

## Pagination
To retrieve all pets:
1. Start at `?page=1` (default).
2. Check `last_page` in the response:
   - If `false`, increment `page` and request the next page.
   - If `true`, you have retrieved all pets currently alive at that `blockheight`.

**Example Pagination Workflow**:
- Fetch: `https://collection.api.pizzapets.fun/`
- If `last_page` is `false`, fetch `https://collection.api.pizzapets.fun/?page=2`, and so forth until `last_page` is `true`.

## Comparing Blockheights for Updates
Since the collection changes with every block:
- Cache the `blockheight` from previous fetches.
- Periodically fetch page `1` again after detecting new blocks.
- If the `blockheight` is higher, refresh all pages until `last_page` is reached again.

## Launch Milestones
- Thursday 12/12 PM (Pre-Reveal)
- Saturday 12/14 11:00am EST (Reveal)
- Monday 12/15 11:00am EST (Egg Phase Transition)
- Thursday 12/19 11:00am EST (First Death Cliff)

The API can be used during pre-reveal phases and transitions to monitor the collection’s evolving state. By observing changes in `thumbnail_url` and other metadata, marketplaces can confirm synchronization and readiness. The time between Saturday 11:00am and Monday 11:00am (the egg phase) is especially useful for verifying that updates are reflected promptly. Synchronization should be stable before the first death cliff event, ensuring that the marketplace accurately displays the state of the collection.

## Marketplace-Specific Flags
Using `?magicEden` modifies the `items` structure to include standardized attributes for Magic Eden. Other marketplaces can ignore this parameter or use their own flags.

**Example**:
```bash
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.api.pizzapets.fun/?magicEden
```

## Retrieving All Metadata (POC Code Snippet)
```javascript
async function fetchAllPets(magicEden = false) {
  const apiKey = '[Partner API Key]';
  let page = 1;
  let lastPage = false;
  const allItems = [];

  while (!lastPage) {
    const url = `https://collection.api.pizzapets.fun/?page=${page}${magicEden ? '&magicEden' : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: ${response.statusText}`);
    }

    const data = await response.json();
    allItems.push(...data.items);
    lastPage = data.last_page;
    page += 1;
  }

  console.log(`Fetched ${allItems.length} pets.`);
  return allItems;
}

// Usage examples:
fetchAllPets().then(pets => console.log('All Pets:', pets));
fetchAllPets(true).then(magicEdenPets => console.log('All Pets (Magic Eden):', magicEdenPets));
```

## Computing Image Paths Manually

If you would like to perform your own calculations for the thumbnail paths, without relying on our collection API, you can do so by directly simulating the pet using the latest version of the ordinals code. URLs and Inscription Ids are subject to change prior to launch of the game.

```html
<!-- index.html (Browser Version) -->
<!DOCTYPE html>
<html>
<head>
<title>Compute Pizza Pet Thumbnail Path</title>
</head>
<body>
<script type="module">
  // Parameterized inputs
  const THUMBNAIL_BUCKET = 'https://thumbnails.api.pizzapets.fun/pizza-pets';
  const ORDINALS_HOST = 'https://cdn.app.pizzapets.fun'; // mainnet
  const ORD_CLIENT_INSCRIPTION_ID = '5aa512a80659a7ec189ffd2cdf84af2614c898eec0605a86d0e813eef39c9452i0'; // ord-client.js (mainnet)
  const PIZZA_PET_INSCRIPTION_ID = 'b65f707ba03ed19a04e6a8eb0bcf0ee43aea9757a60de1780372dd4b738bdb89i0'; // pizza-pet.js (mainnet)

  // Dynamically load OrdClient and PizzaPet from the Ordinals host
  async function loadModules() {
    const [ordClientModule, pizzaPetModule] = await Promise.all([
      import(`${ORDINALS_HOST}/content/${ORD_CLIENT_INSCRIPTION_ID}`),
      import(`${ORDINALS_HOST}/content/${PIZZA_PET_INSCRIPTION_ID}`)
    ]);
    return { OrdClient: ordClientModule.OrdClient, PizzaPet: pizzaPetModule.PizzaPet };
  }

  (async () => {
    const { OrdClient, PizzaPet } = await loadModules();
    const ordClient = new OrdClient({
      host: ORDINALS_HOST,
      toJSON: (response) => response.json(),
      fetchOptions: { headers: { 'Content-Type': 'application/json' } }
    });

    // Replace with a real inscription ID and blockheight for testing
    const inscriptionId = 'SOME_INSCRIPTION_ID';
    const blockheight = 900000; 

    const pet = new PizzaPet(inscriptionId, ordClient, null);
    await pet.update();

    const alive = pet.isAlive();
    const thumbHash = await pet.thumbnailHash();

    // EX: https://thumbnails.api.pizzapets.fun/pizza-pets/[ord id]/pet_[thumbnailHash].png
    const thumbnailURL = `${THUMBNAIL_BUCKET}/${inscriptionId}/pet_${thumbHash}.png'`;

    console.log('Alive:', alive);
    console.log('Thumbnail Hash:', thumbHash);
    console.log('Thumbnail URL:', thumbnailURL);
  })();
</script>
</body>
</html>
```

```javascript
// Node.js Version (e.g., index.js)
import { OrdClient } from './ord-client-mainnet-v1.js';
import { PizzaPet } from './pizza-pet-mainnet-v1.js';
import fetch from 'node-fetch';

global.fetch = fetch; // ensure fetch is available if needed

// Parameterized inputs
const THUMBNAIL_BUCKET = 'https://thumbnails.api.pizzapets.fun/pizza-pets';
const ORDINALS_HOST = 'https://cdn.app.pizzapets.fun'; // mainnet
// These would normally be used to dynamically import code, but here we assume we've imported OrdClient and PizzaPet directly.
// ORD_CLIENT_INSCRIPTION_ID = '5aa512a80659a7ec189ffd2cdf84af2614c898eec0605a86d0e813eef39c9452i0'
// PIZZA_PET_INSCRIPTION_ID = 'b65f707ba03ed19a04e6a8eb0bcf0ee43aea9757a60de1780372dd4b738bdb89i0'

(async () => {
  const ordClient = new OrdClient({
    host: ORDINALS_HOST,
    toJSON: (response) => response.json(),
    fetchOptions: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  });

  // Replace with a real inscription ID and blockheight for testing
  const inscriptionId = 'SOME_INSCRIPTION_ID';
  const blockheight = 900000; 

  const pet = new PizzaPet(inscriptionId, ordClient, null);
  await pet.update();

  const alive = pet.isAlive();
  const thumbHash = await pet.thumbnailHash();

  // EX: https://thumbnails.api.pizzapets.fun/pizza-pets/[ord id]/pet_[thumbnailHash].png
  const thumbnailURL = `${THUMBNAIL_BUCKET}/${inscriptionId}/pet_${thumbHash}.png'`;

  console.log('Alive:', alive);
  console.log('Thumbnail Hash:', thumbHash);
  console.log('Thumbnail URL:', thumbnailURL);
})();
```

## Notes
- **Error Handling**: Check HTTP statuses and handle errors gracefully.
- **Rate Limits**: Be mindful of potential rate limits and implement backoff strategies.
- **Future Updates**: Additional endpoints or parameters may be introduced over time.

## Conclusion
Integrate the Pizza Pets Collection API to dynamically display evolving collections that respond to Bitcoin block events. By monitoring `blockheight` and handling pagination, you ensure that your marketplace remains synchronized with the latest state of the Pizza Pets ecosystem.