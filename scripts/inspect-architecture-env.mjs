import { readFileSync } from "node:fs";

const t = readFileSync(".env.architecture.tmp", "utf8");
for (const line of t.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  const k = line.slice(0, i);
  let v = line.slice(i + 1);
  const quoted =
    (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"));
  if (quoted) v = v.slice(1, -1);
  console.log(
    k,
    "rawLen=" + (line.length - i - 1),
    "valLen=" + v.length,
    "quoted=" + quoted,
  );
}
