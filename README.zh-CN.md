# powerbi-kit

[English](README.md) | 中文

让 AI 直接在 Power BI 里干活的个人工具包：MCP 配置说明、做报表的 skill、配色主题、示例数据。

> 个人项目。只放示例数据和公开数据，不放任何工作文件。

## 里面有什么

```
powerbi-kit/
├─ docs/setup.md            在 Windows 上配好 Power BI MCP（Claude Code / WorkBuddy / DeepSeek harness）
├─ skills/neo-powerbi/      做报表的规矩：先只读、改前备份、命名格式、改完核数、汇报格式
├─ themes/                  3 套 Power BI 主题：oat-latte 燕麦拿铁 / forest-gold 墨绿鎏金 / mist-blue 雾霾蓝
├─ visuals/                 自定义组件源码：calendarHeatmap 日历热力图
├─ downloads/               打包好的组件，下载就能导入
└─ sample-data/             虚构的咖啡店销售数据（2024–2025），演示专用
```

## 怎么开始

1. 照 [docs/setup.md](docs/setup.md) 装好 Node.js，接上 Power BI MCP。
2. 把 `skills/neo-powerbi` 复制到 AI 工具的 skills 目录（Claude Code：`%USERPROFILE%\.claude\skills\`）。
3. 用 `sample-data` 里的 3 张表建个演示文件，按 setup.md 第 4 步测一遍。

## 组件怎么导入

下载 [downloads/calendar-heatmap.pbiviz](downloads/calendar-heatmap.pbiviz)，Power BI Desktop → 可视化窗格「…」→ 从文件导入视觉对象。用法见 [downloads/README.md](downloads/README.md)。

## 主题怎么导入

Power BI Desktop → 设计 → 导入主题，选 `themes/` 里的 .json（老版本：视图 → 主题 → 浏览主题）。
主题里已经带了画布背景、壁纸和视觉对象背景（燕麦拿铁 `#EFEBE5`，墨绿鎏金 `#0E1916`，雾霾蓝 `#EAEEF3`）。如果某一页或某个图的背景以前手动改过，会保留手动的设置，选中它点「重置为默认值」就会换成主题的颜色。

## 更新

```powershell
cd $HOME\powerbi-kit
git pull
Copy-Item -Recurse -Force skills\neo-powerbi $HOME\.claude\skills\
```
