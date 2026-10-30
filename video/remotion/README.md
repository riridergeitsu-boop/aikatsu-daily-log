# Remotion 動画プロジェクト

縦型ショート動画（1080×1920 / 30fps）を Remotion で作るためのプロジェクトです。

- `src/Shoplist.tsx`：「あそべるお店」回の動画（シーン構成・タイミング・音声）
- `tools_align.py`：無音区間と台本の文字数から、シーンのタイミングを割り出す補助スクリプト
- `public/a/`：画像・音声素材（著作物やナレーションを含むため git には入れない）

## 使い方

```sh
npm install
npx remotion studio            # プレビュー
npx remotion render src/index.ts Shoplist out/shoplist.mp4
```

フォントは「ユールカ」を優先し、入っていなければ Mochiy Pop One を使います。
