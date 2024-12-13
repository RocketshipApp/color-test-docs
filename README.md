# Pizza Pets & Color-Test Collection APIs

Welcome to the repository for the **Pizza Pets** and **Color-Test** collection APIs, which demonstrate dynamic and evolving Ordinal collections. These systems are part of a research and development effort behind the **[Pizza Pets](https://pizzapets.fun)** game, where in-game pets evolve over time based on Bitcoin block events.

## Overview

- **Color-Test (Proof-of-Concept)**:  
  A POC demonstrating how ordinals can be dynamically reassigned to collections (e.g., "red", "green", "blue") as the Bitcoin blockchain advances. Each new block may change the color and thus the grouping of ordinals. This serves as a simple example of real-time collection updates tied to the blockchain state.

- **Pizza Pets**:  
  A collection that evolves more intricately than just changing colors. Pets can grow, change attributes, and even die based on the logic encoded within their ordinals. As the block height increases, the set of live pets may shrink or change, reflecting the progress of the game’s storyline and logic.

## Documentation

- **Color-Test API Documentation**:  
  See [COLOR_TEST.md](./COLOR_TEST.md) for detailed information about how to fetch the color-based collections, handle pagination, track block heights, and integrate with external marketplaces.

- **Pizza Pets API Documentation**:  
  See [PIZZA_PETS.md](./PIZZA_PETS.md) for an overview of the Pizza Pets collection, how to query the evolving list of pets, handle marketplace-specific parameters, and continuously synchronize your displayed data with the latest block state.

## Additional Resources

- **Game Homepage**:  
  Visit [Pizza Pets](https://pizzapets.fun) to learn more about the game’s vision, mechanics, and upcoming features.

We hope these APIs and documentation help you integrate dynamic, block-height-driven collections into your marketplace or tooling. Stay tuned for more updates and improvements as Pizza Pets evolves from proof-of-concept into a full-fledged experience.
