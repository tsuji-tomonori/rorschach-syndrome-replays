import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";

const root = process.cwd();
const out = path.join(root, "dist");
const base = "/";
const workDescription = "配信セッションをもとに構成したリプレイ小説。";

const works = [
  {
    slug: "kikaken",
    file: "kikaken.md",
    label: "きかけんシャッハ",
    cast: "リリエル、ルルハリル、メイド",
    accent: "#a43d4b",
    videoId: "yvhap5mNTlU",
    chapterStarts: {
      "第一章": 1234,
      "第二章": 2266,
      "第三章": 2966,
      "第四章": 3620,
      "第五章": 4124,
      "第六章": 5330,
      "第七章": 6322,
      "エピローグ": 6530
    }
  },
  {
    slug: "yukiyama",
    file: "yukiyama.md",
    label: "ゆきやまシャッハ",
    cast: "山神カルタ、雪城眞尋",
    accent: "#406b68",
    videoId: "omlCoaZE440",
    chapterStarts: {
      "第一章": 970,
      "第二章": 1529,
      "第三章": 1866,
      "第四章": 3166,
      "第五章": 4067
    }
  },
  {
    slug: "ririkaza",
    file: "ririkaza.md",
    label: "りりかざシャッハ",
    cast: "夕陽リリ、森中花咲、雪城眞尋",
    accent: "#6b4b78",
    videoId: "5dPj-Wzly58",
    chapterStarts: {
      "第一章": 1038,
      "第二章": 1475,
      "第三章": 2305,
      "第四章": 3698,
      "第五章": 4477
    }
  },
  {
    slug: "ayumiya",
    file: "ayumiya.md",
    label: "あゆみやシャッハ",
    cast: "サヤ、スズリ、モモ",
    accent: "#9a5b2e",
    videoId: "7Hvur1zdm_8",
    chapterStarts: {
      "第一章": 1264,
      "第二章": 2093,
      "第三章": 3402,
      "第四章": 5752,
      "第五章": 8533
    }
  },
  {
    slug: "miratoto",
    file: "miratoto.md",
    label: "みらととシャッハ",
    cast: "ミラン・ケストレル、立伝都々、レイ",
    accent: "#3f5d89",
    videoId: "WkWxcTShiuk",
    chapterStarts: {
      "第一章": 1169,
      "第二章": 1803,
      "第三章": 2489,
      "第四章": 5272,
      "第五章": 8136
    }
  },
  {
    slug: "rumufo",
    file: "rumufo.md",
    label: "るむふぉシャッハ",
    cast: "四季凪アキラ、セラフ・ダズルガーデン、ナナ",
    accent: "#6e6a3d",
    videoId: "Fyo8TOprLw8",
    chapterStarts: {
      "第一章": 1637,
      "第二章": 2420,
      "第三章": 4290,
      "第四章": 5599,
      "第五章": 6900
    }
  },
  {
    slug: "fukeizai",
    file: "fukeizai.md",
    label: "フ景罪シャッハ",
    cast: "フミ、長尾景",
    accent: "#765044",
    videoId: "yTvmvQlDokc",
    chapterStarts: {
      "第一章": 1179,
      "第二章": 1552,
      "第三章": 2730,
      "第四章": 4060,
      "第五章": 5160
    }
  },
  {
    slug: "eriburi",
    file: "eriburi.md",
    label: "えりぶりシャッハ",
    cast: "一橋綾人、五木左京",
    accent: "#3d6678",
    videoId: "mkgAN44Uv88",
    chapterStarts: {
      "第一章": 1086,
      "第二章": 2053,
      "第三章": 3467,
      "第四章": 4465,
      "エピローグ": 5244
    }
  },
  {
    slug: "eclaire",
    file: "eclaire.md",
    label: "えくれあシャッハ",
    cast: "える、シスター・クレア、雪城眞尋",
    accent: "#8a4f68",
    videoId: "DgYRSVPK9Cc",
    chapterStarts: {
      "第一章": 1130,
      "第二章": 1754,
      "第三章": 2568,
      "第四章": 3886,
      "第五章": 6022,
      "エピローグ": 6671
    }
  }
];

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
    '    <p class="hero-copy">エモクロアTRPG『ロールシャッハシンドローム』。<br>配信セッションをもとに構成した九つのリプレイ小説。</p>',
    '    <a class="hero-cta" href="#works">作品を選ぶ <span aria-hidden="true">↓</span></a>',
    "  </section>",
    '  <section class="collection" id="works" aria-labelledby="works-title">',
    '    <div class="section-heading"><p class="eyebrow">Replay collection</p><h2 id="works-title">収録作品</h2><p>九つのセッションを、それぞれ一篇のリプレイ小説として収録しています。</p></div>',
    '    <div class="work-grid">' + works.map(card).join("") + "</div>",
    "  </section>",
    '  <section class="about"><div><p class="eyebrow">About</p><h2>セッションの声を、<br>読み物の時間へ。</h2></div><p>実際のセッションで交わされたキャラクターの台詞を軸に、場面の空気や間、視線や心の動きを地の文として編み直したリプレイ小説集です。判定や進行上の会話は省き、読み物として続く形に整えています。</p></section>',
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

function readerPage(work, index, rendered) {
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

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
fs.writeFileSync(path.join(out, "index.html"), homePage());
for (const [index, work] of works.entries()) {
  const markdown = fs.readFileSync(path.join(root, "content", work.file), "utf8");
  const publicMarkdown = markdown.replace(/\n#{2,6} 照合記録[\s\S]*$/, "");
  const rendered = renderMarkdown(publicMarkdown, work);
  const directory = path.join(out, "replays", work.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), readerPage(work, index, rendered));
}
for (const asset of ["styles.css", "app.js"]) {
  fs.copyFileSync(path.join(root, "src", asset), path.join(out, "assets", asset));
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log("Built " + (works.length + 1) + " pages in " + path.relative(root, out));
