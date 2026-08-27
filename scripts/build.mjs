import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";

const root = process.cwd();
const out = path.join(root, "dist");
const base = "/";

const works = [
  {
    slug: "kikaken",
    file: "kikaken.md",
    label: "きかけんシャッハ",
    cast: "リリエル、ルルハリル、メイド",
    lead: "お嬢様と執事とメイド。穏やかなピクニックは、瞬きのたびに同じ一日へ戻っていく。",
    accent: "#a43d4b"
  },
  {
    slug: "yukiyama",
    file: "yukiyama.md",
    label: "ゆきやまシャッハ",
    cast: "山神カルタ、雪城眞尋",
    lead: "バレンタインの贈り物は山の景色。烏天狗と少女が辿る、一度きりでは終わらない山道。",
    accent: "#406b68"
  },
  {
    slug: "ririkaza",
    file: "ririkaza.md",
    label: "りりかざシャッハ",
    cast: "夕陽リリ、森中花咲、雪城眞尋",
    lead: "弁当とポテトチップスを携えた三人の山行。軽口の奥で、ひとりだけが反復を覚えている。",
    accent: "#6b4b78"
  },
  {
    slug: "ayumiya",
    file: "ayumiya.md",
    label: "あゆみやシャッハ",
    cast: "サヤ、スズリ、モモ",
    lead: "売れないアイドル三人組が挑む開運ロケ。山の静けさが、彼女たちの未来を試していく。",
    accent: "#9a5b2e"
  },
  {
    slug: "miratoto",
    file: "miratoto.md",
    label: "みらととシャッハ",
    cast: "ミラン・ケストレル、立伝都々、レイ",
    lead: "病気の母を救う薬草を探して。何でも屋と依頼人は、山に隠された時間の綻びを追う。",
    accent: "#3f5d89"
  },
  {
    slug: "rumufo",
    file: "rumufo.md",
    label: "るむふぉシャッハ",
    cast: "四季凪アキラ、セラフ・ダズルガーデン、ナナ",
    lead: "何でも屋の二人と方向音痴の依頼人。友達という言葉が、反復の核心で別の意味を帯びる。",
    accent: "#6e6a3d"
  },
  {
    slug: "fukeizai",
    file: "fukeizai.md",
    label: "フ景罪シャッハ",
    cast: "フミ、長尾景",
    lead: "神と人が任務で向かう山。尊大な軽口を交わしながら、二人は避けられない厄難に抗う。",
    accent: "#765044"
  },
  {
    slug: "eriburi",
    file: "eriburi.md",
    label: "えりぶりシャッハ",
    cast: "一橋綾人、五木左京",
    lead: "珍しい茸を求める二人の山行。冗談めいた賭けは、互いの命を預ける同意へ姿を変える。",
    accent: "#3d6678"
  },
  {
    slug: "eclaire",
    file: "eclaire.md",
    label: "えくれあシャッハ",
    cast: "える、シスター・クレア、雪城眞尋",
    lead: "手作り弁当を囲む三人のピクニック。皆の幸せを願う言葉が、反復の中で重みを増していく。",
    accent: "#8a4f68"
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

function renderMarkdown(markdown) {
  const toc = [];
  const seen = new Map();
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
        if ((depth === 2 && isChapter) || isCast) toc.push({ depth, text: plain, id });
        return "<h" + depth + ' id="' + id + '">' + inner
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
  return { html: marked.parse(markdown), toc };
}

function shell(options) {
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
    '    <p class="lead">' + work.lead + "</p>",
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
    "    <h1>繰り返す一日を、<br><em>九つの視点</em>で読む。</h1>",
    '    <p class="hero-copy">エモクロアTRPG『ロールシャッハシンドローム』。<br>同じ山、同じ祠、同じ厄難から生まれた九つのリプレイ小説。</p>',
    '    <a class="hero-cta" href="#works">作品を選ぶ <span aria-hidden="true">↓</span></a>',
    "  </section>",
    '  <section class="collection" id="works" aria-labelledby="works-title">',
    '    <div class="section-heading"><p class="eyebrow">Nine observations</p><h2 id="works-title">収録作品</h2><p>登場人物の関係性も、選ぶ言葉も、辿り着く余韻も異なる九篇です。</p></div>',
    '    <div class="work-grid">' + works.map(card).join("") + "</div>",
    "  </section>",
    '  <section class="about"><div><p class="eyebrow">About</p><h2>セッションの声を、<br>読み物の時間へ。</h2></div><p>実際のセッションで交わされたキャラクターの台詞を軸に、山の空気、沈黙の間、視線や心の揺れを地の文として編み直したリプレイ小説集です。判定や進行上の会話は省き、物語として続く読書体験に整えています。</p></section>',
    "</main>",
    '<footer class="site-footer"><p>原作シナリオ：ディズム『ロールシャッハシンドローム』</p><p>Unofficial replay novel collection</p></footer>'
  ].join("\n");
  return shell({
    title: "ロールシャッハ・シンドローム｜リプレイ小説集",
    description: "エモクロアTRPG『ロールシャッハシンドローム』から生まれた九つのリプレイ小説。",
    body,
    pageClass: "home"
  });
}

function readerPage(work, index, rendered) {
  const previous = works[(index - 1 + works.length) % works.length];
  const next = works[(index + 1) % works.length];
  const toc = rendered.toc.map((item) => {
    return '<li class="toc-depth-' + item.depth + '"><a href="#' + item.id + '">'
      + escapeHtml(item.text) + "</a></li>";
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
    description: work.lead,
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
  const rendered = renderMarkdown(publicMarkdown);
  const directory = path.join(out, "replays", work.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), readerPage(work, index, rendered));
}
for (const asset of ["styles.css", "app.js"]) {
  fs.copyFileSync(path.join(root, "src", asset), path.join(out, "assets", asset));
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log("Built " + (works.length + 1) + " pages in " + path.relative(root, out));
