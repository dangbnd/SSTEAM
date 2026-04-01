const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";
const DB_NAME = process.env.DB_NAME || process.env.MONGO_DB || "stem_steam_education";

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  try {
    const db = client.db(DB_NAME);
    const collections = await db.listCollections().toArray();
    const names = collections.map((item) => item.name).sort();

    console.log(`Database: ${DB_NAME}`);
    console.log(`Collections: ${names.length}`);

    for (const name of names) {
      const count = await db.collection(name).countDocuments();
      console.log(`${name}: ${count}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Database check failed:", error.message);
  process.exit(1);
});
