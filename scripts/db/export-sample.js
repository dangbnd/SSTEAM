const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/";
const dbName = process.env.DB_NAME || process.env.MONGO_DB || "stem_steam_education";

(async () => {
  const outDir = path.join(process.cwd(), process.argv[2] || "migration-input");
  fs.mkdirSync(outDir, { recursive: true });

  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(dbName);
  const cols = (await db.listCollections().toArray()).map((c) => c.name).sort();

  const counts = {};

  for (const name of cols) {
    counts[name] = await db.collection(name).countDocuments();
    const sample = await db.collection(name).find({}).limit(20).toArray();
    fs.writeFileSync(
      path.join(outDir, `${name}.sample.json`),
      JSON.stringify(sample, null, 2),
      "utf8"
    );
    console.log(`Exported sample: ${name}`);
  }

  fs.writeFileSync(path.join(outDir, "collections.json"), JSON.stringify(cols, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "counts.json"), JSON.stringify(counts, null, 2), "utf8");

  await client.close();
  console.log("Done. Output folder: migration-input");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
