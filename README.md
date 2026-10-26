# powerbi-kit

[English](README.md) | [中文](README.zh-CN.md)

A personal toolkit for letting AI work directly in Power BI: MCP setup notes, a report-building skill, color themes, a custom visual, and sample data.

> Personal project. It contains only sample data and public information — no work files.

## What's inside

```
powerbi-kit/
├─ docs/setup.md            Set up the Power BI MCP on Windows (Claude Code / WorkBuddy / DeepSeek harness)
├─ skills/neo-powerbi/      Ground rules for building reports: read first, back up before edits, naming, verify numbers, report back
├─ themes/                  3 Power BI themes: oat-latte / forest-gold / mist-blue
├─ visuals/                 Custom visual source: calendarHeatmap
├─ downloads/               Packaged visuals, ready to import
└─ sample-data/             A fictional coffee-shop sales dataset (2024–2025), for demos only
```

Most docs and the sample data are in Chinese.

## Getting started

1. Follow [docs/setup.md](docs/setup.md) to install Node.js and connect the Power BI MCP.
2. Copy `skills/neo-powerbi` into your AI tool's skills folder (Claude Code: `%USERPROFILE%\.claude\skills\`).
3. Build a demo file from the 3 tables in `sample-data` and run the test in step 4 of setup.md.

## Importing the calendar heatmap visual

Download [downloads/calendar-heatmap.pbiviz](downloads/calendar-heatmap.pbiviz), then in Power BI Desktop: Visualizations pane → `…` → Import a visual from a file. Usage notes: [downloads/README.md](downloads/README.md).

The visual draws one row per year and one cell per day; darker means a higher value. It supports native tooltips and cross-filtering, makes no network calls, and collects no data. It is not certified by Microsoft, so some organizations may block it.

## Importing a theme

Power BI Desktop → Design → Import theme, and pick a `.json` from `themes/` (older versions: View → Themes → Browse for themes).
Each theme also sets the canvas background, the wallpaper and the visual background (oat-latte `#EFEBE5`, forest-gold `#0E1916`, mist-blue `#EAEEF3`). A page or visual whose background was already set by hand keeps that setting; select it and use Reset to default to pick up the theme.

## Updating

```powershell
cd $HOME\powerbi-kit
git pull
Copy-Item -Recurse -Force skills\neo-powerbi $HOME\.claude\skills\
```
