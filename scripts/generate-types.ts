import { compile } from "json-schema-to-typescript";
import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";

const SCHEMA_DIR = join(import.meta.dir, "../schema");
const TYPES_DIR = join(import.meta.dir, "../types");

const files = (await readdir(SCHEMA_DIR)).filter((f) =>
  f.endsWith(".schema.json")
);

for (const file of files) {
  const schemaPath = join(SCHEMA_DIR, file);
  const schema = await Bun.file(schemaPath).json();
  const ts = await compile(schema, schema.title ?? basename(file, ".json"), {
    bannerComment: "",
    additionalProperties: false,
    cwd: SCHEMA_DIR,
  });
  const outName = basename(file, ".schema.json") + ".d.ts";
  await Bun.write(join(TYPES_DIR, outName), ts);
  console.log(`Generated ${outName}`);
}
