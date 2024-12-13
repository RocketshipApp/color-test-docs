# Color-Test API Documentation

## Overview
The **Color-Test API** provides a real-time endpoint for external marketplaces to retrieve the latest color state of specific Bitcoin ordinals. This API is part of a proof-of-concept (POC) system for the upcoming **Pizza Pets Game**. Color-Test showcases how ordinals evolve with every new Bitcoin block, offering dynamic properties that can be visualized in collections based on their color (Red, Green, or Blue). 

In the POC, each ordinal's color updates when a new block is generated, cycling among red, green, and blue based on the algorithm in the [ColorTest](https://ordin-delta.vercel.app/content/a43a4445b4272b06f2ab91c50996ceb0aa24ad956859f9d8bb17e99b4908a63ci0) module. The color calculation is tied to a combination of each ordinal's unique inscription ID, its position in the collection, and the current block height:

```javascript
async update() {
  await this.#clientReady;
  this.currentBlock = await this.ordClient.getBlockHeight();
}

get colorIndex() {
  const number = parseInt(this.info.id.slice(0, 12), 16) + this.info.number + this.currentBlock;
  return number % this.colors.length;
}
```

This mechanism ensures ordinals continuously update and change over time, aligning with the intended functionality of Pizza Pets, where pets evolve based on new inscriptions made by their owners.

## API Endpoints

### Collection API Endpoints
The Color-Test Collection API provides three endpoints for querying collections of ordinals based on their current color. Each request fetches a paginated list of ordinals for a specified color, including details like `blockheight` and `thumbnail_url` for easy visual integration.

**Endpoints:**
- Red Collection: `https://collection.color-test.pizzapets.fun/red`
- Green Collection: `https://collection.color-test.pizzapets.fun/green`
- Blue Collection: `https://collection.color-test.pizzapets.fun/blue`

#### Query Parameters

- **page** (optional): Specifies the page number of results to retrieve. If omitted, defaults to page `1`.

**Examples:**
- First page (default): `https://collection.color-test.pizzapets.fun/red`
- Second page: `https://collection.color-test.pizzapets.fun/red?page=2`

#### Request Headers
All requests to the Color-Test API require the following headers:
- **Authorization**: A `Bearer` token unique to each partner (e.g., `Bearer [Partner API Key]`).
- **Content-Type**: `application/json`

#### Example `curl` Requests
```bash
# Fetch the first page of the red collection
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.color-test.pizzapets.fun/red

# Fetch the second page of the green collection
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.color-test.pizzapets.fun/green?page=2

# Fetch the third page of the blue collection
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.color-test.pizzapets.fun/blue?page=3
```

### API Response Structure

Each request will return a paginated JSON response with the following structure:

- **blockheight** (string): The latest block height at which this collection was evaluated.
- **items** (array): An array of ordinals for the requested page, each with:
  - **id** (string): Unique ID of the ordinal.
  - **thumbnail_url** (string): URL to the thumbnail image for the ordinal’s color.
- **last_page** (boolean): Indicates if this is the final page of results.

#### Sample Response for `Green` Collection
```json
{
  "blockheight": "833366",
  "items": [
    {
      "id": "c2ca06403da760bb405c8bf4aa77f7a03a246d9b2b45eeb00e59d3a86ac90fb6i0",
      "thumbnail_url": "https://me-color-test.s3.us-west-2.amazonaws.com/green.png"
    }
    // Additional ordinals...
  ],
  "last_page": true
}
```

### Pagination

To retrieve all ordinals in a collection, you may need to paginate through multiple pages. Use the `page` query parameter to specify the page number. Continue fetching pages until the `last_page` field in the response is `true`.

**Example Workflow:**
1. Start by requesting the first page (default or `?page=1`).
2. Check the `last_page` field in the response:
   - If `false`, increment the `page` parameter and request the next page.
   - If `true`, you have reached the end of the collection.

## Workflow Summary

To ensure collections remain synchronized with the latest ordinal colors, marketplaces should adhere to the following workflow:

1. **Detect New Block**: When a new block is detected, note the updated block height.
2. **Invoke the Collection API**: Query the Collection API endpoint for each color (`red`, `green`, `blue`), handling pagination as needed, and confirm that the `blockheight` matches the latest block height.
3. **Update Collections**: Update the displayed collections based on the API responses for each color, ensuring users see the most recent ordinal states.

## Sample Code for Integration

### `curl` Requests

For basic integration and testing, you can use these sample `curl` commands to fetch each collection:

```bash
# Fetch the first page of the red collection
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.color-test.pizzapets.fun/red

# Fetch the second page of the red collection
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.color-test.pizzapets.fun/red?page=2

# Fetch the first page of the green collection
curl -H "authorization: Bearer [Partner API Key]" \
     -H "content-type: application/json" \
     https://collection.color-test.pizzapets.fun/green
```

### JavaScript Example for Fetching Collections with Pagination

The following JavaScript function demonstrates how to query the Collection API for a specified color, handling pagination:

```javascript
async function fetchCollection(color) {
  const apiKey = '[Partner API Key]';  // Replace with your actual API Key
  let page = 1;
  let lastPage = false;
  const allItems = [];

  while (!lastPage) {
    const response = await fetch(`https://collection.color-test.pizzapets.fun/${color}?page=${page}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch collection for ${color}, page ${page}: ${response.statusText}`);
    }

    const data = await response.json();
    allItems.push(...data.items);
    lastPage = data.last_page;
    page += 1;
  }

  console.log(`Fetched ${allItems.length} items for color ${color}.`);
  return allItems;
}

// Fetch example
fetchCollection('red')
  .then(items => console.log('Red Collection Items:', items))
  .catch(err => console.error(err));
```

### Notes

- **Error Handling**: Implement robust error handling to manage cases where the response might not be `200 OK`. This includes handling network errors, invalid responses, and rate limits.
- **Pagination**: Always check the `last_page` field in the response to determine if more pages are available. Adjust your loop or recursion accordingly.
- **Rate Limiting**: Be mindful of potential rate limits on the API. Implement backoff strategies if necessary.

## Conclusion

By incorporating pagination into your API requests, you can efficiently retrieve all ordinals for each color, ensuring your marketplace displays up-to-date collections in sync with the latest Bitcoin block. Remember to monitor for new blocks and update your collections accordingly.
