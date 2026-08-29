import fs from "node:fs";
import path from "node:path";
import { works } from "./works.mjs";

const root = process.cwd();
const slugs = works.map((work) => work.slug);
const failures = [];
const pages = [
  "dist/index.html",
  ...slugs.map((slug) => "dist/replays/" + slug + "/index.html"),
  ...slugs.map((slug) => "dist/replays/" + slug + "/dialogue/index.html")
];
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

function formatTimestamp(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
    : minutes + ":" + String(seconds).padStart(2, "0");
}

for (const work of works) {
  const { slug } = work;
  const markdownPath = path.join(root, "content", slug + ".md");
  const markdown = fs.readFileSync(markdownPath, "utf8");
  let chapterCount = 0;
  for (const match of markdown.matchAll(/^## (.+)$/gm)) {
    if (!chapterHeading.test(match[1])) failures.push("content/" + slug + ".md: non-chapter ## heading: " + match[1]);
    else chapterCount += 1;
  }
  for (const match of markdown.matchAll(/^### (.+)$/gm)) {
    if (match[1] !== "登場人物" && match[1] !== "照合記録") {
      failures.push("content/" + slug + ".md: spoiler-prone subheading: " + match[1]);
    }
  }
  const htmlPath = path.join(root, "dist/replays", slug, "index.html");
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    if (!html.includes('class="reading-mode-switch"') || !html.includes("詳細会話記録")) {
      failures.push("dist/replays/" + slug + "/index.html: dialogue view switch missing");
    }
    const chapterLinks = [...html.matchAll(/class="chapter-video-link"/g)].length;
    const tocVideoLinks = [...html.matchAll(/class="toc-video-link"/g)].length;
    if (chapterLinks !== chapterCount) {
      failures.push("dist/replays/" + slug + "/index.html: expected " + chapterCount
        + " chapter video links, found " + chapterLinks);
    }
    if (tocVideoLinks !== chapterCount) {
      failures.push("dist/replays/" + slug + "/index.html: expected " + chapterCount
        + " TOC video links, found " + tocVideoLinks);
    }
    const readTargets = [...html.matchAll(/<a class="chapter-video-link"[^>]*href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})&amp;t=(\d+)s"/g)]
      .map((match) => match[1] + ":" + match[2]);
    const tocTargets = [...html.matchAll(/<a class="toc-video-link"[^>]*href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})&amp;t=(\d+)s"/g)]
      .map((match) => match[1] + ":" + match[2]);
    if (readTargets.join(",") !== tocTargets.join(",")) {
      failures.push("dist/replays/" + slug + "/index.html: reader and TOC timestamp links differ");
    }
    const startSeconds = readTargets.map((target) => Number(target.split(":")[1]));
    if (startSeconds.some((seconds, index) => index > 0 && seconds <= startSeconds[index - 1])) {
      failures.push("dist/replays/" + slug + "/index.html: chapter timestamps are not chronological");
    }
    for (const match of html.matchAll(/<a class="(?:chapter-video-link|toc-video-link)"([^>]+)>/g)) {
      if (!/href="https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}&amp;t=\d+s"/.test(match[1])) {
        failures.push("dist/replays/" + slug + "/index.html: invalid YouTube timestamp URL");
      }
      if (!match[1].includes('target="_blank"') || !match[1].includes('rel="noreferrer"')) {
        failures.push("dist/replays/" + slug + "/index.html: unsafe external chapter link");
      }
    }
  }

  const dialoguePath = path.join(root, "content", "dialogue", slug + ".json");
  if (!fs.existsSync(dialoguePath)) {
    failures.push("content/dialogue/" + slug + ".json: missing");
    continue;
  }
  const dialogue = JSON.parse(fs.readFileSync(dialoguePath, "utf8"));
  const expectedStart = Math.min(...Object.values(work.chapterStarts));
  if (dialogue.version !== 1) failures.push("content/dialogue/" + slug + ".json: unsupported version");
  if (dialogue.slug !== slug) failures.push("content/dialogue/" + slug + ".json: slug mismatch");
  if (dialogue.videoId !== work.videoId) failures.push("content/dialogue/" + slug + ".json: video ID mismatch");
  if (dialogue.range?.start !== expectedStart || dialogue.range?.end !== work.dialogueEnd) {
    failures.push("content/dialogue/" + slug + ".json: story range mismatch");
  }
  if (dialogue.source?.type !== "youtube-auto-captions"
      || !/^[a-f0-9]{64}$/.test(dialogue.source?.sha256 || "")) {
    failures.push("content/dialogue/" + slug + ".json: source traceability missing");
  }
  const segments = dialogue.segments || [];
  if (segments.length !== dialogue.metrics?.retainedSegments || segments.length < 300) {
    failures.push("content/dialogue/" + slug + ".json: retained dialogue count is unexpectedly low");
  }
  const accounted = (dialogue.metrics?.outsideStoryRange || 0)
    + (dialogue.metrics?.nonSpeechOnly || 0)
    + (dialogue.metrics?.exactDuplicates || 0)
    + segments.length;
  if (accounted !== dialogue.metrics?.sourceSegments) {
    failures.push("content/dialogue/" + slug + ".json: source segment accounting mismatch");
  }
  for (const [index, segment] of segments.entries()) {
    if (!Number.isInteger(segment.seconds)
        || segment.seconds < expectedStart
        || segment.seconds >= work.dialogueEnd) {
      failures.push("content/dialogue/" + slug + ".json: segment outside story range at " + index);
      break;
    }
    if (index > 0 && segment.seconds < segments[index - 1].seconds) {
      failures.push("content/dialogue/" + slug + ".json: segments are not chronological");
      break;
    }
    if (segment.timestamp !== formatTimestamp(segment.seconds)) {
      failures.push("content/dialogue/" + slug + ".json: timestamp mismatch at " + index);
      break;
    }
    if (!segment.text?.trim() || /\[(?:音楽|笑い|拍手|咳|咳払い|鼻息|叫び声|歓声|ため息|息をのむ音|うめき声|無音|効果音)\]/u.test(segment.text)) {
      failures.push("content/dialogue/" + slug + ".json: empty or non-speech segment at " + index);
      break;
    }
    if (index > 0 && segment.text === segments[index - 1].text) {
      failures.push("content/dialogue/" + slug + ".json: consecutive duplicate at " + index);
      break;
    }
  }
  const chapterEntries = Object.entries(work.chapterStarts);
  for (const [index, [title, start]] of chapterEntries.entries()) {
    const end = chapterEntries[index + 1]?.[1] ?? work.dialogueEnd;
    if (!segments.some((segment) => segment.seconds >= start && segment.seconds < end)) {
      failures.push("content/dialogue/" + slug + ".json: no dialogue retained for " + title);
    }
  }

  const dialogueHtmlPath = path.join(root, "dist", "replays", slug, "dialogue", "index.html");
  if (fs.existsSync(dialogueHtmlPath)) {
    const dialogueHtml = fs.readFileSync(dialogueHtmlPath, "utf8");
    const renderedSegments = [...dialogueHtml.matchAll(/class="dialogue-time"/g)].length;
    if (renderedSegments !== segments.length) {
      failures.push("dist/replays/" + slug + "/dialogue/index.html: expected " + segments.length
        + " dialogue links, found " + renderedSegments);
    }
    if (!dialogueHtml.includes('class="reading-mode-switch"')
        || !dialogueHtml.includes('aria-current="page">詳細会話記録')) {
      failures.push("dist/replays/" + slug + "/dialogue/index.html: dialogue mode not selected");
    }
    if (!dialogueHtml.includes("情報量を落とさないための収録方針")) {
      failures.push("dist/replays/" + slug + "/dialogue/index.html: retention policy missing");
    }
    for (const match of dialogueHtml.matchAll(/<a class="dialogue-time"([^>]+)>/g)) {
      if (!new RegExp('href="https://www\\.youtube\\.com/watch\\?v=' + work.videoId + '&amp;t=\\d+s"').test(match[1])) {
        failures.push("dist/replays/" + slug + "/dialogue/index.html: invalid dialogue timestamp URL");
        break;
      }
      if (!match[1].includes('target="_blank"') || !match[1].includes('rel="noreferrer"')) {
        failures.push("dist/replays/" + slug + "/dialogue/index.html: unsafe dialogue link");
        break;
      }
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
