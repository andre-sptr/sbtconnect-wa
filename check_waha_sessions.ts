const WAHA_URL = "https://waha-dutxvo095iqn.cgk-lab.sumopod.my.id";
const WAHA_API_KEY = "ROpWNPkTUavqEbnz5zKU4mTiL0HIZoye";

async function main() {
  console.log("Checking WAHA Sessions...");
  const response = await fetch(`${WAHA_URL}/api/sessions`, {
    headers: {
      "X-Api-Key": WAHA_API_KEY,
      "Accept": "application/json"
    }
  });
  
  if (response.ok) {
    const json = await response.json();
    console.log("Sessions:", JSON.stringify(json, null, 2));
  } else {
    console.error("Failed to fetch sessions:", response.status, await response.text());
  }
}

main().catch(console.error);
