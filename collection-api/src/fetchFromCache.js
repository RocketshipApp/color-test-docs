import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'cache/html'); // e.g. "./cache"
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Creates a safe file name from a URL. For instance, by hashing the URL
 * to ensure we don't have weird characters and collisions.
 */
function makeCacheFilePath(urlString) {
  // Hashing the entire URL string
  const hash = crypto.createHash('sha256').update(urlString).digest('hex');
  return path.join(CACHE_DIR, `${hash}.json`);
}

/**
 * A minimal mock Response object with `ok`, `status`, `.json()` and `.text()`.
 * Enough to satisfy typical usage in an OrdClient.
 */
function makeMockResponse(content, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => content,
    json: async () => JSON.parse(content),
  };
}

/**
 * Our "fetchFromCache" function.
 *
 * - Checks for a cache file
 * - If found, returns mock response from file
 * - Else fetches from network, saves to cache, then returns
 */
export async function fetchFromCache(urlOrRequest, options = {}, maxRetries = 3) {
  // Convert whatever was passed in (string or Request object) to a string
  const urlString = getUrlString(urlOrRequest);
  let cacheFilePath = null;
  const isBlockheight = urlString.includes('/r/blockheight');

  // Check if it’s blockheight if so, skip the cache.
  if (!isBlockheight) {
    cacheFilePath = makeCacheFilePath(urlString);

    // 1. Check local cache
    if (fs.existsSync(cacheFilePath)) {
      const cachedContent = fs.readFileSync(cacheFilePath, 'utf8');
      return makeMockResponse(cachedContent, 200);
    }
  }

  // 2. Otherwise do real fetch
  let attempt = 0;
  let lastError;
  while (attempt < maxRetries) {
    attempt++;
    try {
      // We can pass the original Request object or re-construct a request from urlString, options
      const response = await fetch(urlString, options);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} - ${response.statusText}`);
      }

      const responseBody = await response.text();

      if (cacheFilePath !== null) {
        // 3. Save that body to the cache
        fs.writeFileSync(cacheFilePath, responseBody, 'utf8');
      }

      // 4. Return a mock response to the caller
      return makeMockResponse(responseBody, response.status);
    } catch (err) {
      console.warn(`fetchFromCache() attempt #${attempt} failed:`, err);
      lastError = err;
      if (attempt < maxRetries) {
        // Jittered delay
        const delayMs = 600 + Math.floor(Math.random() * 401);
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }

  // If we exhausted all attempts, throw
  throw lastError;
}

// Helper function to parse out the actual string
function getUrlString(urlOrRequest) {
  if (typeof urlOrRequest === 'string') {
    return urlOrRequest;
  }
  if (urlOrRequest && typeof urlOrRequest.url === 'string') {
    return urlOrRequest.url;
  }

  try {
    return `${urlOrRequest}`;
  } catch (error) {
    throw new Error(`Could not extract URL string from: ${urlOrRequest}`, error);
  }
}
