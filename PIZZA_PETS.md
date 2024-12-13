# Pizza Pets Collection API Documentation

## Overview
The **Pizza Pets Collection API** provides a real-time endpoint for Ordinals Marketplaces to retrieve the current state of a single dynamic collection of Bitcoin Ordinals known as **Pizza Pets**. With each new Bitcoin block, the state of these pets is recalculated—some pets evolve, and others may die. Dead pets are removed from the collection and no longer appear in the API results.

**Key Concepts:**
- **Dynamic Collection**: The collection of living Pizza Pets changes over time, as pets can die and thus be removed from subsequent responses.
- **Block-Height Syncing**: The `blockheight` returned by the API indicates the block at which this snapshot of the collection was computed. Marketplaces should compare returned `blockheight` values and update their displayed data only when a new, higher `blockheight` is detected.
- **Real-Time Updates**: As soon as a new block is processed, the collection and its metadata should be updated accordingly. Pets that die in the new block will not appear in the new `blockheight` results.

## Endpoint
**Base URL**:  
`https://collection.pizzapets.fun/`

**Available Path**:  
- **GET `/`**: Retrieves a paginated list of currently alive Pizza Pets for the latest `blockheight`.

**Example Requests**:
- First page (default): `https://collection.pizzapets.fun/`
- Second page: `https://collection.pizzapets.fun/?page=2`

### Query Parameters
- **page** (optional): Page number for pagination. Defaults to `1` if omitted.
- **magicEden** (optional): A marketplace-specific flag.  
  - If not present, normal metadata is returned.  
  - If present without a value (e.g. `?magicEden`), simplified metadata is returned suitable for Magic Eden.  
  - If `?magicEden=true` or `?magicEden=false` is specified, the metadata format is still chosen based on the presence of the parameter, with the provided value potentially used to toggle marketplace-specific features.

**Marketplace-Specific Flags**:
- `?magicEden`: When set, the API returns a `meta` object containing `name`, `high_res_img_url`, and `attributes` arrays, formatted for Magic Eden’s expected structure. Without `magicEden`, the API returns metadata fields inline, along with `thumbnail_url`.

## Request Headers
- **Authorization**: A `Bearer` token unique to each partner (e.g., `Bearer [Partner API Key]`).
- **Content-Type**: `application/json`

**Example `curl` Request**:
```bash
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.pizzapets.fun/
```

## API Response Structure
Each response returns the current `blockheight` and a list of `items`. Only alive pets are listed. If a pet died before this `blockheight`, it won't appear in the results.

**Fields**:
- **blockheight** (string): The block at which this snapshot was computed.
- **items** (array): An array of pets for the requested page.
  - If `magicEden` is **not** used:
    ```json
    {
      "id": "some-inscription-id",
      "name": "Pizza Pet #42",
      "heartsRemaining": "3",
      "stageOfEvolution": "adult",
      "elementalType": "fire",
      "pineappleWeakness": "immune",
      "thumbnail_url": "https://collection-assets/.../pet_xyz.png"
    }
    ```
  - If `magicEden` **is** used:
    ```json
    {
      "id": "some-inscription-id",
      "meta": {
        "name": "Pizza Pet #42",
        "high_res_img_url": "https://collection-assets/.../pet_xyz.png",
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
      "thumbnail_url": "https://s3.amazonaws.com/.../pet_abc123.png"
    }
    // Additional pets...
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
        "high_res_img_url": "https://s3.amazonaws.com/.../pet_abc123.png",
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
- Fetch: `https://collection.pizzapets.fun/`
- If `last_page` is `false`, fetch `https://collection.pizzapets.fun/?page=2`, and so forth until `last_page` is `true`.

## Comparing Blockheights for Updates
Since the collection changes with every block:
- Cache the `blockheight` from previous fetches.
- Periodically (e.g., after detecting a new block in your system), fetch page `1` again.
- If the `blockheight` is higher than the cached one, you have a new state of the collection. Refresh all pages from `1` onward until `last_page` is reached again.

## Marketplace-Specific Flags
As mentioned, `?magicEden` changes the structure of `items` to include a `meta` object and standardized attributes suitable for Magic Eden. Other marketplaces can ignore this parameter or use their own query parameters as needed.

**Example for Magic Eden Flag**:
```bash
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.pizzapets.fun/?magicEden
```
This returns the `meta` object structure described above.

## Retrieving All Metadata (POC Code Snippet)
Here’s a sample JavaScript snippet to paginate through all results at the current blockheight, capturing all pets:

```javascript
async function fetchAllPets(magicEden = false) {
  const apiKey = '[Partner API Key]';
  let page = 1;
  let lastPage = false;
  const allItems = [];

  while (!lastPage) {
    const url = `https://collection.pizzapets.fun/?page=${page}${magicEden ? '&magicEden' : ''}`;
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

// Example usage:
fetchAllPets().then(pets => console.log('All Pets:', pets));
fetchAllPets(true).then(magicEdenPets => console.log('All Pets (Magic Eden):', magicEdenPets));
```

## Computing Image Paths Manually
**TBD**  
(Details on how to manually construct image URLs, if needed, will be provided in a future update.)

## Notes
- **Error Handling**: Check HTTP statuses and handle networking issues gracefully.
- **Rate Limits**: Be mindful of potential rate limits and implement backoff strategies if necessary.
- **Future Updates**: Additional endpoints or parameters may be introduced as Pizza Pets evolve from POC to production.

## Conclusion
Integrate the Pizza Pets Collection API to dynamically display evolving collections that respond to Bitcoin block events. By monitoring `blockheight` and handling pagination, you ensure that your marketplace remains synchronized with the latest state of the Pizza Pets ecosystem.