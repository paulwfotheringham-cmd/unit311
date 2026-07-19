import { readFileSync } from "node:fs";

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv(".env.architecture.tmp");
const copy = env.SUPABASE_URL_TEST_COPY || "";
console.log("copy length", copy.length);
console.log("starts", copy.slice(0, 30));
console.log("looksLikeJson", copy.trim().startsWith("{") || copy.trim().startsWith("["));
console.log("has postgres", /postgres/i.test(copy));
console.log("has supabase", /supabase/i.test(copy));
console.log("has service_role", /service_role/i.test(copy));
console.log("has anon", /anon/i.test(copy));
try {
  const parsed = JSON.parse(copy);
  console.log("json keys", Object.keys(parsed));
} catch {
  console.log("not json");
}
