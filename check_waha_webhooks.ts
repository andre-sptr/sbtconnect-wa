import { getWahaConfig } from "./src/lib/config.js"; // Using .js for tsx compatibility if needed, or just import
import { PrismaClient } from "@prisma/client";

// Mocking config since I can't easily import from src/lib in a simple script without setup
const WAHA_URL = "https://waha-dutxvo095iqn.cgk-lab.sumopod.my.id";
const WAHA_API_KEY = "ROpWNPkTUavqEbnz5zKU4mTiL0HIZoye";

async function main() {
  console.log("Checking WAHA Webhooks...");
  const response = await fetch(`${WAHA_URL}/api/webhooks`, {
    headers: {
      "X-Api-Key": WAHA_API_KEY,
      "Accept": "application/json"
    }
  });
  
  if (response.ok) {
    const json = await response.json();
    console.log("Current Webhooks:", JSON.stringify(json, null, 2));
  } else {
    console.error("Failed to fetch webhooks:", response.status, await response.text());
  }
}

main().catch(console.error);
