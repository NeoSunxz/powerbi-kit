# powerbi-kit

[English](README.md) | [中文](README.zh-CN.md)

A personal toolkit for letting AI work directly in Power BI: MCP setup notes, a report-building skill, color themes, custom visuals, and sample data.

> Personal project. It contains only sample data and public information — no work files.

## What's inside

```
powerbi-kit/
├─ docs/setup.md            Set up the Power BI MCP on Windows (Claude Code / WorkBuddy / DeepSeek harness)
├─ skills/neo-powerbi/      Ground rules for building reports: read first, back up before edits, naming, verify numbers, report back
├─ themes/                  4 Power BI themes: oat-latte / forest-gold / mist-blue / navy-blue
├─ visuals/                 Custom visual source: calendar heatmap, dumbbell, waffle, rose chart, bullet chart, image cards, Pareto chart, bump chart
├─ downloads/               8 packaged visuals, ready to import
└─ sample-data/             A fictional coffee-shop sales dataset (2024–2025) plus store targets and product images, for demos only
```

Most docs and the sample data are in Chinese.

## Getting started

1. Follow [docs/setup.md](docs/setup.md) to install Node.js and connect the Power BI MCP.
2. Copy `skills/neo-powerbi` into your AI tool's skills folder (Claude Code: `%USERPROFILE%\.claude\skills\`).
3. Build a demo file from the 3 tables in `sample-data` and run the test in step 4 of setup.md.

## Importing a visual

Download a `.pbiviz` from [downloads/](downloads/), then in Power BI Desktop: Visualizations pane → `…` → Import a visual from a file.

| File | Visual |
|---|---|
| [calendar-heatmap.pbiviz](downloads/calendar-heatmap.pbiviz) | Calendar heatmap: one row per year, one cell per day, darker means higher |
| [dumbbell.pbiviz](downloads/dumbbell.pbiviz) | Dumbbell: compare two points in time |
| [waffle.pbiviz](downloads/waffle.pbiviz) | Waffle: share of total on a 10×10 grid |
| [rose-chart.pbiviz](downloads/rose-chart.pbiviz) | Rose chart: one petal per category, radius shows the value |
| [bullet-chart.pbiviz](downloads/bullet-chart.pbiviz) | Bullet chart: actual vs target |
| [pareto-chart.pbiviz](downloads/pareto-chart.pbiviz) | Pareto chart: bars from high to low plus a cumulative-share line |
| [bump-chart.pbiviz](downloads/bump-chart.pbiviz) | Bump chart: how rankings change over time |
| [image-cards.pbiviz](downloads/image-cards.pbiviz) | Image cards: a ranked card wall with a picture per item |

Which fields go where, with the sample data: [downloads/README.md](downloads/README.md) (in Chinese).

The visuals follow the report theme's colors, support native tooltips and cross-filtering, make no network calls, and collect no data. They are not certified by Microsoft, so some organizations may block them.

## Importing a theme

Power BI Desktop → Design → Import theme, and pick a `.json` from `themes/` (older versions: View → Themes → Browse for themes).
Each theme also sets the canvas background, the wallpaper and the visual background (oat-latte `#EFEBE5`, forest-gold `#0E1916`, mist-blue `#EAEEF3`, navy-blue `#0E1626`). A page or visual whose background was already set by hand keeps that setting; select it and use Reset to default to pick up the theme.

## Updating

```powershell
cd $HOME\powerbi-kit
git pull
Copy-Item -Recurse -Force skills\neo-powerbi $HOME\.claude\skills\
```
