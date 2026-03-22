import { readFileSync, writeFileSync } from "node:fs";

const password = process.env.PSSW;

if (!password) {
  console.error("Missing Netlify environment variable: PSSW");
  process.exit(1);
}

const template = readFileSync("_headers.template", "utf8");
const output = template.replace("__PSSW__", password);

writeFileSync("_headers", output, "utf8");
console.log("Generated _headers from _headers.template using PSSW.");
