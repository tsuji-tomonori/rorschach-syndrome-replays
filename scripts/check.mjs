import fs from "node:fs";
import path from "node:path";
import { loadWorkMarkdown } from "./content.mjs";
import { works } from "./works.mjs";

const root = process.cwd();
const failures = [];
const slugs = works.map((work) => work.slug);
const pages = [
  "dist/index.html",
  ...slugs.map((slug) => "dist/replays/" + slug + "/index.html")
];
const chapterHeading = /^(?:第[一二三四五六七八九十百0-9]+章|序章|終章|エピローグ)$/u;
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
const expectedOverlays = {
  ayumiya: { "03.md": "第三章", "04.md": "第四章", "05.md": "第五章" },
  eclaire: {
    "01.md": "第一章", "02.md": "第二章", "03.md": "第三章",
    "04.md": "第四章", "05.md": "第五章", "06.md": "エピローグ"
  },
  eriburi: {
    "01.md": "第一章", "02.md": "第二章", "03.md": "第三章",
    "04.md": "第四章", "05.md": "エピローグ"
  },
  fukeizai: {
    "01.md": "第一章", "02.md": "第二章", "03.md": "第三章",
    "04.md": "第四章", "05.md": "第五章"
  },
  miratoto: { "03.md": "第三章", "04.md": "第四章", "05.md": "第五章" },
  ririkaza: { "05.md": "第五章" },
  rumufo: {
    "01.md": "第一章", "02.md": "第二章", "03.md": "第三章",
    "04.md": "第四章", "05.md": "第五章"
  },
  yukiyama: { "05.md": "第五章" }
};

function formatTimestamp(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
    : minutes + ":" + String(seconds).padStart(2, "0");
}

function extractChapter(markdown, title) {
  const headings = [...markdown.matchAll(/^## (.+)$/gmu)];
  const index = headings.findIndex((match) => match[1] === title);
  if (index < 0) return "";
  const start = headings[index].index;
  const nextHeading = headings[index + 1]?.index ?? markdown.length;
  const audit = markdown.indexOf("\n---\n\n### 照合記録", start);
  const end = audit >= 0 ? Math.min(nextHeading, audit) : nextHeading;
  return markdown.slice(start, end).trim();
}

function dialogueCount(markdown) {
  return [...markdown.matchAll(/^「/gmu)].length;
}

function listHtmlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listHtmlFiles(entryPath) : [entryPath];
  }).filter((file) => file.endsWith(".html"));
}

let overlayCount = 0;

