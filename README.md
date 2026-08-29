# rorschach-syndrome-replays

[![Deploy GitHub Pages](https://github.com/tsuji-tomonori/rorschach-syndrome-replays/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/tsuji-tomonori/rorschach-syndrome-replays/actions/workflows/deploy-pages.yml)

エモクロアTRPG『ロールシャッハシンドローム』のセッションから構成した、9作品のリプレイ小説と詳細会話記録を読むための静的サイトです。

各章の見出しと目次から、元になった配信の該当場面をタイムスタンプ付きで開けます。
各作品では「小説版」と「詳細会話記録」を切り替えられます。詳細会話記録は、物語開始からセッション終了宣言の直前までの発話を時刻順に収録しています。

> [!CAUTION]
> 本サイトのリプレイ小説と文章構成は、配信内容をもとに生成AIを用いて制作しています。
> 原作シナリオ『ロールシャッハシンドローム』の重大なネタバレを含みます。

## 公開サイト

https://rorschach.page.diopside.net/

## ローカル確認

~~~bash
npm ci
npm run build
npm run check
npx serve dist
~~~

## コンテンツ更新

`content/*.md` または `content/dialogue/*.json` を更新して `main` に反映すると、GitHub Actionsが静的HTMLを生成し、GitHub Pagesへ自動デプロイします。

### セリフを扱う方針

- 小説版では、噛み・言い直し・重複を読みやすい範囲で整えても、発話が持つ情報や選択理由を削らない
- 詳細会話記録では、物語開始から終了宣言直前までの発話を時刻順に残す
- 詳細会話記録から除外するのは、`[音楽]`・`[笑い]`・`[拍手]` など言葉ではない字幕と、完全に同一の連続字幕だけとする
- 明白な固有名詞の誤認識は補正するが、不確かな箇所を推測で書き換えない。各時刻のリンクから元動画へ戻れる状態を保つ

`content/dialogue/*.json` は、YouTubeの時刻付き自動字幕を次の形式で保存したテキストから生成します。

~~~text
[18:54] 発話内容
[19:02] 次の発話内容
~~~

~~~bash
node scripts/import-dialogue.mjs /path/to/transcripts
~~~

動画ID、収録範囲、発話数、時系列、非発話字幕の混入、章ごとの収録件数は `npm run check` で検証します。

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

原作シナリオ：ディズム『ロールシャッハシンドローム』
