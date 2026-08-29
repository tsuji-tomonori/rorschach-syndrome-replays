import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const slugs = ["kikaken", "yukiyama", "ririkaza", "ayumiya", "miratoto", "rumufo", "fukeizai", "eriburi", "eclaire"];
const failures = [];
const pages = ["dist/index.html", ...slugs.map((slug) => "dist/replays/" + slug + "/index.html")];
const chapterHeading = /^(?:第[一二三四五六七八九十百0-9]+章|序章|終章|エピローグ)$/;
const neutralCardDescription = "配信セッションをもとに構成したリプレイ小説。";
const spoilerPronePromotionalPhrases = [
  "繰り返す一日",
  "同じ一日",
  "同じ山",
  "同じ祠",
  "同じ厄難",
  "一度きりでは終わらない",
  "反復",
  "時間の綻び",
  "反復の核心",
  "命を預ける"
];

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
  if (!html.includes("/assets/styles.css")) failures.push(file + ": stylesheet missing");
  if (!html.includes("/assets/app.js")) failures.push(file + ": script missing");
  if (html.includes("/rorschach-syndrome-replays/")) failures.push(file + ": obsolete repository base path");
  if (!html.includes('class="site-notice"')) failures.push(file + ": site notice missing");
  if (!html.includes("生成AIを用いて制作")) failures.push(file + ": AI disclosure missing");
  if (!html.includes("ネタバレ注意")) failures.push(file + ": spoiler warning missing");
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1] || "";
  if (!description.includes("生成AI")) failures.push(file + ": AI disclosure missing from description");
  if (!description.includes("ネタバレ")) failures.push(file + ": spoiler warning missing from description");
  for (const phrase of spoilerPronePromotionalPhrases) {
    if (description.includes(phrase)) failures.push(file + ": spoiler-prone phrase in description: " + phrase);
  }
  if (file === "dist/index.html") {
    for (const phrase of spoilerPronePromotionalPhrases) {
      if (html.includes(phrase)) failures.push(file + ": spoiler-prone promotional phrase: " + phrase);
    }
    const cardDescriptions = [...html.matchAll(/<p class="lead">([^<]+)<\/p>/g)].map((match) => match[1]);
    if (cardDescriptions.length !== slugs.length) failures.push(file + ": unexpected work card description count");
    if (cardDescriptions.some((value) => value !== neutralCardDescription)) {
      failures.push(file + ": work card descriptions must remain content-neutral");
    }
  }
}
for (const asset of ["dist/assets/styles.css", "dist/assets/app.js", "dist/.nojekyll"]) {
  if (!fs.existsSync(path.join(root, asset))) failures.push(asset + ": missing");
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Validated " + pages.length + " HTML pages and shared assets");
