import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import { works } from "./works.mjs";

const root = process.cwd();
const out = path.join(root, "dist");
const base = "/";
const workDescription = "配信セッションをもとに構成したリプレイ小説。";

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripInline(value) {
  return value
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[\*_\\x60~]/g, "")
    .trim();
}

function slugify(text, seen) {
  const candidate = stripInline(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "") || "section";
  const count = seen.get(candidate) || 0;
  seen.set(candidate, count + 1);
  return count ? candidate + "-" + (count + 1) : candidate;
}

function formatTimestamp(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
    : minutes + ":" + String(seconds).padStart(2, "0");
}

function timestampUrl(videoId, seconds) {
  return "https://www.youtube.com/watch?v=" + videoId + "&t=" + seconds + "s";
}

function loadDialogue(work) {
  const dialoguePath = path.join(root, "content", "dialogue", work.slug + ".json");
  const document = JSON.parse(fs.readFileSync(dialoguePath, "utf8"));
  if (document.slug !== work.slug || document.videoId !== work.videoId) {
    throw new Error(work.slug + ": dialogue source does not match work catalog");
  }
  return document;
}

function groupDialogue(work, dialogue) {
  const chapters = Object.entries(work.chapterStarts);
  return chapters.map(([title, start], index) => {
    const end = chapters[index + 1]?.[1] ?? work.dialogueEnd;
    return {
      title,
      start,
      end,
      segments: dialogue.segments.filter((segment) => segment.seconds >= start && segment.seconds < end)
    };
  });
}

function renderMarkdown(markdown, work) {
  const toc = [];
  const seen = new Map();
  const unusedChapterStarts = new Set(Object.keys(work.chapterStarts));
  const marked = new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const plain = stripInline(tokens.map((token) => token.raw || token.text || "").join(""));
        const id = slugify(plain, seen);
        const isChapter = /^(?:第[一二三四五六七八九十百0-9]+章|序章|終章|エピローグ)$/.test(plain);
        const isCast = depth === 3 && plain === "登場人物";
        let chapterVideo = "";
        let seconds;
        if (depth === 2 && isChapter) {
          seconds = work.chapterStarts[plain];
          if (!Number.isInteger(seconds) || seconds < 0) {
            throw new Error(work.slug + ": chapter timestamp missing for " + plain);
          }
          unusedChapterStarts.delete(plain);
          const timestamp = formatTimestamp(seconds);
          const href = escapeHtml(timestampUrl(work.videoId, seconds));
          chapterVideo = '<a class="chapter-video-link" href="' + href
            + '" target="_blank" rel="noreferrer" aria-label="' + escapeHtml(plain)
            + 'を動画の' + timestamp + 'から見る"><span aria-hidden="true">▶</span>'
            + '<span>動画で見る</span><time datetime="PT' + seconds + 'S">' + timestamp + "</time></a>";
        }
        if ((depth === 2 && isChapter) || isCast) toc.push({ depth, text: plain, id, seconds });
        return "<h" + depth + ' id="' + id + '"' + (chapterVideo ? ' class="chapter-heading"' : "") + '>'
          + (chapterVideo ? '<span class="chapter-title">' + inner + "</span>" : inner)
          + chapterVideo
          + '<a class="heading-anchor" href="#' + id + '" aria-label="'
          + escapeHtml(plain) + 'へのリンク">#</a></h' + depth + ">";
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        return '<a href="' + escapeHtml(href) + '"'
          + (title ? ' title="' + escapeHtml(title) + '"' : "")
          + (external ? ' target="_blank" rel="noreferrer"' : "")
          + ">" + text + "</a>";
      }
    }
  });
  const html = marked.parse(markdown);
  if (unusedChapterStarts.size) {
    throw new Error(work.slug + ": chapter timestamp has no matching heading: "
      + [...unusedChapterStarts].join(", "));
  }
  return { html, toc };
}

