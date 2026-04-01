const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";
const DB_NAME = process.env.DB_NAME || process.env.MONGO_DB || "stem_steam_education";
const DEFAULT_INPUT_CANDIDATES = ["migration-full", "exports", "migration-input"];

function resolveInputDir(cliArg) {
  if (cliArg) {
    const explicitPath = path.resolve(process.cwd(), cliArg);
    if (!fs.existsSync(explicitPath) || !fs.statSync(explicitPath).isDirectory()) {
      throw new Error(`Input directory not found: ${explicitPath}`);
    }
    return explicitPath;
  }

  for (const candidate of DEFAULT_INPUT_CANDIDATES) {
    const candidatePath = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
      return candidatePath;
    }
  }

  throw new Error(
    `No input directory found. Expected one of: ${DEFAULT_INPUT_CANDIDATES.join(", ")}`
  );
}

function looksLikeObjectId(value) {
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
}

function looksLikeIsoDate(value) {
  if (typeof value !== "string") return false;
  // Matches YYYY-MM-DDTHH:mm:ss(.sss)?(Z|+07:00|-05:00)?
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})?$/.test(
    value
  );
}

function normalizeForMongo(value, keyName = "") {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForMongo(item));
  }

  if (value && typeof value === "object") {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = normalizeForMongo(child, key);
    }
    return output;
  }

  if (typeof value === "string") {
    if ((keyName === "_id" || /Id$/i.test(keyName)) && looksLikeObjectId(value)) {
      return new ObjectId(value);
    }

    if (looksLikeIsoDate(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return value;
}

function getJsonImportFiles(inputDir) {
  return fs
    .readdirSync(inputDir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !["collections.json", "counts.json"].includes(name))
    .sort();
}

function getCollectionName(fileName) {
  if (fileName.endsWith(".sample.json")) {
    return fileName.replace(".sample.json", "");
  }
  return fileName.replace(".json", "");
}

async function importFile(db, inputDir, fileName) {
  const fullPath = path.join(inputDir, fileName);
  const collectionName = getCollectionName(fileName);
  const raw = fs.readFileSync(fullPath, "utf8");
  const parsed = JSON.parse(raw);
  const docs = Array.isArray(parsed) ? parsed : [parsed];
  const normalized = normalizeForMongo(docs);

  await db.collection(collectionName).deleteMany({});
  if (normalized.length > 0) {
    await db.collection(collectionName).insertMany(normalized, { ordered: false });
  }

  return { collectionName, count: normalized.length };
}

async function main() {
  const cliInputDir = process.argv[2];
  const inputDir = resolveInputDir(cliInputDir);
  const files = getJsonImportFiles(inputDir);

  if (files.length === 0) {
    throw new Error(`No JSON data files found in: ${inputDir}`);
  }

  console.log(`Mongo URI: ${MONGO_URI}`);
  console.log(`Database: ${DB_NAME}`);
  console.log(`Input directory: ${inputDir}`);
  console.log(`Collections to import: ${files.length}`);

  const client = new MongoClient(MONGO_URI);
  await client.connect();

  try {
    const db = client.db(DB_NAME);
    for (const fileName of files) {
      const { collectionName, count } = await importFile(db, inputDir, fileName);
      console.log(`Imported ${collectionName}: ${count} documents`);
    }
    console.log("Import completed.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Import failed:", error.message);
  process.exit(1);
});
