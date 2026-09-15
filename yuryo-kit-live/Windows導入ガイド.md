# Windowsで使う方へ（ベータ対応）

このキットはWindowsでも動くように作ってありますが、**動作確認の中心はMacです。**
うまくいかない箇所があったら、画面の文章をそのままClaudeに貼って相談してください。

---

## いちばん簡単な導入（おすすめ）

Macと同じです。コマンド入力は要りません。

1. Claudeアプリを開いてログインする
2. 上の「**Code**」タブを選ぶ
3. 「フォルダを選択」で、この `yuryo-kit-live` フォルダを選ぶ
4. 入力欄に「**セットアップして**」と打ってEnter

あとはAIが、Windows向けのやり方で案内してくれます。

---

## 手動で導入する場合

### 使うのは「PowerShell」です

コマンドは**PowerShell（パワーシェル）**で実行してください。
スタートボタンを右クリック →「ターミナル」または「Windows PowerShell」を選ぶと開きます。
（黒い画面の「コマンドプロンプト」では、下のコマンドは動きません）

### Step 1. フォルダを置く

`yuryo-kit-live` フォルダを、**自分のユーザーフォルダの直下**に置きます。
置いたあとが `C:\Users\あなたの名前\yuryo-kit-live` になっていればOKです。

> **`yuryo-kit-live` の中にもうひとつ `yuryo-kit-live` が入っていたら**、内側のほうを取り出して使ってください。
> zipの解凍のしかたによって二重になることがあります。`CLAUDE.md` と `note-draft` が直下に見えるほうが本体です。

### Step 2. スキルをClaudeに読み込ませる

> **すでにClaudeで自分の手順書（スキル）を作ったことがある方へ。**
> このキットは `yuryo-live-note` `yuryo-live-image` `yuryo-live-toukou` という名前の手順書を入れます。
> **同じ名前のものをお持ちだと、上書きされて消えてしまいます。** 先に次を貼り付けて、控えを取ってください。
> 心当たりがない方も、実行して損はありません（該当が無ければ何も起きません）。
>
> ```powershell
> New-Item -ItemType Directory -Force "$HOME\.claude\skills-backup" | Out-Null; Copy-Item -Path "$HOME\.claude\skills\yuryo-live-note","$HOME\.claude\skills\yuryo-live-image","$HOME\.claude\skills\yuryo-live-toukou" -Destination "$HOME\.claude\skills-backup\" -Recurse -Force -ErrorAction SilentlyContinue; echo "控えを取りました"
> ```
>
> 控えは `C:\Users\あなたの名前\.claude\skills-backup` に入ります。

そのうえで、PowerShellに次を貼り付けてEnter：

```powershell
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null; Copy-Item -Recurse -Force "$HOME\yuryo-kit-live\skills\*" "$HOME\.claude\skills\"
```

そのあと**Claudeを一度閉じて、開き直してください。**

### Step 3. 設定ファイルを埋める

`yuryo-kit-live` フォルダの中の `profile.md` をメモ帳などで開いて記入します。
（内容はMacと共通です。詳しくは「はじめにお読みください.md」のStep 3を見てください）

### Step 4. note入稿ツールの準備

PowerShellで、上から順に1行ずつ実行します。

```powershell
cd $HOME\yuryo-kit-live\note-draft
```

```powershell
npm install
```

> 最後に英語の注意（vulnerabilities）が出ても、そのまま進めて大丈夫です。理由は「はじめにお読みください.md」のStep 4にあります。

```powershell
npx playwright install chromium
```

> 150MBほどのダウンロードが走ります。数分かかることがあります。

```powershell
npm run login
```

> ブラウザが開くので、あなたが手でnoteにログインしてください。パスワードは保存されません。
> なお、ログインの確認のために編集画面を一度開くので、**noteに空の下書きが1件できます。** 中身は空なので、下書き一覧から消してしまって大丈夫です。

### Step 5. 画像づくりの道具（任意）

ChatGPTの有料プランをお持ちの方だけ。入れると、**見出し画像（サムネイル）と人物イラスト**も
追加料金なしで作れるようになります。入れなくても、記事に差し込む図解は作れます。

```powershell
npm install -g @openai/codex
```

入れ終わったら、`codex` と打ってEnter。ChatGPTアカウントでのログインを1回だけ求められます。

これで準備完了です。使い方はMacと同じ（「はじめにお読みください.md」の「1本書いてみる」へ）。

---

## Windowsだけの注意点

- **図解の文字の見た目が少し変わります**：Macはヒラギノ、Windowsは游ゴシック／メイリオという標準の書体で描かれます。レイアウトは同じです
- **環境の点検**は同じコマンドで動きます：`cd $HOME\yuryo-kit-live\note-draft` のあと `npm run doctor`
- セキュリティソフトがブラウザの自動操作を止めることがあります。その場合は一時的に許可してください

## うまくいかないとき

- 「スクリプトの実行が無効」と赤い文字が出る → PowerShellで `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` を実行してから再挑戦（何をするか：ダウンロードした道具の実行を、あなたのアカウントに限って許可する設定です）
- それ以外はMacと共通です。「はじめにお読みください.md」の「困ったときは」を見てください
