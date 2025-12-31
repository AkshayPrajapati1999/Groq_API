require("dotenv").config();
const Groq = require("groq-sdk");
const { inferIntent } = require("./intent");
const { addIntent } = require("./storage");

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error("Missing GROQ_API_KEY. Set it in .env or your environment.");
  process.exit(1);
}

const groq = new Groq({ apiKey });

async function routeQuery(userQuery, userId = null, brandId = null) {
  let brandData = null;
  if (brandId && userId) {
    try {
      const { getBrandById } = require("./authStorage");
      brandData = await getBrandById(brandId);
      if (brandData && brandData.user_id !== userId) {
        brandData = null; // Security: ensure brand belongs to user
      }
    } catch (err) {
      console.error("Error fetching brand data:", err);
    }
  }

  const result = await inferIntent(groq, userQuery, brandData);

  if (result.intent === "create" || result.intent === "schedule") {
    const id = await addIntent(result.intent, result, userId, brandId);
    result.id = id;
    result.brandId = brandId;
    return result;
  } else {
    throw new Error(`Unable to resolve intent (got "${result.intent}") for: ${userQuery}`);
  }
}

async function main() {
  const userQuery =
    process.argv.slice(2).join(" ") || "schedule a kickoff meeting tomorrow at 10am";

  try {
    const result = await routeQuery(userQuery);
    console.log(`[${new Date().toISOString()}] intent=${result.intent}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { routeQuery };