function shell(options) {
  const notice = [
    '<aside class="site-notice" aria-label="作品についての注意">',
    '  <p><strong>AI制作</strong><span>本サイトのリプレイ小説と文章構成は、配信内容をもとに生成AIを用いて制作しています。</span></p>',
    '  <p><strong>ネタバレ注意</strong><span>原作シナリオ『ロールシャッハシンドローム』の重大なネタバレを含みます。</span></p>',
    '</aside>'
  ].join("\n");
  return [
    "<!doctype html>",
    '<html lang="ja" data-theme="paper">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <meta name="description" content="' + escapeHtml(options.description) + '">',
    '  <meta name="theme-color" content="#151312">',
    '  <meta property="og:title" content="' + escapeHtml(options.title) + '">',
    '  <meta property="og:description" content="' + escapeHtml(options.description) + '">',
    '  <meta property="og:type" content="website">',
    "  <title>" + escapeHtml(options.title) + "</title>",
    '  <link rel="stylesheet" href="' + base + 'assets/styles.css">',
    "  <script>document.documentElement.dataset.theme=localStorage.getItem('replay-theme')||'paper'</script>",
    "</head>",
    '<body class="' + (options.pageClass || "") + '" style="--accent:' + (options.accent || "#a43d4b") + '">',
    '  <a class="skip-link" href="#main">本文へ移動</a>',
    notice,
    options.body,
    '  <script src="' + base + 'assets/app.js" defer></script>',
    "</body>",
    "</html>"
  ].join("\n");
}

function card(work, index) {
  return [
    '<article class="work-card" style="--card-accent:' + work.accent + '">',
    '  <a href="' + base + "replays/" + work.slug + '/" aria-label="' + escapeHtml(work.label) + 'を読む">',
    '    <span class="work-number">' + String(index + 1).padStart(2, "0") + "</span>",
    '    <div class="card-ink" aria-hidden="true"></div>',
    '    <p class="eyebrow">Replay novel</p>',
    "    <h2>" + work.label + "</h2>",
    '    <p class="cast">' + work.cast + "</p>",
    '    <p class="lead">' + workDescription + "</p>",
    '    <span class="read-link">作品を読む <span aria-hidden="true">→</span></span>',
    "  </a>",
    "</article>"
  ].join("\n");
}

function homePage() {
  const body = [
    '<header class="site-header">',
    '  <a class="brand" href="' + base + '"><span class="brand-mark" aria-hidden="true"></span><span>Rorschach Syndrome</span></a>',
    '  <button class="theme-toggle" type="button" data-theme-toggle aria-label="表示テーマを切り替える"><span aria-hidden="true">◐</span></button>',
    "</header>",
    '<main id="main">',
    '  <section class="hero">',
    '    <div class="hero-blot" aria-hidden="true"><i></i><i></i><i></i></div>',
    '    <p class="eyebrow">Emoklore TRPG replay collection</p>',
    "    <h1>九つのセッションを、<br><em>リプレイ小説</em>で読む。</h1>",
    '    <p class="hero-copy">エモクロアTRPG『ロールシャッハシンドローム』。<br>九つのリプレイ小説と、時刻付きの詳細会話記録。</p>',
    '    <a class="hero-cta" href="#works">作品を選ぶ <span aria-hidden="true">↓</span></a>',
    "  </section>",
    '  <section class="collection" id="works" aria-labelledby="works-title">',
    '    <div class="section-heading"><p class="eyebrow">Replay collection</p><h2 id="works-title">収録作品</h2><p>九つのセッションを、それぞれ一篇のリプレイ小説として収録しています。</p></div>',
    '    <div class="work-grid">' + works.map(card).join("") + "</div>",
    "  </section>",
    '  <section class="about"><div><p class="eyebrow">About</p><h2>セッションの声を、<br>読み物の時間へ。</h2></div><p>小説版では、実際のセッションで交わされた台詞を軸に、場面の空気や間、視線や心の動きを地の文として編み直しています。詳細会話記録では、物語開始からセッション終了までの発話を時刻順に残し、判定や進行上の会話を含めて元動画へ遡れます。</p></section>',
    "</main>",
    '<footer class="site-footer"><p>原作シナリオ：ディズム『ロールシャッハシンドローム』</p><p>Unofficial replay novel collection</p></footer>'
  ].join("\n");
  return shell({
    title: "ロールシャッハ・シンドローム｜リプレイ小説集",
    description: "配信内容をもとに生成AIを用いて制作した、エモクロアTRPG『ロールシャッハシンドローム』のリプレイ小説集。原作シナリオのネタバレを含みます。",
    body,
    pageClass: "home"
  });
}

