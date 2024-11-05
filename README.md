# Color-Test API Documentation

## Overview
The **Color-Test API** provides a real-time endpoint for external marketplaces to retrieve the latest color state of specific Bitcoin ordinals. This API is part of a proof-of-concept (POC) system for the upcoming **Pizza Pets Game**. Color-Test showcases how ordinals evolve with every new Bitcoin block, offering dynamic properties that can be visualized in collections based on their color (Red, Green, or Blue). 

In the POC, each ordinal's color updates when a new block is generated, cycling among red, green, and blue based on the algorithm in the **ColorTest** module. The color calculation is tied to a combination of each ordinal's unique inscription ID, its position in the collection, and the current block height:

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
The Color-Test Collection API provides three endpoints for querying collections of ordinals based on their current color. Each request fetches the list of ordinals for a specified color, including details like `blockheight` and `thumbnail_url` for easy visual integration.

**Endpoints:**
- Red Collection: `https://collection.color-test.pizzapets.fun/red`
- Green Collection: `https://collection.color-test.pizzapets.fun/green`
- Blue Collection: `https://collection.color-test.pizzapets.fun/blue`

#### Request Headers
All requests to the Color-Test API require the following headers:
- **Authorization**: A `Bearer` token unique to each partner (e.g., `Bearer [Partner API Key]`).
- **Content-Type**: `application/json`

#### Example `curl` Requests
```bash
curl -H "authorization: Bearer [Partner API Key]" -H "content-type: application/json" https://collection.color-test.pizzapets.fun/red
curl -H "authorization: Bearer [Partner API Key]" -H "content-type: application/json" https://collection.color-test.pizzapets.fun/green
curl -H "authorization: Bearer [Partner API Key]" -H "content-type: application/json" https://collection.color-test.pizzapets.fun/blue
```

### API Response Structure

Each request will return a paginated JSON response with the following structure:

- **blockheight** (string): The latest block height at which this collection was evaluated.
- **items** (array): An array of ordinals, each with:
  - **id** (string): Unique ID of the ordinal.
  - **thumbnail_url** (string): URL to the thumbnail image for the ordinal’s color.
- **last_page** (boolean): Indicates if this is the final page of results.

#### Sample Response for `Red` Collection
```json
{
  "blockheight": "123",
  "items": [
    {
      "id": "a4a8c57a5e6c8eff87740d288f7c2f0689c569190887a5a94b7a77c67b27ac09i0",
      "thumbnail_url": "https://me-color-test.s3.us-west-2.amazonaws.com/red.png"
    },
    {
      "id": "1debbc8179a4fc8e5a46d9c99919c08a5085c8962e96771b31499b6443c199eai0",
      "thumbnail_url": "https://me-color-test.s3.us-west-2.amazonaws.com/red.png"
    },
    // Additional ordinals...
  ],
  "last_page": false
}
```

## Workflow Summary

To ensure collections remain synchronized with the latest ordinal colors, marketplaces should adhere to the following workflow:

1. **Detect New Block**: When a new block is detected, note the updated block height.
2. **Invoke the Collection API**: Query the Collection API endpoint for each color (`red`, `green`, `blue`) and confirm that the `blockheight` matches the latest block height.
3. **Update Collections**: Update the displayed collections based on the API responses for each color, ensuring users see the most recent ordinal states.

## Sample Code for Integration

### `curl` Requests
For basic integration and testing, you can use these sample `curl` commands to fetch each collection:

```bash
curl -H "authorization: Bearer [Partner API Key]" -H "content-type: application/json" https://collection.color-test.pizzapets.fun/red
curl -H "authorization: Bearer [Partner API Key]" -H "content-type: application/json" https://collection.color-test.pizzapets.fun/green
curl -H "authorization: Bearer [Partner API Key]" -H "content-type: application/json" https://collection.color-test.pizzapets.fun/blue
```

### JavaScript Example for Fetching Collections

The following JavaScript function demonstrates how to query the Collection API for a specified color:

```javascript
async function fetchCollection(color) {
  const apiKey = '[Partner API Key]';  // Replace with actual API Key
  const response = await fetch(`https://collection.color-test.pizzapets.fun/${color}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch collection for ${color}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
}

// Fetch example
fetchCollection('red')
  .then(data => console.log('Red Collection:', data))
  .catch(err => console.error(err));
```

### Notes
- **Error Handling**: Implement error handling for cases where the response might not be `200 OK`.
- **Pagination**: If `last_page` is `false`, implement pagination to retrieve additional pages if necessary.

This completes the Color-Test API documentation, enabling developers to integrate and maintain real-time, synchronized ordinal collections effectively.
