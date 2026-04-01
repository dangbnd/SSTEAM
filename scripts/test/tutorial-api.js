const PORT = process.env.PORT || "8080";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();

  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    parsed = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    data: parsed,
  };
}

async function main() {
  console.log(`Testing tutorial APIs on: ${BASE_URL}`);

  const featured = await fetchJson(`${BASE_URL}/api/tutorials/featured`);
  console.log(`/api/tutorials/featured -> ${featured.status}`);
  if (featured.ok && Array.isArray(featured.data)) {
    console.log(`featured count: ${featured.data.length}`);
  }

  const tutorials = await fetchJson(`${BASE_URL}/api/tutorials?limit=5`);
  console.log(`/api/tutorials?limit=5 -> ${tutorials.status}`);
  if (tutorials.ok && tutorials.data && Array.isArray(tutorials.data.tutorials)) {
    console.log(`tutorial list count: ${tutorials.data.tutorials.length}`);
  }

  const categories = await fetchJson(`${BASE_URL}/api/tutorial-categories`);
  console.log(`/api/tutorial-categories -> ${categories.status}`);
  if (categories.ok && Array.isArray(categories.data)) {
    console.log(`tutorial categories count: ${categories.data.length}`);
  }
}

main().catch((error) => {
  console.error("Tutorial API test failed:", error.message);
  process.exit(1);
});