function readingModeSwitch(work, mode, segmentCount) {
  const novelUrl = base + "replays/" + work.slug + "/";
  const dialogueUrl = novelUrl + "dialogue/";
  const novel = mode === "novel"
    ? '<span aria-current="page">小説版</span>'
    : '<a href="' + novelUrl + '">小説版</a>';
  const dialogue = mode === "dialogue"
    ? '<span aria-current="page">詳細会話記録 <small>' + segmentCount + "件</small></span>"
    : '<a href="' + dialogueUrl + '">詳細会話記録 <small>' + segmentCount + "件</small></a>";
  return '<nav class="reading-mode-switch" aria-label="表示内容">' + novel + dialogue + "</nav>";
}

function readerPage(work, index, rendered, dialogue) {
  const previous = works[(index - 1 + works.length) % works.length];
  const next = works[(index + 1) % works.length];
  const toc = rendered.toc.map((item) => {
    const videoLink = Number.isInteger(item.seconds)
      ? '<a class="toc-video-link" href="' + escapeHtml(timestampUrl(work.videoId, item.seconds))
        + '" target="_blank" rel="noreferrer" aria-label="' + escapeHtml(item.text)
        + 'を動画の' + formatTimestamp(item.seconds) + 'から見る"><span aria-hidden="true">▶</span>'
        + formatTimestamp(item.seconds) + "</a>"
      : "";
    return '<li class="toc-depth-' + item.depth + '"><a class="toc-section-link" href="#' + item.id + '">'
      + escapeHtml(item.text) + "</a>" + videoLink + "</li>";
  }).join("");
  const body = [
    '<div class="reading-progress" data-progress aria-hidden="true"></div>',
    '<header class="reader-header">',
    '  <a class="brand" href="' + base + '"><span class="brand-mark" aria-hidden="true"></span><span>Replay Collection</span></a>',
    '  <div class="reader-tools" aria-label="表示設定">',
    '    <button type="button" data-font="down" aria-label="文字を小さくする">A−</button>',
    '    <button type="button" data-font="up" aria-label="文字を大きくする">A＋</button>',
    '    <button class="theme-toggle" type="button" data-theme-toggle aria-label="表示テーマを切り替える">◐</button>',
    '    <button class="toc-toggle" type="button" data-toc-toggle aria-expanded="false" aria-controls="reader-toc">目次</button>',
    "  </div>",
    "</header>",
    '<div class="reader-layout">',
    '  <aside class="reader-toc" id="reader-toc"><p class="eyebrow">Contents</p><h2>' + escapeHtml(work.label) + "</h2><ol>" + toc + '</ol><a class="back-link" href="' + base + '">← 作品一覧へ</a></aside>',
    '  <main id="main" class="novel-wrap">',
    '    <div class="novel-kicker"><span>' + String(index + 1).padStart(2, "0") + " / " + String(works.length).padStart(2, "0") + "</span><span>" + escapeHtml(work.label) + "</span></div>",
    "    " + readingModeSwitch(work, "novel", dialogue.segments.length),
    '    <article class="novel" data-novel>' + rendered.html + "</article>",
    '    <nav class="story-nav" aria-label="作品間ナビゲーション"><a href="' + base + "replays/" + previous.slug + '/"><span>前の作品</span><strong>← ' + previous.label + '</strong></a><a href="' + base + "replays/" + next.slug + '/"><span>次の作品</span><strong>' + next.label + " →</strong></a></nav>",
    "  </main>",
    "</div>"
  ].join("\n");
  return shell({
    title: work.label + "｜ロールシャッハ・シンドローム",
    description: work.label + "。配信内容をもとに生成AIを用いて制作した、エモクロアTRPG『ロールシャッハシンドローム』のリプレイ小説。原作シナリオのネタバレを含みます。",
    body,
    pageClass: "reader",
    accent: work.accent
  });
}