for (const work of works) {
  const { slug } = work;
  const basePath = path.join(root, "content", work.file);
  const baseMarkdown = fs.readFileSync(basePath, "utf8");
  const markdown = loadWorkMarkdown(root, work);
  const headings = [...markdown.matchAll(/^## (.+)$/gmu)].map((match) => match[1]);

  if (headings.join("\n") !== Object.keys(work.chapterStarts).join("\n")) {
    failures.push("content/" + work.file + ": chapter headings do not match timestamp metadata");
  }
  for (const heading of headings) {
    if (!chapterHeading.test(heading)) {
      failures.push("content/" + work.file + ": non-chapter ## heading: " + heading);
    }
  }
  for (const match of markdown.matchAll(/^### (.+)$/gmu)) {
    if (match[1] !== "登場人物" && match[1] !== "照合記録") {
      failures.push("content/" + work.file + ": spoiler-prone subheading: " + match[1]);
    }
  }
  if (/詳細会話記録|reading-mode-switch|dialogue-record|session-speech:start|セリフ統合検査/u.test(markdown)) {
    failures.push("content/" + work.file + ": obsolete transcript or generated-weave content remains");
  }

  const overlayDirectory = path.join(root, "content", "chapters", slug);
  const expected = expectedOverlays[slug] || {};
  const actualFiles = fs.existsSync(overlayDirectory)
    ? fs.readdirSync(overlayDirectory).filter((file) => file.endsWith(".md")).sort()
    : [];
  const expectedFiles = Object.keys(expected).sort();
  if (actualFiles.join("\n") !== expectedFiles.join("\n")) {
    failures.push("content/chapters/" + slug + ": overlay files differ from the reviewed set");
  }

  for (const [file, title] of Object.entries(expected)) {
    overlayCount += 1;
    const relative = path.join("content", "chapters", slug, file);
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) {
      failures.push(relative + ": missing");
      continue;
    }
    const overlay = fs.readFileSync(absolute, "utf8").trim();
    const overlayHeadings = [...overlay.matchAll(/^## (.+)$/gmu)];
    if (overlayHeadings.length !== 1 || overlayHeadings[0]?.[1] !== title) {
      failures.push(relative + ": expected one heading named " + title);
    }
    if (/^\[\d{1,2}:\d{2}(?::\d{2})?\]/mu.test(overlay)
        || /^(?:GM|DL|PL|KP|PC|NPC|進行役|ゲームマスター)[：:]/gmu.test(overlay)) {
      failures.push(relative + ": transcript formatting leaked into the novel chapter");
    }
    if (/詳細会話記録|session-speech:start|セリフ統合検査/u.test(overlay)) {
      failures.push(relative + ": obsolete transcript or generated-weave marker remains");
    }
    const baseChapter = extractChapter(baseMarkdown, title);
    const assembledChapter = extractChapter(markdown, title);
    if (!baseChapter) failures.push(relative + ": matching base chapter missing");
    if (assembledChapter !== overlay) failures.push(relative + ": overlay was not applied exactly");
    if (dialogueCount(overlay) < dialogueCount(baseChapter) + 3) {
      failures.push(relative + ": dialogue coverage did not materially increase");
    }
  }

  const speechPath = path.join(root, "sources", "session-speech", slug + ".json");
  if (!fs.existsSync(speechPath)) {
    failures.push("sources/session-speech/" + slug + ".json: missing");
    continue;
  }
  const speech = JSON.parse(fs.readFileSync(speechPath, "utf8"));
  const expectedStart = Math.min(...Object.values(work.chapterStarts));
  if (speech.version !== 1) failures.push("sources/session-speech/" + slug + ".json: unsupported version");
  if (speech.slug !== slug) failures.push("sources/session-speech/" + slug + ".json: slug mismatch");
  if (speech.videoId !== work.videoId) failures.push("sources/session-speech/" + slug + ".json: video ID mismatch");
  if (speech.range?.start !== expectedStart || speech.range?.end !== work.sessionEnd) {
    failures.push("sources/session-speech/" + slug + ".json: story range mismatch");
  }
  if (speech.source?.type !== "youtube-auto-captions"
      || !/^[a-f0-9]{64}$/.test(speech.source?.sha256 || "")) {
    failures.push("sources/session-speech/" + slug + ".json: source traceability missing");
  }
  const segments = speech.segments || [];
  if (segments.length !== speech.metrics?.retainedSegments || segments.length < 300) {
    failures.push("sources/session-speech/" + slug + ".json: retained speech count is unexpectedly low");
  }
  const sourceAccounted = (speech.metrics?.outsideStoryRange || 0)
    + (speech.metrics?.nonSpeechOnly || 0)
    + (speech.metrics?.exactDuplicates || 0)
    + segments.length;
  if (sourceAccounted !== speech.metrics?.sourceSegments) {
    failures.push("sources/session-speech/" + slug + ".json: source segment accounting mismatch");
  }
  for (const [index, segment] of segments.entries()) {
    if (!Number.isInteger(segment.seconds)
        || segment.seconds < expectedStart
        || segment.seconds >= work.sessionEnd) {
      failures.push("sources/session-speech/" + slug + ".json: segment outside story range at " + index);
      break;
    }
    if (index > 0 && segment.seconds < segments[index - 1].seconds) {
      failures.push("sources/session-speech/" + slug + ".json: segments are not chronological");
      break;
    }
    if (segment.timestamp !== formatTimestamp(segment.seconds)) {
      failures.push("sources/session-speech/" + slug + ".json: timestamp mismatch at " + index);
      break;
    }
    if (!segment.text?.trim()
        || /\[(?:音楽|笑い|拍手|咳|咳払い|鼻息|叫び声|歓声|ため息|息をのむ音|うめき声|無音|効果音)\]/u.test(segment.text)) {
      failures.push("sources/session-speech/" + slug + ".json: empty or non-speech segment at " + index);
      break;
    }
    if (index > 0 && segment.text === segments[index - 1].text) {
      failures.push("sources/session-speech/" + slug + ".json: consecutive duplicate at " + index);
      break;
    }
  }
  const chapterEntries = Object.entries(work.chapterStarts);
  for (const [index, [title, start]] of chapterEntries.entries()) {
    const end = chapterEntries[index + 1]?.[1] ?? work.sessionEnd;
    if (!segments.some((segment) => segment.seconds >= start && segment.seconds < end)) {
      failures.push("sources/session-speech/" + slug + ".json: no speech retained for " + title);
    }
  }

  const htmlPath = path.join(root, "dist", "replays", slug, "index.html");
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    if (/詳細会話記録|reading-mode-switch|dialogue-record|dialogue-segment/u.test(html)) {
      failures.push("dist/replays/" + slug + "/index.html: obsolete transcript UI remains");
    }
    const chapterLinks = [...html.matchAll(/class="chapter-video-link"/gu)].length;
    const tocVideoLinks = [...html.matchAll(/class="toc-video-link"/gu)].length;
    if (chapterLinks !== headings.length) {
      failures.push("dist/replays/" + slug + "/index.html: expected " + headings.length
        + " chapter video links, found " + chapterLinks);
    }
    if (tocVideoLinks !== headings.length) {
      failures.push("dist/replays/" + slug + "/index.html: expected " + headings.length
        + " TOC video links, found " + tocVideoLinks);
    }
    const readTargets = [...html.matchAll(/<a class="chapter-video-link"[^>]*href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})&amp;t=(\d+)s"/gu)]
      .map((match) => match[1] + ":" + match[2]);
    const tocTargets = [...html.matchAll(/<a class="toc-video-link"[^>]*href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})&amp;t=(\d+)s"/gu)]
      .map((match) => match[1] + ":" + match[2]);
    if (readTargets.join(",") !== tocTargets.join(",")) {
      failures.push("dist/replays/" + slug + "/index.html: reader and TOC timestamp links differ");
    }
    const startSeconds = readTargets.map((target) => Number(target.split(":")[1]));
    if (startSeconds.some((seconds, index) => index > 0 && seconds <= startSeconds[index - 1])) {
      failures.push("dist/replays/" + slug + "/index.html: chapter timestamps are not chronological");
    }
    for (const match of html.matchAll(/<a class="(?:chapter-video-link|toc-video-link)"([^>]+)>/gu)) {
      if (!/href="https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}&amp;t=\d+s"/.test(match[1])) {
        failures.push("dist/replays/" + slug + "/index.html: invalid YouTube timestamp URL");
      }
      if (!match[1].includes('target="_blank"') || !match[1].includes('rel="noreferrer"')) {
        failures.push("dist/replays/" + slug + "/index.html: unsafe external chapter link");
      }
    }
  }
}

const actualHtmlPages = listHtmlFiles(path.join(root, "dist"))
  .map((file) => path.relative(root, file))
  .sort();
if (actualHtmlPages.join("\n") !== [...pages].sort().join("\n")) {
  failures.push("dist: expected exactly " + pages.length + " public HTML pages, found " + actualHtmlPages.length);
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
    if (html.includes("詳細会話記録")) failures.push(file + ": obsolete transcript copy remains");
    for (const phrase of spoilerPronePromotionalPhrases) {
      if (html.includes(phrase)) failures.push(file + ": spoiler-prone promotional phrase: " + phrase);
    }
    const cardDescriptions = [...html.matchAll(/<p class="lead">([^<]+)<\/p>/gu)].map((match) => match[1]);
    if (cardDescriptions.length !== slugs.length) failures.push(file + ": unexpected work card description count");
    if (cardDescriptions.some((value) => value !== neutralCardDescription)) {
      failures.push(file + ": work card descriptions must remain content-neutral");
    }
  }
}

for (const asset of ["dist/assets/styles.css", "dist/assets/app.js", "dist/.nojekyll"]) {
  if (!fs.existsSync(path.join(root, asset))) failures.push(asset + ": missing");
}
const cssPath = path.join(root, "dist", "assets", "styles.css");
if (fs.existsSync(cssPath)
    && /reading-mode-switch|dialogue-record|dialogue-segment|dialogue-speaker/u.test(fs.readFileSync(cssPath, "utf8"))) {
  failures.push("dist/assets/styles.css: obsolete transcript styles remain");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Validated " + pages.length + " novel pages, " + overlayCount
  + " dialogue-rich chapter overlays, internal speech sources, and shared assets");
