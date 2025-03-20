---
title: Obsidian Vault 的 .obsidian 目录中的各文件作用
date: 2024-10-06 09:56:25
tags: [Technique]
---

一个简单的例子是:

```
.obsidian
├── appearance.json
├── app.json
├── community-plugins.json
├── core-plugins.json
├── core-plugins-migration.json
├── plugins
│   └── obsidian-git
│       ├── data.json
│       ├── main.js
│       ├── manifest.json
│       └── styles.css
└── workspace.json
```

其中：
- `appearance.json` 包含当前 vault 的外观设置，例如主题、字体大小和行高，例如:
```json
{
 "interfaceFontFamily": "HarmonyOS Sans SC",
 "textFontFamily": "HarmonyOS Sans SC",
 "monospaceFontFamily": "FrankMono",
 "accentColor": "",
 "cssTheme": "Listive",
 "nativeMenus": false
}
```

- `app.json` 包含了编辑器的一些设置，例如 vim mode 和断行设置:
```json
{
 "vimMode": true,
 "strictLineBreaks": false,
 "promptDelete": false
}
```

- `community-plugins.json`：包含有关当前 vault 中安装的社区插件的数据，例如:
```json
[
 "dataview",
 "novel-word-count",
 "remotely-save",
 "obsidian-tasks-plugin",
 "obsidian-style-settings",
 "obsidian-advanced-slides",
 "calendar",
 "3d-graph-new",
 "webpage-html-export"
]
```

- `core-plugins.json`: 就是当前 valut 中的所有内置插件，例如:
```json
 "file-explorer",
 "global-search",
 "switcher",
 "graph",
 "backlink",
 "canvas",
 "outgoing-link",
 "tag-pane",
 "page-preview",
 "daily-notes",
 "templates",
 "note-composer",
 "command-palette",
 "editor-status",
 "bookmarks",
 "outline",
 "word-count",
 "file-recovery"
]
```

		- `core-plugins-migration.json`: 就是 `core-plugins.json` 中的内置插件的开关状态，例如:
```json
{
 "file-explorer": true,
 "global-search": true,
 "switcher": true,
 "graph": true,
 "backlink": true,
 "canvas": true,
 "outgoing-link": true,
 "tag-pane": true,
 "properties": false,
 "page-preview": true,
 "daily-notes": true,
 "templates": true,
 "note-composer": true,
 "command-palette": true,
 "slash-command": false,
 "editor-status": true,
 "bookmarks": true,
 "markdown-importer": false,
 "zk-prefixer": false,
 "random-note": false,
 "outline": true,
 "word-count": true,
 "slides": false,
 "audio-recorder": false,
 "workspaces": false,
 "file-recovery": true,
 "publish": false,
 "sync": false
}
```
- `workspace.json`：包含有关当前 Vault 工作区的数据，包括打开的文件、窗口和布局的设置，例如：
```json
{
 "main": {
   "id": "7bc59326f5497d4a",
   "type": "split",
   "children": [
     {
       "id": "06fc674d29eb4c3a",
       "type": "tabs",
       "children": [
         {
           "id": "97d62f14e2fad2f0",
           "type": "leaf",
           "state": {
             "type": "markdown",
             "state": {
               "file": "README.md",
               "mode": "source",
               "source": false
             }
           }
         },
         {
           "id": "c94063b5e5f6f995",
           "type": "leaf",
           "state": {
             "type": "markdown",
             "state": {
               "file": "README.md",
               "mode": "source",
               "source": false
             }
           }
         },
         {
           "id": "143d5ea7a56d7e1d",
           "type": "leaf",
           "state": {
             "type": "markdown",
             "state": {
               "file": "测试.md",
               "mode": "source",
               "source": false
             }
           }
         }
       ],
       "currentTab": 2
     }
			...
```
