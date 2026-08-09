# rorschach-syndrome-replays

[![Deploy GitHub Pages](https://github.com/tsuji-tomonori/rorschach-syndrome-replays/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/tsuji-tomonori/rorschach-syndrome-replays/actions/workflows/deploy-pages.yml)

エモクロアTRPG『ロールシャッハシンドローム』のセッションから構成した、7作品のリプレイ小説を読むための静的サイトです。

## 公開サイト

https://tsuji-tomonori.github.io/rorschach-syndrome-replays/

## ローカル確認

~~~bash
npm ci
npm run build
npm run check
npx serve dist
~~~

## コンテンツ更新

`content/*.md` を更新して `main` に反映すると、GitHub Actionsが静的HTMLを生成し、GitHub Pagesへ自動デプロイします。

## 収録作品

- きかけんシャッハ
- ゆきやまシャッハ
- りりかざシャッハ
- あゆみやシャッハ
- みらととシャッハ
- るむふぉシャッハ
- フ景罪シャッハ

原作シナリオ：ディズム『ロールシャッハシンドローム』
