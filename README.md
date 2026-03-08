# Kakune（かくね）

<img src="./public/app-icon-base.png" width=200 height=200>

## 1. プロダクト概要

### アプリ名

**Kakune（かくね）** — 「確認したね」が由来。確認した事実を優しく認めてくれるような存在をイメージ。

### コンセプト

強迫性障害（OCD）の確認行為に悩む人が、「確認した事実」を外部に記録することで、繰り返し確認する衝動を和らげるためのWebアプリ。

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm ci
```

### Running Tests

```bash
npm run test        # テストを1回実行（CI向け）
npm run test:watch  # テストをウォッチモードで実行（開発中に継続監視）
```

テストには [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) を使用しています。

### Recommended Claude Setting

`.claude/settings.local.json`を以下の内容で作成する。

```
{
  "permissions": {
    "allow": [
      "Bash(ls:*)",
      "Bash(node -e:*)",
      "Bash(npm install:*)",
      "Bash(npm run typecheck:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)"
    ],
    "ask": [
      "Bash(git push:*)"
    ]
  }
}
```