function dialoguePage(work, index, dialogue) {
  const chapters = groupDialogue(work, dialogue);
  const chapterNavigation = chapters.map((chapter, chapterIndex) => (
    '<li><a href="#dialogue-chapter-' + (chapterIndex + 1) + '"><span>'
    + escapeHtml(chapter.title) + "</span><small>" + chapter.segments.length + "件</small></a></li>"
  )).join("");
  const chapterSections = chapters.map((chapter, chapterIndex) => {
    const entries = chapter.segments.map((segment, segmentIndex) => {
      const itemId = "dialogue-" + (chapterIndex + 1) + "-" + (segmentIndex + 1);
      return '<li id="' + itemId + '"><a class="dialogue-time" href="'
        + escapeHtml(timestampUrl(work.videoId, segment.seconds))
        + '" target="_blank" rel="noreferrer" aria-label="動画の' + escapeHtml(segment.timestamp)
        + 'から確認する"><span aria-hidden="true">▶</span><time datetime="PT' + segment.seconds + 'S">'
        + escapeHtml(segment.timestamp) + "</time></a><p>" + escapeHtml(segment.text) + "</p></li>";
    }).join("");
    return '<details class="dialogue-chapter" id="dialogue-chapter-' + (chapterIndex + 1) + '"'
      + (chapterIndex === 0 ? " open" : "") + '><summary><span>' + escapeHtml(chapter.title)
      + '</span><small><time datetime="PT' + chapter.start + 'S">' + formatTimestamp(chapter.start)
      + '</time>から・' + chapter.segments.length + '件</small></summary><ol class="dialogue-list">'
      + entries + "</ol></details>";
  }).join("");
  const body = [
    '<header class="reader-header">',
    '  <a class="brand" href="' + base + '"><span class="brand-mark" aria-hidden="true"></span><span>Replay Collection</span></a>',
    '  <div class="reader-tools" aria-label="表示設定">',
    '    <button type="button" data-font="down" aria-label="文字を小さくする">A−</button>',
    '    <button type="button" data-font="up" aria-label="文字を大きくする">A＋</button>',
    '    <button class="theme-toggle" type="button" data-theme-toggle aria-label="表示テーマを切り替える">◐</button>',
    "  </div>",
    "</header>",
    '<main id="main" class="dialogue-wrap">',
    '  <div class="novel-kicker"><span>' + String(index + 1).padStart(2, "0") + " / " + String(works.length).padStart(2, "0") + "</span><span>" + escapeHtml(work.label) + "</span></div>",
    "  " + readingModeSwitch(work, "dialogue", dialogue.segments.length),
    '  <header class="dialogue-intro"><p class="eyebrow">Detailed dialogue record</p><h1>'
      + escapeHtml(work.label) + 'の詳細会話記録</h1><p>物語が始まってからセッション終了宣言の直前まで、時刻付き自動字幕から<strong>'
      + dialogue.segments.length + "件</strong>の発話を収録しています。</p></header>",
    '  <aside class="dialogue-policy" aria-label="収録方針"><strong>情報量を落とさないための収録方針</strong><p>音楽・笑い・拍手など、言葉ではない字幕だけを除外しています。噛みや言い直しを含む発話は原則として残し、明白な固有名詞の誤認識だけを補正しました。自動字幕由来の誤りが残る箇所は、各時刻から元動画で確認できます。</p></aside>',
    '  <nav class="dialogue-chapter-nav" aria-label="章を選ぶ"><ol>' + chapterNavigation + "</ol></nav>",
    '  <section class="dialogue-record" aria-label="時刻付き会話記録">' + chapterSections + "</section>",
    '  <a class="dialogue-back" href="' + base + "replays/" + work.slug + '/">← 小説版へ戻る</a>',
    "</main>"
  ].join("\n");
  return shell({
    title: work.label + " 詳細会話記録｜ロールシャッハ・シンドローム",
    description: work.label + "。配信内容をもとに生成AIを用いて制作した詳細会話記録。原作シナリオのネタバレを含みます。",
    body,
    pageClass: "dialogue-reader",
    accent: work.accent
  });
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
fs.writeFileSync(path.join(out, "index.html"), homePage());
for (const [index, work] of works.entries()) {
  const markdown = fs.readFileSync(path.join(root, "content", work.file), "utf8");
  const publicMarkdown = markdown.replace(/\n#{2,6} 照合記録[\s\S]*$/, "");
  const rendered = renderMarkdown(publicMarkdown, work);
  const dialogue = loadDialogue(work);
  const directory = path.join(out, "replays", work.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), readerPage(work, index, rendered, dialogue));
  const dialogueDirectory = path.join(directory, "dialogue");
  fs.mkdirSync(dialogueDirectory, { recursive: true });
  fs.writeFileSync(path.join(dialogueDirectory, "index.html"), dialoguePage(work, index, dialogue));
}
for (const asset of ["styles.css", "app.js"]) {
  fs.copyFileSync(path.join(root, "src", asset), path.join(out, "assets", asset));
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log("Built " + (works.length * 2 + 1) + " pages in " + path.relative(root, out));
