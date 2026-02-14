# Kakune（かくね） 

## 1. プロダクト概要

### アプリ名
**Kakune（かくね）** — 「確認したね」（共感の終助詞）の造語。確認した事実を優しく認めてくれるような存在。

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

