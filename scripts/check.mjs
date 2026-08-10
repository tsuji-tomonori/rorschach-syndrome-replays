import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const slugs = ["kikaken", "yukiyama", "ririkaza", "ayumiya", "miratoto", "rumufo", "fukeizai"];
const failures = [];
const pages = ["dist/index.html", ...slugs.map((slug) => "dist/replays/" + slug + "/index.html")];
const chapterHeading = /^(?:第[一二三四五六七八九十百0-9]+章|序章|終章|エピローグ)$/;

for (const slug of slugs) {
  const markdownPath = path.join(root, "content", slug + ".md");
  const markdown = fs.readFileSync(markdownPath, "utf8");
  for (const match of markdown.matchAll(/^## (.+)$/gm)) {
    if (!chapterHeading.test(match[1])) failures.push("content/" + slug + ".md: non-chapter ## heading: " + match[1]);
  }
  for (const match of markdown.matchAll(/^### (.+)$/gm)) {
    if (match[1] !== "登場人物" && match[1] !== "照合記録") {
      failures.push("content/" + slug + ".md: spoiler-prone subheading: " + match[1]);
    }
  }
}

for (const file of pages) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    failures.push(file + ": missing");
    continue;
  }
  const html = fs.readFileSync(absolute, "utf8");
  for (const required of ["<!doctype html>", 'lang="ja"', 'id="main"']) {
    if (!html.includes(required)) failures.push(file + ": " + required + " missing");
  }
  if (!html.includes("/rorschach-syndrome-replays/assets/styles.css")) failures.push(file + ": stylesheet missing");
  if (!html.includes("/rorschach-syndrome-replays/assets/app.js")) failures.push(file + ": script missing");
  if (/href="\/replays\//.test(html)) failures.push(file + ": base-path-unsafe link");
}
for (const asset of ["dist/assets/styles.css", "dist/assets/app.js", "dist/.nojekyll"]) {
  if (!fs.existsSync(path.join(root, asset))) failures.push(asset + ": missing");
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Validated " + pages.length + " HTML pages and shared assets");
