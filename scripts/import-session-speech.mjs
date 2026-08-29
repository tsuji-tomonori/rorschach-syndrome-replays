import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { works } from "./works.mjs";

const root = process.cwd();
const sourceDirectory = path.resolve(process.argv[2] || "transcripts");
const outputDirectory = path.join(root, "sources", "session-speech");

const nonSpeech = /\[(?:音楽|笑い|拍手|咳|咳払い|鼻息|叫び声|歓声|ため息|息をのむ音|うめき声|無音|効果音)\]/gu;

const corrections = {
  eclaire: [
    [/Lル/gu, "える"],
    [/\bL(?=さん|ちゃん|は|が|を|も|の|に|と|、|。|\s|$)/gu, "える"],
    [/エル(?=さん|ちゃん)/gu, "える"],
    [/クリア(?=さん|ちゃん)/gu, "クレア"],
    [/ま痺/gu, "まひまひ"],
    [/幸し代|雪代/gu, "雪城"]
  ],
  eriburi: [
    [/一橋彩人/gu, "一橋綾人"],
    [/五木佐京/gu, "五木左京"]
  ],
  fukeizai: [
    [/長尾系/gu, "長尾景"]
  ],
  miratoto: [
    [/ミランケストレル/gu, "ミラン・ケストレル"],
    [/立つて都々|立伝トト/gu, "立伝都々"]
  ],
  ririkaza: [
    [/森中加作/gu, "森中花咲"],
    [/夕日リリ/gu, "夕陽リリ"]
  ],
  rumufo: [
    [/四季なぎ/gu, "四季凪"],
    [/セラフダズルガーデン/gu, "セラフ・ダズルガーデン"]
  ],
  yukiyama: [
    [/山神かるた/gu, "山神カルタ"]
  ]
};

function parseTimestamp(value) {
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function formatTimestamp(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
    : minutes + ":" + String(seconds).padStart(2, "0");
}

function normalize(text, slug, metrics) {
  let value = text.replace(nonSpeech, " ").replace(/\s+/gu, " ").trim();
  for (const [pattern, replacement] of corrections[slug] || []) {
    const matches = value.match(pattern)?.length || 0;
    if (matches) {
      metrics.corrections += matches;
      value = value.replace(pattern, replacement);
    }
  }
  return value;
}

if (!fs.existsSync(sourceDirectory)) {
  throw new Error("Transcript directory not found: " + sourceDirectory);
}

fs.mkdirSync(outputDirectory, { recursive: true });

for (const work of works) {
  const sourcePath = path.join(sourceDirectory, work.slug + ".txt");
  const source = fs.readFileSync(sourcePath, "utf8");
  const start = Math.min(...Object.values(work.chapterStarts));
  const metrics = {
    sourceSegments: 0,
    outsideStoryRange: 0,
    nonSpeechOnly: 0,
    exactDuplicates: 0,
    corrections: 0
  };
  const segments = [];

  for (const line of source.split(/\r?\n/u)) {
    const match = line.match(/^\[([0-9:]+)\]\s*(.*)$/u);
    if (!match) continue;
    metrics.sourceSegments += 1;
    const seconds = parseTimestamp(match[1]);
    if (seconds === null || seconds < start || seconds >= work.sessionEnd) {
      metrics.outsideStoryRange += 1;
      continue;
    }
    const text = normalize(match[2], work.slug, metrics);
    if (!text) {
      metrics.nonSpeechOnly += 1;
      continue;
    }
    if (segments.at(-1)?.text === text) {
      metrics.exactDuplicates += 1;
      continue;
    }
    segments.push({ seconds, timestamp: formatTimestamp(seconds), text });
  }

  if (!segments.length) throw new Error(work.slug + ": no story dialogue was retained");

  const document = {
    version: 1,
    slug: work.slug,
    videoId: work.videoId,
    source: {
      type: "youtube-auto-captions",
      url: "https://www.youtube.com/watch?v=" + work.videoId,
      sha256: crypto.createHash("sha256").update(source).digest("hex")
    },
    range: { start, end: work.sessionEnd },
    metrics: { ...metrics, retainedSegments: segments.length },
    segments
  };

  fs.writeFileSync(
    path.join(outputDirectory, work.slug + ".json"),
    JSON.stringify(document, null, 2) + "\n"
  );
  console.log(work.slug + ": retained " + segments.length + " timed speech segments");
}
