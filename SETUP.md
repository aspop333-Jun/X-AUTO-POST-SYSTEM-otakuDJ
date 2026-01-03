# X Auto-Post System セットアップガイド

このガイドでは、X Auto-Post System を簡単にセットアップして起動する方法を説明します。

## 📋 必要なもの

### Node.js のインストール

1. https://nodejs.org/ にアクセス
2. **LTS（推奨版）** をダウンロード
3. ダウンロードしたファイルを実行してインストール
4. 「次へ」を押し続けてインストール完了

> **これだけでOK！** Windowsの場合、`run.bat` を使えば他に何もインストールする必要はありません。

---

## 🚀 セットアップ手順（Windows - 推奨）

### ステップ1: コマンドプロンプトを開く

1. このフォルダを開く
2. アドレスバーに `cmd` と入力してEnter
3. コマンドプロンプトが開きます

### ステップ2: 依存関係をインストール

```bash
run.bat setup
```

> **注意**: 「'run' は認識されていません」と出る場合は、代わりに以下を入力してください：
> ```powershell
> .\run.bat setup
> ```

これで必要なパッケージがすべてインストールされます。
（初回は数分かかることがあります）

### ステップ3: アプリを起動

```bash
run.bat app
```

> **注意**: うまくいかない場合は `.\run.bat app` を試してください。

ブラウザで http://localhost:3000 を開くとアプリが表示されます。

---

## 🐧 セットアップ手順（WSL2 / Ubuntu - 推奨）

最速の推論パフォーマンス（Flash Attention有効）を得るには、WSL2上のUbuntuで実行してください。

### ステップ1: ターミナルでスクリプト実行権限を付与

```bash
chmod +x setup_kotaro.sh start_kotaro.sh
```

### ステップ2: セットアップ（初回のみ）

```bash
./setup_kotaro.sh
```
必要なライブラリとAIモデル（Qwen）が自動インストールされます。

### ステップ3: 起動

```bash
./start_kotaro.sh
```
Flash Attention有効化状態でサーバーが起動します。
その後、Windows側のブラウザで http://localhost:8000/health にアクセスして確認できます。

## 📖 よく使うコマンド（Windows）

| コマンド | 説明 |
|---------|------|
| `run.bat help` | コマンド一覧を表示 |
| `run.bat setup` | 依存関係をインストール |
| `run.bat app` | アプリを起動 |
| `run.bat status` | 環境状態を確認 |
| `run.bat clean` | node_modules を削除 |
| `run.bat reset` | クリーン + 再インストール |

---

## 🚀 セットアップ手順（Make版 - 上級者向け）

`make` コマンドがインストールされている場合は、以下も使用可能です。

### Make のインストール（オプション）

#### 方法A: Chocolatey を使う場合
```powershell
choco install make
```

#### 方法B: winget を使う場合
```powershell
winget install GnuWin32.Make
```

### Make コマンド

| コマンド | 説明 |
|---------|------|
| `make help` | コマンド一覧を表示 |
| `make setup` | 依存関係をインストール |
| `make app` | アプリを起動 |

---

## 🚀 古いセットアップ手順

### ステップ1: コマンドプロンプトを開く

1. このフォルダを開く
2. アドレスバーに `cmd` と入力してEnter
3. コマンドプロンプトが開きます

### ステップ2: 依存関係をインストール

```bash
make setup
```

これで必要なパッケージがすべてインストールされます。
（初回は数分かかることがあります）

### ステップ3: アプリを起動

```bash
make app
```

ブラウザで http://localhost:3000 を開くとアプリが表示されます。

---

## 📖 よく使うコマンド

| コマンド | 説明 |
|---------|------|
| `make help` | コマンド一覧を表示 |
| `make setup` | 依存関係をインストール |
| `make app` | アプリを起動 |
| `make status` | 環境状態を確認 |
| `make clean` | node_modules を削除 |
| `make reset` | クリーン + 再インストール |

---

## ❓ トラブルシューティング

### 「'make' は認識されていません」と表示される

→ Make がインストールされていません。上記の「Make コマンドのインストール」を参照してください。

### 「'node' は認識されていません」と表示される

→ Node.js がインストールされていません。上記の「Node.js のインストール」を参照してください。

### ポート 3000 が使用中と表示される

→ 別のアプリが同じポートを使っています。そのアプリを終了するか、次のコマンドで確認：
```bash
netstat -ano | findstr :3000
```

---

## 🔧 開発者向け情報

### プロジェクト構造

```
X-AUTO-POST-SYSTEM-otakuDJ/
├── Makefile          # このファイル
├── SETUP.md          # このガイド
├── next-app/         # メインアプリ（Next.js/TypeScript）
│   ├── src/          # ソースコード
│   └── package.json  # 依存関係
└── app/              # レガシー版（Vanilla JS）
```

### 追加コマンド

```bash
make build    # プロダクションビルド
make test     # テスト実行
make legacy   # レガシー版（Vanilla JS）を起動
```
