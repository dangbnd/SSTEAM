const fs = require("fs");
const path = require("path");
const { once } = require("events");
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/";
const dbName = process.env.DB_NAME || process.env.MONGO_DB || "stem_steam_education";

async function exportCollection(db, name, outDir) {
  const filePath = path.join(outDir, `${name}.json`);
  const ws = fs.createWriteStream(filePath, { encoding: "utf8" });

  ws.write("[\n");
  let first = true;
  let count = 0;

  const cursor = db.collection(name).find({}, { noCursorTimeout: true }).batchSize(500);

  for await (const doc of cursor) {
    const line = JSON.stringify(doc);
    ws.write(first ? line : `,\n${line}`);
    first = false;
    count += 1;

    if (count % 1000 === 0) {
      console.log(`  ${name}: ${count}`);
    }
  }

  ws.write("\n]\n");
  ws.end();
  await once(ws, "finish");

  return count;
}

(async () => {
  const outDir = path.join(process.cwd(), process.argv[2] || "migration-full");
  fs.mkdirSync(outDir, { recursive: true });

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const collections = (await db.listCollections().toArray())
    .map((c) => c.name)
    .sort();

  fs.writeFileSync(
    path.join(outDir, "collections.json"),
    JSON.stringify(collections, null, 2),
    "utf8"
  );

  const counts = {};

  for (const name of collections) {
    console.log(`Exporting: ${name}`);
    const count = await exportCollection(db, name, outDir);
    counts[name] = count;
    console.log(`Done: ${name} (${count})`);
  }

  fs.writeFileSync(
    path.join(outDir, "counts.json"),
    JSON.stringify(counts, null, 2),
    "utf8"
  );

  await client.close();
  console.log("Export full done.");
  console.log(`Output folder: ${outDir}`);
})().catch((err) => {
  console.error("Export failed:", err.message);
  process.exit(1);
});
