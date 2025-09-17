import { mkdir, readdir, copyFile, stat } from "fs/promises";
import { join } from "path";
import url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const srcDistGovuk = join(__dirname, "..", "node_modules", "govuk-frontend", "dist", "govuk");
const dstGovuk = join(__dirname, "..", "public", "govuk");
async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  const entries = await readdir(from, { withFileTypes: true });
  for (const e of entries) {
    const f = join(from, e.name), t = join(to, e.name);
    if (e.isDirectory()) await copyDir(f, t); else await copyFile(f, t);
  }
}
(async () => {
  await stat(srcDistGovuk);
  await copyDir(srcDistGovuk, dstGovuk);
  console.log("Copied GOV.UK dist to /public/govuk");
})().catch(err => { console.error("Failed to copy GOV.UK assets:", err); process.exit(1); });
