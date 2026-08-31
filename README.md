# rorschach-syndrome-replays

[![Deploy GitHub Pages](https://github.com/tsuji-tomonori/rorschach-syndrome-replays/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/tsuji-tomonori/rorschach-syndrome-replays/actions/workflows/deploy-pages.yml)

エモクロアTRPG『ロールシャッハシンドローム』のセッションから構成した、10作品のリプレイ小説を読むための静的サイトです。

各章の見出しと目次から、元になった配信の該当場面をタイムスタンプ付きで開けます。
実際に交わされたセリフをできる限り本文へ残し、噛みや言い直しだけを読みやすく整えながら、地の文とともに一篇の小説へ編み込んでいます。

> [!CAUTION]
> 本サイトのリプレイ小説と文章構成は、配信内容をもとに生成AIを用いて制作しています。
> 原作シナリオ『ロールシャッハシンドローム』の重大なネタバレを含みます。

## 公開サイト

https://rorschach.page.diopside.net/

公開ページはネタバレ防止のため、検索結果へ登録しないよう `robots` / `googlebot` / `bingbot` の `noindex` 指示を出力します。`robots.txt` は検索ロボットが各ページの `noindex` を読み取れる状態に保ち、`npm run check` で全HTMLへの付与漏れを検査します。

## ローカル確認

~~~bash
npm ci
npm run build
npm run check
npx serve dist
~~~

## コンテンツ更新

`content/*.md` または `content/chapters/<作品>/<章>.md` を更新して `main` に反映すると、GitHub Actionsが静的HTMLを生成し、GitHub Pagesへ自動デプロイします。`content/chapters` に同名章がある場合は、ビルド時に元の章を編集済みの章へ置き換えます。

### セリフを扱う方針

- 物語内で交わされた内容のあるセリフは、既存本文と重なるものを再利用し、未収録分を各章の該当場面へ組み込む
- 噛み・言い直し・情報を増やさない相づち・直近の重複は、読みやすい範囲で整理してよいが、発話が持つ情報や選択理由は削らない
- 進行役による場面説明は引用文として並べず、既存の地の文へ委ねる
- 判定・技能・数値処理などのゲーム操作と配信運用上の発話だけは、小説本文の対象外とする
- 明白な固有名詞や同音語の誤認識は補正するが、不確かな内容を新しく作らない

`sources/session-speech/*.json` は、公開ページではなく本文との照合に使う編集用資料です。YouTubeの時刻付き自動字幕を次の形式で保存したテキストから生成します。

~~~text
[18:54] 発話内容
[19:02] 次の発話内容
~~~

~~~bash
node scripts/import-session-speech.mjs /path/to/transcripts
~~~

特定作品だけを取り込む場合は、第2引数に作品slugを指定します。

~~~bash
node scripts/import-session-speech.mjs /path/to/transcripts yoruneko
~~~

取り込んだ資料を章ごとに照合し、必要なセリフを人物の動作・視線・場面描写とともに `content/chapters/<作品>/<章>.md` へ手作業で編み込みます。自動字幕をそのまま本文へ流し込む処理や、公開用の文字起こしページは設けません。

動画ID、収録範囲、発話数、時系列、非発話字幕の混入、章の差し替え、公開ページ数、タイムスタンプ付き動画リンクは `npm run check` で検証します。

## 収録作品

- きかけんシャッハ
- ゆきやまシャッハ
- りりかざシャッハ
- あゆみやシャッハ
- みらととシャッハ
- るむふぉシャッハ
- フ景罪シャッハ
- えりぶりシャッハ
- えくれあシャッハ
- よるねこシャッハ

原作シナリオ：ディズム『ロールシャッハシンドローム』
