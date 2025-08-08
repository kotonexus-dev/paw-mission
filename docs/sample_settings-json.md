<mac>

```json
{
  "terminal.integrated.env.osx": {
    "PYTHONPATH": "${workspaceFolder}/backend"
  },
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
  "python.analysis.extraPaths": ["${workspaceFolder}/backend"],

  "editor.formatOnSave": true, // ファイル保存時に自動でフォーマット
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always"
  },
  "files.trimTrailingWhitespace": true, // ファイル保存時に末尾の空白を削除
  "files.insertFinalNewline": true, // ファイル保存時に末尾に改行を追加
  "git.autofetch": true, // Git の自動フェッチを有効化
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode" // TypeScript ファイルは Prettier でフォーマット
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode" // TSX も Prettier でフォーマット
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode" // JavaScript ファイルも Prettier でフォーマット
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode" // JSX ファイルも Prettier でフォーマット
  },
  "[python]": {
    "editor.wordBasedSuggestions": "allDocuments", // Python は全ドキュメントからワード補完
    "editor.defaultFormatter": "ms-python.black-formatter", // Black で Python コード自動整形
    "editor.formatOnSave": true // Python 保存時も自動フォーマット
  },
  "eslint.workingDirectories": ["frontend"] // ESLint の対象ディレクトリを"frontend"に限定
}
```

<windows>

```json
{
"terminal.integrated.env.windows": {
"PYTHONPATH": "${workspaceFolder}\\backend"
  },
  "python.defaultInterpreterPath": "${workspaceFolder}\\backend\\venv\\Scripts\\python.exe",
"python.analysis.extraPaths": [
"${workspaceFolder}\\backend"
]

"editor.formatOnSave": true, // ファイル保存時に自動でフォーマット
// ESLint の自動修正を有効化
"editor.codeActionsOnSave": {
"source.fixAll.eslint": "always"
},
"files.trimTrailingWhitespace": true, // ファイル保存時に末尾の空白を削除
"files.insertFinalNewline": true, // ファイル保存時に末尾に改行を追加
"git.autofetch": true, // Git の自動フェッチを有効化
"[typescript]": {
"editor.defaultFormatter": "esbenp.prettier-vscode" // TypeScript ファイルは Prettier でフォーマット
},
"[typescriptreact]": {
"editor.defaultFormatter": "esbenp.prettier-vscode" // TSX も Prettier でフォーマット
},
"[javascript]": {
"editor.defaultFormatter": "esbenp.prettier-vscode" // JavaScript ファイルも Prettier でフォーマット
},
"[javascriptreact]": {
"editor.defaultFormatter": "esbenp.prettier-vscode" // JSX ファイルも Prettier でフォーマット
},
"[python]": {
"editor.wordBasedSuggestions": "allDocuments", // Python は全ドキュメントからワード補完
"editor.defaultFormatter": "ms-python.black-formatter", // Black で Python コード自動整形
"editor.formatOnSave": true // Python 保存時も自動フォーマット
},
"eslint.workingDirectories": [
"frontend"
] // ESLint の対象ディレクトリを"frontend"に限定
}

```
