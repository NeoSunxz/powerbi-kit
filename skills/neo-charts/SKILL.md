---
name: neo-charts
description: 把 Excel、CSV 或表格里的数据画成能直接放进汇报的图片（3:4 发手机、16:9 放 PPT），也能把几张图拼成一页数据看板。共 11 种图：条形图、柱形图、折线图、环形图、堆积柱形图、瀑布图、数字卡、哑铃图、华夫饼图、子弹图、日历热力图，3 套配色。用户说「画个图」「做张图表」「汇报用的图」「做个看板」「帮我分析一下这张表」时使用。不懂数据的用户也能用：先问清楚要看什么，再整理数据、出图。
---

# neo-charts：把表格画成汇报用的图和看板

做法：问清楚要看什么 → 读数据、整理数据 → 选图 → 把数据整理成 JSON → 套进本文末尾的网页模板，生成一个 HTML 文件 → 用户用浏览器打开，点按钮下载 PNG。

用户可能完全不懂数据。全程用大白话，不说「维度」「度量」「聚合」「字段」这类词，说「按门店」「加起来」「这一列」。

## 0. 先问清楚要看什么

用户说得很具体（「把各门店销售额画成条形图」），直接做，跳过这一步。

用户只说「帮我做个看板」「分析一下这张表」时，先看一眼数据，再**一次问完**下面 3 个问题，每个问题都给出根据数据猜的选项，让用户选或者改：

1. **给谁看？** 比如：自己看 / 给老板汇报 / 发到群里。决定用一页看板还是几张单图，16:9 还是手机长图。
2. **最关心哪几个数？** 从表里挑 2–4 个，比如「销售额、杯数、客单价」。
3. **和什么比？** 比如：和去年比 / 和目标比 / 和上个月比 / 不比。表里没有对比的数据就直接说没有，不要编。

用户说「你看着办」「不知道」，就按默认做：**经营看板** = 一排数字卡（关键数和对比期）+ 趋势（按月）+ 排名（按门店、产品或人）+ 构成（占比）。做完告诉用户每一块回答了什么问题，哪块不需要可以去掉。

画图代码全在模板里，不联网、不装任何东西。**模板只改 `CHARTS` 那一处**，其余一个字都不要动。

## 1. 读数据、整理数据，不编数

1. 读用户给的文件（Excel / CSV / 粘贴的表格）。看清楚有哪些列、单位是什么、有没有合计行和空行。
2. 图里的每个数都必须来自用户的数据，或者由数据算出来。**不补数、不估数、不四舍五入成好看的整数。**
3. 需要汇总（按月求和、按门店求和、算占比）时，先用一句话告诉用户怎么算的，比如「按门店把 2025 年每天的销售额加起来」。
4. 合计行、小计行不要当成一个类别画进去。

不懂数据的人做的表常有下面这些情况。遇到了就自己整理，**不改原文件**，整理完用一句大白话告诉用户做了什么：

| 情况 | 怎么处理 | 怎么跟用户说（例子） |
|---|---|---|
| 一个文件有好几个 sheet | 先列出每个 sheet 是什么，问用哪个；明显是同一张表按月拆开的，就合起来 | 「1 月到 12 月分在 12 个 sheet 里，我合成了一张」 |
| 合并单元格 | 把合并的值填到每一行 | 「门店名是合并的格子，我给每一行都补上了门店名」 |
| 表头占了好几行、上面有标题和备注 | 找到真正的表头那一行，上面的跳过 | 「从第 3 行开始读，前两行是标题」 |
| 日期是文字或格式不统一 | 统一成年-月-日；认不出的列出来问用户 | 「有 3 行日期写成了『三月五号』，我按 2025-03-05 算的」 |
| 数字里带单位或符号（「12 万」「¥3,200」「15%」） | 换成纯数字，单位写进副标题 | 「销售额去掉了『万』字，单位写在图上」 |
| 同一个东西写法不一样（「人民路店」「人民路」） | 能确定是同一个就合并，拿不准就问 | 「『人民路』和『人民路店』我当成同一家店」 |
| 空行、空格、重复的行 | 空行跳过；完全一样的行先问是不是重复录入 | 「有 2 行一模一样，要不要只算一次？」 |
| 缺数据（某个月没有） | 不补数。折线图断开，柱形图不画那一根，并说明 | 「7 月没有数据，图上这里是空的」 |

## 2. 选图

先想清楚这张图要回答什么问题，再选图。用户指定了图就用用户的。

| 想回答的问题 | 用这个 | kind |
|---|---|---|
| 谁大谁小、排第几 | 条形图 | `bar` |
| 每个月 / 每年是多少（按时间排，一组数） | 柱形图 | `column` |
| 趋势怎么走，几条线对比（按时间排） | 折线图 | `line` |
| 各部分占多少（最多 6 类） | 环形图 / 华夫饼图 | `donut` / `waffle` |
| 每个时间点的总量，以及由哪几部分组成 | 堆积柱形图 | `stacked` |
| 从 A 变到 B，中间各项各加了多少、减了多少 | 瀑布图 | `waterfall` |
| 几个关键数字和对比期比怎么样 | 数字卡 | `kpi` |
| 两个时间点之间，每一项变了多少 | 哑铃图 | `dumbbell` |
| 每一项完成目标了没有 | 子弹图 | `bullet` |
| 一年里每天的高低、淡旺季 | 日历热力图 | `calendar` |
| 好几个问题一页看完 | 看板 | `dashboard` |

几条原则：
- 一张图只回答一个问题。数据能回答好几个问题，就出好几张图。
- 类别没有先后顺序（门店、产品），用条形图，不用柱形图。
- 占比图的各部分加起来必须是一个整体。不是整体的一部分（比如几个互相重叠的指标），不能用环形图或华夫饼图。
- 两组单位不同的数（比如销售额和杯数），分成两张图，不要硬塞进一张。
- 只有 1–2 个数时，用数字卡，不用画图。

## 3. 整理成 JSON

`CHARTS` 是一个数组，每个元素是一张图。每张图都有这几个字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `kind` | 是 | 上表里的英文名 |
| `title` | 是 | 大标题。写结论比写名称好，「外卖快追上堂食了」比「堂食外卖杯数」好。3:4 图里大约放得下 13 个汉字，超出会被截断 |
| `subtitle` | 否 | 小字说明，写单位、时间范围、口径，比如「2025 年，单位：万元」。大约 25 个汉字 |
| `rows` | 是 | 数据，格式见下面每种图 |
| `theme` | 否 | 配色：`latte` 燕麦拿铁（默认）、`mist` 雾霾蓝、`navy` 深夜蓝（深色）。网页上也能一键切换 |
| `file` | 否 | 下载的文件名（不带后缀），比如 `门店销售额` |
| `sign` | 否 | 图片左下角的署名文字，比如 `"XX 门店运营部"`。不写就不显示 |
| `unit` | 否 | 跟在数值后面的短单位，比如 `"万"`、`"%"`。长单位写进 subtitle |

数值写数字或者数字字符串都行（`33.6`、`"33.6"`、`"1,280"`）。下面是每种图的 `rows` 格式和其他字段。

**条形图 `bar`**：`rows: [{name, a}]`。自动从大到小排，最多 15 行。`highlight: "滨江店"` 只突出这一行，其余变灰。
```json
{"kind": "bar", "title": "6 家店谁卖得最多", "subtitle": "2025 年销售额，单位：万元",
 "rows": [{"name": "人民路店", "a": 33.6}, {"name": "滨江店", "a": 45.7}, {"name": "高新园店", "a": 46.9}]}
```

**柱形图 `column`**：`rows: [{name, a}]`。按填的顺序画，最多 24 根，可以有负数。`highlight` 同上。
```json
{"kind": "column", "title": "2025 年每月销售额", "subtitle": "单位：万元", "highlight": "12月",
 "rows": [{"name": "1月", "a": 15.2}, {"name": "2月", "a": 12.1}, {"name": "3月", "a": 16.8}]}
```

**折线图 `line`**：`series` 是线的名字（最多 4 条），`rows: [{name, v: [每条线的数]}]`。按填的顺序画，最多 60 个点；某个点没数据就写 `null`，线会断开。
```json
{"kind": "line", "title": "外卖快追上堂食了", "subtitle": "每月杯数，单位：千杯", "series": ["堂食", "外卖"],
 "rows": [{"name": "1月", "v": [21.4, 9.8]}, {"name": "2月", "v": [17.9, 9.1]}, {"name": "3月", "v": [22.6, 11.5]}]}
```

**环形图 `donut`**：`rows: [{name, a}]`，只画正数。超过 6 类时，第 6 名起合并成「其他」。中间写合计，`totalLabel` 可以改「合计」两个字。
```json
{"kind": "donut", "title": "2025 年销售额构成", "subtitle": "按品类", "unit": "万",
 "rows": [{"name": "咖啡", "a": 161.2}, {"name": "茶饮", "a": 26.9}, {"name": "烘焙", "a": 17.4}]}
```

**堆积柱形图 `stacked`**：`series` 是各部分的名字（最多 5 个，从下往上堆），`rows: [{name, v: [各部分的数]}]`，最多 16 根柱子，只画正数。柱顶写合计。
```json
{"kind": "stacked", "title": "每季度销售额，按渠道", "subtitle": "单位：万元", "series": ["堂食", "外卖", "自提"],
 "rows": [{"name": "一季度", "v": [28.4, 9.6, 6.1]}, {"name": "二季度", "v": [31.2, 13.8, 7.8]}]}
```

**瀑布图 `waterfall`**：`rows` 第一行是起点（比如去年利润），后面每行是增加（正数）或减少（负数），最多 14 行。最后一根柱子自动算出来，名字用 `endLabel`。**算出来的终点要和用户数据里的终点对一下，对不上就说明漏了项，先告诉用户。**
```json
{"kind": "waterfall", "title": "今年利润为什么多了", "subtitle": "单位：万元", "endLabel": "2025 利润",
 "rows": [{"name": "2024 利润", "a": 28.5}, {"name": "销售额增加", "a": 12.6}, {"name": "原料涨价", "a": -4.8}]}
```

**数字卡 `kpi`**：`rows: [{name, a: 本期, b: 对比期（可不填）, unit}]`，最多 6 个。有 `b` 就写涨跌，`labelB` 是涨跌后面那几个字，比如「较去年」。
```json
{"kind": "kpi", "title": "2025 年经营概况", "subtitle": "和 2024 年比", "labelB": "较去年",
 "rows": [{"name": "销售额", "a": 215.3, "b": 204.6, "unit": "万元"}, {"name": "复购率", "a": 38.5, "b": 35.1, "unit": "%"}]}
```

**哑铃图 `dumbbell`**：`rows: [{name, a: 起点, b: 终点}]`，`labelA` / `labelB` 是两个时间点的名字。按终点从大到小排，右边写变化率。最多 8 行效果最好。
```json
{"kind": "dumbbell", "title": "各门店销售额：2024 vs 2025", "subtitle": "单位：万元", "labelA": "2024", "labelB": "2025",
 "rows": [{"name": "人民路店", "a": 31.8, "b": 33.6}, {"name": "滨江店", "a": 42.9, "b": 45.7}]}
```

**华夫饼图 `waffle`**：和环形图一样，`rows: [{name, a}]`，100 格，1 格 = 1%。
```json
{"kind": "waffle", "title": "2025 年销售额构成", "subtitle": "按品类，1 格 = 1%", "unit": "万",
 "rows": [{"name": "咖啡", "a": 161.2}, {"name": "茶饮", "a": 26.9}]}
```

**子弹图 `bullet`**：`rows: [{name, a: 实际, b: 目标}]`。按完成率排，没达标的条是红色。最多 8 行效果最好。
```json
{"kind": "bullet", "title": "2025 年各门店目标完成率", "subtitle": "单位：万元",
 "rows": [{"name": "人民路店", "a": 33.6, "b": 32}, {"name": "高新园店", "a": 46.9, "b": 50}]}
```

**日历热力图 `calendar`**：`rows: [{name: 日期, a: 数值}]`，一天一行。日期认 `2025-01-03`、`2025/1/3`、`2025年1月3日`，也认 Excel 的日期序号。只画数据最多的那一年；同一天有多行会加起来。
```json
{"kind": "calendar", "title": "2025 年每天的销售额", "subtitle": "颜色越深，那天卖得越多", "unit": "元",
 "rows": [{"name": "2025-01-01", "a": 5120}, {"name": "2025-01-02", "a": 4380}]}
```

**看板 `dashboard`**：把 2–7 张图拼成一页。`panels` 里每一项就是一张图，写法和上面的单张图完全一样（`theme`、`file`、`sign` 只写在看板这一层）。
- 第一张是数字卡时，它单独占最上面一整行，这时数字卡一般不写 `title`。
- 其余的图：16:9 横版每行 2–3 张，最多两行；手机长图一张一行，往下排。
- 格子比单张图小，每张图的 `title` 写短一点（10 个字以内），单位写在 `subtitle`。
- 一页里最多 1 排数字卡 + 6 张图。再多就拆成两个看板。
- 下载有两种：16:9（放 PPT、投屏）和手机长图。
```json
{"kind": "dashboard", "title": "2025 年咖啡店经营看板", "subtitle": "6 家门店 · 数据截至 2025-12-31", "file": "经营看板",
 "panels": [
  {"kind": "kpi", "labelB": "较去年", "rows": [{"name": "销售额", "a": 215.3, "b": 204.6, "unit": "万元"}, {"name": "复购率", "a": 38.5, "b": 35.1, "unit": "%"}]},
  {"kind": "column", "title": "12 月卖得最好", "subtitle": "每月销售额，万元", "rows": [{"name": "1月", "a": 15.2}, {"name": "2月", "a": 12.1}]},
  {"kind": "bar", "title": "高新园店第一", "subtitle": "各门店销售额，万元", "rows": [{"name": "人民路店", "a": 33.6}, {"name": "高新园店", "a": 46.9}]},
  {"kind": "donut", "title": "咖啡占四分之三", "subtitle": "销售额构成", "unit": "万", "rows": [{"name": "咖啡", "a": 161.2}, {"name": "茶饮", "a": 26.9}]}
 ]}
```

## 4. 生成网页

1. 把本文末尾「模板」里的整段 HTML 原样写进一个文件，比如 `charts.html`，放在用户的工作目录里。
2. 只把 `var CHARTS = [];` 换成整理好的数组，比如 `var CHARTS = [{...}, {...}];`。其他内容一个字都不要改，也不要删减画图代码。
3. 告诉用户：用浏览器（Chrome、Edge 都行）打开这个文件，每张图下面有「下载 3:4 PNG」和「下载 16:9 PNG」两个按钮（看板是「下载 16:9 PNG」和「下载手机长图 PNG」）；顶部可以一键切换 3 套配色。
4. 如果你能运行无头浏览器（比如 Playwright），可以直接把 PNG 导出来：打开页面，对每个 `<canvas>`（id 是 `chart-序号-3x4` / `chart-序号-16x9`）调用 `toDataURL('image/png')` 存成文件。导出后自己看一遍图。

## 5. 交付时说清楚

用一张表告诉用户每张图（看板就是每一块）：图名、回答什么问题、用了哪些列、怎么汇总的（没汇总就写「原始数据」）。被截掉或合并的数据（超过行数上限、合并成「其他」的类别）、第 1 步里整理过的地方也要写出来。

最后用一两句话说图里最值得注意的地方，只说数据里看得到的（「12 月销售额最高，24 万」「外卖杯数一年涨了一倍」），不猜原因。

## 6. 限制

- 图里的文字用电脑自带的中文字体（Windows 是微软雅黑，Mac 是苹方），不同电脑上字形会有一点差别。
- 每种图有行数上限（见第 3 节），超出的部分不画。数据太多时先汇总或筛选，再画图。
- 这是静态图片，不能在图上点选或筛选；数据更新了要重新生成。需要能筛选、能自动刷新的看板，要用 Power BI 这类工具。
- 数值最多显示一位小数（数字卡里小于 10 的数显示两位），大于 1000 的加千分位。

## 模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>neo-charts</title>
<style>
  body { margin: 0; background: #EFEBE5; color: #2D2A26; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .lead { color: #8C857B; font-size: 14px; margin: 0 0 14px; }
  .themes { margin: 0 0 20px; font-size: 14px; color: #6E675E; }
  .themes button { margin: 0 6px 6px 0; padding: 6px 12px; border: 1px solid #DCD4C8; border-radius: 8px; background: transparent; color: #6E675E; font-size: 14px; cursor: pointer; }
  .themes button.on { background: #FBF9F6; color: #2D2A26; font-weight: 700; border-color: #2A669F; }
  figure { margin: 0 0 28px; background: #FBF9F6; border-radius: 14px; padding: 16px; }
  figcaption { font-weight: 700; margin-bottom: 12px; }
  .pair { display: flex; flex-wrap: wrap; align-items: flex-start; }
  .pair > div { margin: 0 16px 12px 0; }
  canvas { display: block; border-radius: 8px; box-shadow: 0 4px 14px rgba(60,40,20,.12); }
  .c34 { width: 300px; } .c169 { width: 640px; max-width: 100%; }
  .dl { margin-top: 8px; padding: 8px 14px; border: 0; border-radius: 8px; background: #2A669F; color: #fff; font-size: 14px; cursor: pointer; }
</style>
</head>
<body>
<main>
  <h1>neo-charts</h1>
  <p class="lead">每张图有两个尺寸：3:4 适合手机和小红书，16:9 适合放进 PPT。点按钮下载 PNG。</p>
  <div class="themes" id="themes">配色：</div>
  <div id="list"></div>
</main>
<script>
/* ===== 数据：只改这里 ===== */
var CHARTS = [];
/* ===== 以下是画图代码，不要改 ===== */
/* 画图：哑铃图、华夫饼图、子弹图、日历热力图，加上条形、柱形、折线、环形、堆积柱形、瀑布图和数字卡。画布尺寸取自 canvas 本身：1080×1440（小红书 3:4）为基准，
   其他尺寸（如 1920×1080 的 PPT 16:9）按比例 s 缩放。只用 Canvas 2D，ES2017。
   小工具和 neo-charts Skill 共用这一份代码，改这里两边一起变。 */
(function () {
  'use strict';

  var W = 1080, H = 1440, s = 1;

  // 每次画图前按 canvas 尺寸更新 W / H / s
  function setup(ctx) {
    W = ctx.canvas.width;
    H = ctx.canvas.height;
    s = Math.min(W / 1080, H / 1137);
    if (W === 1080 && H === 1440) s = 1;
  }
  function u(n) { return n * s; }
  // 三套配色：燕麦拿铁、雾霾蓝和 powerbi-kit/themes 里的 Power BI 主题同源；深夜蓝是小工具自己的深色
  var THEMES = {
    latte: {
      name: '燕麦拿铁', bg: '#EFEBE5', card: '#FBF9F6', ink: '#2D2A26', ink2: '#8C857B', rule: '#E4DDD3',
      acc: '#2A669F', start: '#B9B1A5', down: '#A95960', shadow: 'rgba(60,40,20,0.10)',
      cats: ['#2A669F', '#CB9054', '#A95960', '#B9A452', '#6D5496', '#4AA076'],
      bands: ['#E2DBD0', '#ECE6DD', '#F5F1EB']
    },
    mist: {
      name: '雾霾蓝', bg: '#EAEEF3', card: '#FFFFFF', ink: '#1B2433', ink2: '#7A8699', rule: '#E3E8EF',
      acc: '#3A5C9B', start: '#B4BDCA', down: '#965582', shadow: 'rgba(27,36,51,0.10)',
      cats: ['#3A5C9B', '#06999A', '#C8AB5B', '#965582', '#DB8F6C', '#715293'],
      bands: ['#DCE2EA', '#E8ECF1', '#F3F5F8']
    }
  };
  THEMES.navy = {
    // 深色：藏青底 + 蓝，和两套浅色同一个蓝色系；6 色过了深色模式的配色校验（相邻对）
    name: '深夜蓝', bg: '#0E1626', card: '#162033', ink: '#E8EDF5', ink2: '#8C9AB0', rule: '#24314A',
    acc: '#3A8CC4', start: '#5A6A84', down: '#CC6646', shadow: 'rgba(0,0,0,0.35)',
    cats: ['#3A8CC4', '#B8892C', '#9080CC', '#CC6646', '#2A9E76', '#A86A3A'],
    bands: ['#26344D', '#1F2B41', '#1A2537']
  };
  THEMES.forest = THEMES.navy; // 旧版存过「墨绿鎏金」的，打开后自动用深夜蓝
  var C = THEMES.latte;
  function useTheme(opt) { C = THEMES[opt && opt.theme] || THEMES.latte; }

  var FONT = '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei",sans-serif';

  function font(size, weight) { return (weight || 400) + ' ' + (size * s) + 'px ' + FONT; }

  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; }

  // 最多一位小数，去掉多余的 0；大数加千分位
  function fmt(v) {
    var a = Math.abs(v), s = a >= 1000 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }
  function pct(v, signed) {
    var s = (Math.round(v * 1000) / 10).toFixed(1) + '%';
    return signed && v > 0 ? '+' + s : s;
  }

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 超出宽度就截断加省略号
  function fit(ctx, text, maxW) {
    text = String(text);
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text + '…';
  }

  // 标题、副标题、卡片、署名：三种图共用。返回卡片内可画图的区域。
  function frame(ctx, opt) {
    if (opt.panel) return panelFrame(ctx, opt);
    setup(ctx);
    useTheme(opt);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink;
    ctx.font = font(68, 700);
    ctx.fillText(fit(ctx, opt.title || '', W - u(144)), u(72), u(168));
    if (opt.subtitle) {
      ctx.fillStyle = C.ink2;
      ctx.font = font(34, 400);
      ctx.fillText(fit(ctx, opt.subtitle, W - u(144)), u(72), u(opt.title ? 228 : 96));
    }

    var top = u(opt.title ? (opt.subtitle ? 290 : 240) : (opt.subtitle ? 140 : 72)), bottom = H - u(opt.sign ? 110 : 72);
    ctx.save();
    ctx.shadowColor = C.shadow;
    ctx.shadowBlur = u(44);
    ctx.shadowOffsetY = u(18);
    ctx.fillStyle = C.card;
    rr(ctx, u(60), top, W - u(120), bottom - top, u(36));
    ctx.fill();
    ctx.restore();

    if (opt.sign) {
      ctx.fillStyle = C.ink2;
      ctx.font = font(26, 500);
      ctx.textAlign = 'left';
      ctx.fillText(typeof opt.sign === 'string' ? opt.sign : 'NeoSun · 汇报图表小工具', u(72), H - u(48));
    }
    return { x: u(116), y: top + u(56), w: W - u(232), h: bottom - top - u(112) };
  }

  function dot(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function legend(ctx, items, x, y) {
    ctx.font = font(30, 400);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    items.forEach(function (it) {
      dot(ctx, x + u(12), y, u(12), it.color);
      ctx.fillStyle = C.ink2;
      ctx.fillText(it.label, x + u(34), y);
      x += u(34) + ctx.measureText(it.label).width + u(48);
    });
  }

  // ① 哑铃图：每行一个类别，左点起点、右点终点，按终点从大到小排
  function dumbbell(ctx, d, opt) {
    var a = frame(ctx, opt);
    var rows = d.rows.map(function (r) { return { name: r.name, s: num(r.a), e: num(r.b) }; })
      .filter(function (r) { return r.name && isFinite(r.s) && isFinite(r.e); })
      .sort(function (p, q) { return q.e - p.e; });
    if (!rows.length) return empty(ctx, a, opt);

    var lo = Infinity, hi = -Infinity;
    rows.forEach(function (r) { lo = Math.min(lo, r.s, r.e); hi = Math.max(hi, r.s, r.e); });
    var pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 1;
    lo -= pad; hi += pad;

    var labelW = u(190), chgW = u(150);
    var x0 = a.x + labelW, x1 = a.x + a.w - chgW, top = a.y + u(90);
    var rowH = Math.min(u(150), (a.y + a.h - top) / rows.length);
    top += (a.y + a.h - top - rowH * rows.length) / 2;
    legend(ctx, [{ label: d.labelA || '起点', color: C.start }, { label: d.labelB || '终点', color: C.acc }], a.x, top - u(76));
    var X = function (v) { return x0 + (v - lo) / (hi - lo) * (x1 - x0); };
    var r = Math.max(u(8), Math.min(u(12), rowH * 0.1));

    rows.forEach(function (row, i) {
      var cy = top + rowH * (i + 0.5);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = C.ink;
      ctx.font = font(32, 500);
      ctx.fillText(fit(ctx, row.name, labelW - u(20)), a.x, cy);

      if (i > 0) {
        ctx.strokeStyle = C.rule;
        ctx.lineWidth = u(1.5);
        ctx.beginPath(); ctx.moveTo(a.x, cy - rowH / 2); ctx.lineTo(a.x + a.w, cy - rowH / 2); ctx.stroke();
      }

      var up = row.e >= row.s, col = up ? C.acc : C.down;
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(u(5), r * 0.55);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X(row.s), cy); ctx.lineTo(X(row.e), cy); ctx.stroke();
      ctx.globalAlpha = 1;
      dot(ctx, X(row.s), cy, r, C.start);
      dot(ctx, X(row.e), cy, r, col);

      // 终点数值放在终点上方
      ctx.font = font(24, 400);
      ctx.fillStyle = C.ink2;
      ctx.textAlign = 'center';
      ctx.fillText(fmt(row.e), X(row.e), cy - r - u(18));

      // 右侧：变化率，带 ▲▼
      var chg = row.s !== 0 ? (row.e - row.s) / Math.abs(row.s) : 0;
      ctx.textAlign = 'right';
      ctx.font = font(30, 700);
      ctx.fillStyle = col;
      ctx.fillText((up ? '▲ ' : '▼ ') + pct(Math.abs(chg)), a.x + a.w, cy);
    });
  }

  // 占比类（华夫饼图、环形图）共用：按大小排，超过 6 类时第 6 类起合并成「其他」；
  // 最大余数法把 100% 分成整数，加起来正好 100
  function shares(d) {
    var rows = d.rows.map(function (r) { return { name: r.name, v: num(r.a) }; })
      .filter(function (r) { return r.name && isFinite(r.v) && r.v > 0; })
      .sort(function (p, q) { return q.v - p.v; });
    if (rows.length > 6) {
      var rest = rows.slice(5).reduce(function (t, r) { return t + r.v; }, 0);
      rows = rows.slice(0, 5).concat([{ name: '其他', v: rest }]);
    }
    var total = rows.reduce(function (t, r) { return t + r.v; }, 0);
    rows.forEach(function (r) { r.raw = r.v / total * 100; r.n = Math.floor(r.raw); });
    var left = 100 - rows.reduce(function (t, r) { return t + r.n; }, 0);
    rows.slice().sort(function (p, q) { return (q.raw - q.n) - (p.raw - p.n); })
      .slice(0, left).forEach(function (r) { r.n += 1; });
    rows.total = total;
    return rows;
  }

  // 占比图例：色块 + 名称 + 占比（大字）+ 数值。竖版在图下面（两列），横版在图右边（一列）。
  // gx / gy / size 是左边（或上面）那块图形占的正方形
  function shareLegend(ctx, rows, d, a, wide, gx, gy, size) {
    var cols = wide ? 1 : 2, colW, lx, ly, lh;
    if (wide) {
      lx = gx + size + u(90); colW = Math.min(a.x + a.w - lx + u(70), u(620));
      lh = Math.min(u(120), size / rows.length);
      ly = gy + (size - lh * (rows.length - 1)) / 2 - u(19);
    } else {
      lx = a.x; colW = a.w / 2; ly = gy + size + u(70);
      lh = Math.min(u(110), (a.y + a.h - ly) / Math.ceil(rows.length / 2));
    }
    rows.forEach(function (r, i) {
      var c = i % cols, x = lx + c * colW + (c ? u(30) : 0), y = ly + Math.floor(i / cols) * lh;
      ctx.fillStyle = C.cats[i % C.cats.length];
      rr(ctx, x, y - u(16), u(32), u(32), u(7)); ctx.fill();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = C.ink;
      ctx.font = font(32, 500);
      ctx.fillText(fit(ctx, r.name, colW - u(250)), x + u(48), y);
      ctx.font = font(36, 700);
      ctx.textAlign = 'right';
      ctx.fillText(r.n + '%', x + colW - u(70), y);
      ctx.font = font(24, 400);
      ctx.fillStyle = C.ink2;
      ctx.textAlign = 'left';
      ctx.fillText(fmt(r.v) + (d.unit || ''), x + u(48), y + u(38));
    });
  }

  // ② 华夫饼图：10×10，1 格 = 1%，按大小排，从左上往右填
  function waffle(ctx, d, opt) {
    var a = frame(ctx, opt);
    var rows = shares(d);
    if (!rows.length) return empty(ctx, a, opt);

    var wide = a.w > a.h * 1.2;
    var size = wide ? Math.min(a.h - u(20), a.w * 0.5) : Math.min(a.w - u(40), u(640));
    var gap = size * 0.018, cell = (size - gap * 9) / 10;
    var gx = wide ? a.x + u(10) : a.x + (a.w - size) / 2, gy = wide ? a.y + (a.h - size) / 2 : a.y + u(10);
    var k = 0;
    rows.forEach(function (r, ci) {
      for (var j = 0; j < r.n; j++, k++) {
        var row = Math.floor(k / 10), col = k % 10;
        ctx.fillStyle = C.cats[ci % C.cats.length];
        rr(ctx, gx + col * (cell + gap), gy + row * (cell + gap), cell, cell, cell * 0.18);
        ctx.fill();
      }
    });
    shareLegend(ctx, rows, d, a, wide, gx, gy, size);
  }

  // ③ 子弹图：横轴是完成率，底下三段色带（<80%、80–100%、>100%），竖线是目标，没达标的条用红色
  function bullet(ctx, d, opt) {
    var a = frame(ctx, opt);
    var rows = d.rows.map(function (r) { return { name: r.name, v: num(r.a), t: num(r.b) }; })
      .filter(function (r) { return r.name && isFinite(r.v) && isFinite(r.t) && r.t > 0; });
    rows.forEach(function (r) { r.rate = r.v / r.t; });
    rows.sort(function (p, q) { return q.rate - p.rate; });
    if (!rows.length) return empty(ctx, a, opt);

    var maxRate = Math.max(1.2, Math.ceil(Math.max.apply(null, rows.map(function (r) { return r.rate; })) * 10) / 10);

    var labelW = u(170), rateW = u(150);
    var x0 = a.x + labelW, x1 = a.x + a.w - rateW, top = a.y + u(90), bottomAxis = u(56);
    var rowH = Math.min(u(150), (a.y + a.h - top - bottomAxis) / rows.length);
    top += (a.y + a.h - top - bottomAxis - rowH * rows.length) / 2;
    var ly = top - u(76);
    legend(ctx, [{ label: '达标', color: C.acc }, { label: '未达标', color: C.down }], a.x, ly);
    ctx.fillStyle = C.ink;
    ctx.fillRect(a.x + a.w - u(250), ly - u(18), u(6), u(36));
    ctx.fillStyle = C.ink2;
    ctx.font = font(30, 400);
    ctx.textAlign = 'left';
    ctx.fillText('目标', a.x + a.w - u(232), ly);
    var X = function (v) { return x0 + Math.min(v, maxRate) / maxRate * (x1 - x0); };
    var bandH = Math.min(u(64), rowH * 0.58), barH = bandH * 0.38;

    rows.forEach(function (row, i) {
      var cy = top + rowH * (i + 0.5);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = C.ink;
      ctx.font = font(32, 500);
      ctx.fillText(fit(ctx, row.name, labelW - u(20)), a.x, cy);

      ctx.fillStyle = C.bands[0]; ctx.fillRect(x0, cy - bandH / 2, X(0.8) - x0, bandH);
      ctx.fillStyle = C.bands[1]; ctx.fillRect(X(0.8), cy - bandH / 2, X(1) - X(0.8), bandH);
      ctx.fillStyle = C.bands[2]; ctx.fillRect(X(1), cy - bandH / 2, x1 - X(1), bandH);

      var hit = row.rate >= 1;
      ctx.fillStyle = hit ? C.acc : C.down;
      ctx.fillRect(x0, cy - barH / 2, Math.max(u(2), X(row.rate) - x0), barH);
      ctx.fillStyle = C.ink;
      ctx.fillRect(X(1) - u(3), cy - bandH / 2 - u(6), u(6), bandH + u(12));

      ctx.textAlign = 'right';
      ctx.font = font(32, 700);
      ctx.fillStyle = hit ? C.acc : C.down;
      ctx.fillText(pct(row.rate), a.x + a.w, cy - u(14));
      ctx.font = font(22, 400);
      ctx.fillStyle = C.ink2;
      ctx.fillText(fmt(row.v) + ' / ' + fmt(row.t), a.x + a.w, cy + u(22));
    });

    var ay = top + rowH * rows.length + u(34);
    ctx.font = font(24, 400);
    ctx.fillStyle = C.ink2;
    ctx.textAlign = 'center';
    [0, 0.8, 1].concat(maxRate > 1.25 ? [maxRate] : [1.2]).forEach(function (t) {
      ctx.fillText(Math.round(t * 100) + '%', X(t), ay);
    });
  }

  // 日期：认 2025-01-03、2025/1/3、2025.1.3、2025年1月3日，也认 Excel 的日期序号（如 45658）
  function parseDate(v) {
    var t = String(v).trim(), m = t.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) {
      var y = +m[1], mo = +m[2], d = +m[3];
      var dt = new Date(Date.UTC(y, mo - 1, d));
      if (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) return { y: y, m: mo, d: d };
      return null;
    }
    if (/^\d{5}(\.\d+)?$/.test(t) && +t > 20000 && +t < 80000) {
      var e = new Date(Date.UTC(1899, 11, 30) + Math.floor(+t) * 86400000);
      return { y: e.getUTCFullYear(), m: e.getUTCMonth() + 1, d: e.getUTCDate() };
    }
    return null;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(p) { return p.y + '-' + pad2(p.m) + '-' + pad2(p.d); }

  function mix(c1, c2, t) {
    var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    var ch = function (sh) { var x = (a >> sh) & 255, y = (b >> sh) & 255; return Math.round(x + (y - x) * t); };
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
  }

  // ④ 日历热力图：12 个小月历拼成一年，竖版 3×4、横版 6×2；颜色越深数越大，没数据的日子用浅灰
  function calendar(ctx, d, opt) {
    var a = frame(ctx, opt);
    var byYear = {}, vals = {};
    d.rows.forEach(function (r) {
      var p = parseDate(r.name), v = num(r.a);
      if (!p || !isFinite(v)) return;
      byYear[p.y] = (byYear[p.y] || 0) + 1;
      var k = dateKey(p);
      vals[k] = (vals[k] || 0) + v;
    });
    var year = 0, most = 0;
    Object.keys(byYear).forEach(function (y) { if (byYear[y] > most) { most = byYear[y]; year = +y; } });
    if (!year) return empty(ctx, a, opt);

    var lo = Infinity, hi = -Infinity, hiKey = '';
    Object.keys(vals).forEach(function (k) {
      if (+k.slice(0, 4) !== year) return;
      if (vals[k] < lo) lo = vals[k];
      if (vals[k] > hi) { hi = vals[k]; hiKey = k; }
    });
    // 单色由浅到深：卡片底色混 12% 强调色 → 纯强调色
    var color = function (v) { return mix(C.card, C.acc, hi > lo ? 0.12 + 0.88 * (v - lo) / (hi - lo) : 1); };

    // 图例：少 □□□□□ 多，右边写最低 / 最高
    var ly = a.y + u(14), sw = u(26);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = font(26, 400);
    ctx.fillStyle = C.ink2;
    ctx.fillText('少', a.x, ly);
    var lx = a.x + u(40);
    for (var i = 0; i < 5; i++) {
      ctx.fillStyle = mix(C.card, C.acc, 0.12 + 0.88 * i / 4);
      rr(ctx, lx + i * (sw + u(6)), ly - sw / 2, sw, sw, u(5)); ctx.fill();
    }
    ctx.fillStyle = C.ink2;
    ctx.fillText('多', lx + 5 * (sw + u(6)) + u(8), ly);
    ctx.textAlign = 'right';
    ctx.fillText('最低 ' + fmt(lo) + (d.unit || '') + '  ·  最高 ' + fmt(hi) + (d.unit || ''), a.x + a.w, ly);

    var wide = a.w > a.h * 1.2, cols = wide ? 6 : 3, rowsN = 12 / cols;
    var top = ly + u(60), gapX = u(34), gapY = u(26), head = u(40);
    var cell = Math.min((a.w - gapX * (cols - 1)) / cols / 7,
      ((a.y + a.h - top - gapY * (rowsN - 1)) / rowsN - head) / 6.7);
    var mw = cell * 7, mh = head + cell * 6.7;
    var gx = a.x + (a.w - (mw * cols + gapX * (cols - 1))) / 2;
    var gy = top + ((a.y + a.h - top) - (mh * rowsN + gapY * (rowsN - 1))) / 2;
    var WD = ['一', '二', '三', '四', '五', '六', '日'], inset = Math.max(1, cell * 0.08);

    for (var mo = 1; mo <= 12; mo++) {
      var bx = gx + ((mo - 1) % cols) * (mw + gapX), by = gy + Math.floor((mo - 1) / cols) * (mh + gapY);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.ink;
      ctx.font = font(26, 700);
      ctx.fillText(mo + '月', bx + inset, by + u(24));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font(Math.min(18, cell / s * 0.42), 400);
      ctx.fillStyle = C.ink2;
      WD.forEach(function (w, j) { ctx.fillText(w, bx + cell * (j + 0.5), by + head - cell * 0.05); });

      var first = (new Date(Date.UTC(year, mo - 1, 1)).getUTCDay() + 6) % 7;
      var days = new Date(Date.UTC(year, mo, 0)).getUTCDate();
      for (var dd = 1; dd <= days; dd++) {
        var idx = first + dd - 1, cx = bx + (idx % 7) * cell, cy = by + head + cell * 0.45 + Math.floor(idx / 7) * cell;
        var key = year + '-' + pad2(mo) + '-' + pad2(dd), v = vals[key];
        ctx.fillStyle = v === undefined ? C.rule : color(v);
        rr(ctx, cx + inset, cy + inset, cell - inset * 2, cell - inset * 2, cell * 0.18);
        ctx.fill();
        if (key === hiKey) {
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = Math.max(1.5, cell * 0.08);
          rr(ctx, cx + inset, cy + inset, cell - inset * 2, cell - inset * 2, cell * 0.18);
          ctx.stroke();
        }
      }
    }
  }

  /* ===== 常用图：条形图、柱形图、折线图、环形图、堆积柱形图、瀑布图、数字卡 ===== */

  // 一行里的多个数：rows[i].v 是数组；没有 v 时依次取 a、b、c、d
  function vals(r) { return Array.isArray(r.v) ? r.v : [r.a, r.b, r.c, r.d]; }

  // 坐标轴刻度：步长取 1 / 2 / 2.5 / 5 × 10^n，首尾刻度包住数据
  function ticks(lo, hi, n) {
    if (hi === lo) { hi = lo + (Math.abs(lo) || 1); }
    var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), r = raw / mag;
    var step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
    var out = [], t0 = Math.floor(lo / step + 1e-9), t1 = Math.ceil(hi / step - 1e-9);
    for (var i = t0; i <= t1; i++) out.push(Math.round(i * step * 1e6) / 1e6);
    return out;
  }

  // 轴上的数：大数换成「万」「亿」，省地方
  function short(v, big) {
    if (big >= 1e8) return fmt(v / 1e8) + '亿';
    if (big >= 1e5) return fmt(v / 1e4) + '万';
    return fmt(v);
  }

  // 条形：只把离基线远的那一头做成圆角（side：r 右、l 左、t 上、b 下）
  function dataBar(ctx, x, y, w, h, r, side) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    r = Math.min(r, w / 2, h / 2);
    var tl = 0, tr = 0, br = 0, bl = 0;
    if (side === 'r') { tr = br = r; } else if (side === 'l') { tl = bl = r; }
    else if (side === 't') { tl = tr = r; } else { bl = br = r; }
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.arcTo(x + w, y, x + w, y + h, tr);
    ctx.arcTo(x + w, y + h, x, y + h, br);
    ctx.arcTo(x, y + h, x, y, bl);
    ctx.arcTo(x, y, x + w, y, tl);
    ctx.closePath();
  }

  // 纵轴：浅色网格线 + 左边刻度，0 那条线深一点。返回把数值换成 y 坐标的函数
  function yAxis(ctx, x0, x1, top, bottom, tk) {
    var lo = tk[0], hi = tk[tk.length - 1], big = Math.max(Math.abs(lo), Math.abs(hi));
    var Y = function (v) { return bottom - (v - lo) / (hi - lo) * (bottom - top); };
    ctx.font = font(24, 400);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    tk.forEach(function (t) {
      ctx.strokeStyle = t === 0 ? C.ink2 : C.rule;
      ctx.lineWidth = u(t === 0 ? 2 : 1.5);
      ctx.beginPath(); ctx.moveTo(x0, Y(t)); ctx.lineTo(x1, Y(t)); ctx.stroke();
      ctx.fillStyle = C.ink2;
      ctx.fillText(short(t, big), x0 - u(14), Y(t));
    });
    return Y;
  }
  function yAxisWidth(ctx, tk) {
    var big = Math.max(Math.abs(tk[0]), Math.abs(tk[tk.length - 1]));
    ctx.font = font(24, 400);
    return Math.max.apply(null, tk.map(function (t) { return ctx.measureText(short(t, big)).width; })) + u(14);
  }

  // 横轴类别名：放不下先折成两行，再缩字号，还放不下就隔几个写一个
  function xLabels(ctx, names, X, y, slot) {
    var fs = 26, lines = names.map(function (n) { return [String(n)]; });
    var widest = function () {
      ctx.font = font(fs, 400);
      return Math.max.apply(null, lines.map(function (l) {
        return Math.max.apply(null, l.map(function (t) { return ctx.measureText(t).width; }));
      }));
    };
    var w = widest();
    if (w > slot * 0.92) {
      lines = names.map(function (n) {
        n = String(n);
        var sp = n.indexOf(' '), cut = sp > 0 ? sp : Math.ceil(n.length / 2);
        return n.length > 3 ? [n.slice(0, cut).trim(), n.slice(cut).trim()] : [n];
      });
      w = widest();
    }
    while (w > slot * 0.92 && fs > 18) { fs -= 2; w = widest(); }
    var step = Math.max(1, Math.ceil(w / (slot * 0.92)));
    ctx.fillStyle = C.ink2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach(function (l, i) {
      if (i % step) return;
      l.forEach(function (t, j) { ctx.fillText(t, X(i), y + j * u(fs * 1.25)); });
    });
  }

  // 有多个系列时用：系列名 + 每个类别一组数
  function seriesRows(d, maxS, maxRows) {
    var names = (d.series && d.series.length ? d.series : [d.labelA || '数值']).slice(0, maxS);
    var rows = d.rows.filter(function (r) { return r.name !== undefined && r.name !== ''; }).slice(0, maxRows)
      .map(function (r) { var v = vals(r); return { name: String(r.name), v: names.map(function (_, k) { return num(v[k]); }) }; });
    return { names: names, rows: rows };
  }

  // ⑤ 条形图：横向，从大到小排，数值写在条的末端。d.highlight 写了某一行的名字，就只突出那一行
  function bar(ctx, d, opt) {
    var a = frame(ctx, opt);
    var rows = d.rows.map(function (r) { return { name: r.name, v: num(r.a) }; })
      .filter(function (r) { return r.name && isFinite(r.v); })
      .sort(function (p, q) { return q.v - p.v; }).slice(0, 15);
    if (!rows.length) return empty(ctx, a, opt);

    var lo = Math.min(0, rows[rows.length - 1].v), hi = Math.max(0, rows[0].v);
    var unit = d.unit || '';
    ctx.font = font(30, 700);
    var valW = Math.max.apply(null, rows.map(function (r) { return ctx.measureText(fmt(r.v) + unit).width; })) + u(24);
    var labelW = u(190), x0 = a.x + labelW + (lo < 0 ? valW : 0), x1 = a.x + a.w - (hi > 0 ? valW : 0);
    var X = function (v) { return x0 + (v - lo) / (hi - lo || 1) * (x1 - x0); };
    var rowH = Math.min(u(110), a.h / rows.length), top = a.y + (a.h - rowH * rows.length) / 2;
    var barH = Math.min(u(52), rowH * 0.56);

    rows.forEach(function (row, i) {
      var cy = top + rowH * (i + 0.5);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = C.ink;
      ctx.font = font(32, 500);
      ctx.fillText(fit(ctx, row.name, labelW - u(20)), a.x, cy);

      ctx.fillStyle = !d.highlight || row.name === d.highlight ? C.acc : C.start;
      dataBar(ctx, X(0), cy - barH / 2, Math.max(u(2), Math.abs(X(row.v) - X(0))) * (row.v < 0 ? -1 : 1), barH, u(8), row.v < 0 ? 'l' : 'r');
      ctx.fill();

      ctx.fillStyle = C.ink;
      ctx.font = font(30, 700);
      ctx.textAlign = row.v < 0 ? 'right' : 'left';
      ctx.fillText(fmt(row.v) + unit, X(row.v) + (row.v < 0 ? -u(14) : u(14)), cy);
    });
    if (lo < 0) {
      ctx.strokeStyle = C.ink2;
      ctx.lineWidth = u(2);
      ctx.beginPath(); ctx.moveTo(X(0), top); ctx.lineTo(X(0), top + rowH * rows.length); ctx.stroke();
    }
  }

  // ⑥ 柱形图：按填的顺序排（适合月份、年份），柱顶写数值；柱子太密时只写最高、最低和最后一根
  function column(ctx, d, opt) {
    var a = frame(ctx, opt);
    var rows = d.rows.map(function (r) { return { name: r.name, v: num(r.a) }; })
      .filter(function (r) { return r.name !== undefined && r.name !== '' && isFinite(r.v); }).slice(0, 24);
    if (!rows.length) return empty(ctx, a, opt);

    var vs = rows.map(function (r) { return r.v; });
    var tk = ticks(Math.min(0, Math.min.apply(null, vs)), Math.max(0, Math.max.apply(null, vs)), 5);
    var x0 = a.x + yAxisWidth(ctx, tk), x1 = a.x + a.w, top = a.y + u(50), bottom = a.y + a.h - u(80);
    var Y = yAxis(ctx, x0, x1, top, bottom, tk);
    var slot = (x1 - x0) / rows.length, bw = Math.min(u(96), slot * 0.62);
    var X = function (i) { return x0 + slot * (i + 0.5); };

    var unit = d.unit || '', fs = Math.max(18, Math.min(26, slot / s * 0.34));
    ctx.font = font(fs, 700);
    var crowded = rows.some(function (r) { return ctx.measureText(fmt(r.v) + unit).width > slot * 0.96; });
    var iMax = vs.indexOf(Math.max.apply(null, vs)), iMin = vs.indexOf(Math.min.apply(null, vs));

    rows.forEach(function (r, i) {
      ctx.fillStyle = !d.highlight || r.name === d.highlight ? C.acc : C.start;
      dataBar(ctx, X(i) - bw / 2, Y(0), bw, Y(r.v) - Y(0) || -u(2), u(8), r.v < 0 ? 'b' : 't');
      ctx.fill();
      if (crowded && i !== iMax && i !== iMin && i !== rows.length - 1 && r.name !== d.highlight) return;
      ctx.font = font(fs, 700);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = r.v < 0 ? 'top' : 'bottom';
      ctx.fillText(fmt(r.v) + unit, X(i), Y(r.v) + (r.v < 0 ? u(10) : -u(10)));
    });
    xLabels(ctx, rows.map(function (r) { return r.name; }), X, bottom + u(16), slot);
  }

  // ⑦ 折线图：最多 4 条线，按填的顺序排；线的末端直接写系列名和最后一个数。只有一条线时下面铺一层浅色
  function line(ctx, d, opt) {
    var a = frame(ctx, opt);
    var sr = seriesRows(d, 4, 60), names = sr.names, rows = sr.rows;
    var all = [];
    rows.forEach(function (r) { r.v.forEach(function (v) { if (isFinite(v)) all.push(v); }); });
    if (!all.length) return empty(ctx, a, opt);

    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (lo >= 0 && lo <= hi * 0.4) lo = 0;
    var tk = ticks(lo, hi, 5), unit = d.unit || '', multi = names.length > 1;
    var top = a.y + (multi ? u(110) : u(50)), bottom = a.y + a.h - u(80);
    if (multi) legend(ctx, names.map(function (n, k) { return { label: n, color: C.cats[k] }; }), a.x, a.y + u(14));

    // 右边留出末端标签的位置
    var ends = names.map(function (n, k) {
      for (var i = rows.length - 1; i >= 0; i--) if (isFinite(rows[i].v[k])) return { k: k, i: i, v: rows[i].v[k] };
      return null;
    }).filter(Boolean);
    ctx.font = font(28, 700);
    var endW = Math.max.apply(null, ends.map(function (e) { return ctx.measureText(fmt(e.v) + unit).width; }));
    if (multi) {
      ctx.font = font(24, 400);
      endW = Math.max(endW, Math.max.apply(null, ends.map(function (e) { return ctx.measureText(names[e.k]).width; })));
    }
    var x0 = a.x + yAxisWidth(ctx, tk), x1 = a.x + a.w - endW - u(30);
    var Y = yAxis(ctx, x0, x1, top, bottom, tk);
    var n = rows.length, pad = u(24);
    var X = function (i) { return n === 1 ? (x0 + x1) / 2 : x0 + pad + i / (n - 1) * (x1 - x0 - pad * 2); };

    names.forEach(function (_, k) {
      var col = C.cats[k];
      // 连续有数的点分成一段一段；缺数的地方断开
      var segs = [], cur = [];
      rows.forEach(function (r, i) {
        if (isFinite(r.v[k])) cur.push(i); else if (cur.length) { segs.push(cur); cur = []; }
      });
      if (cur.length) segs.push(cur);
      if (!multi) {
        var base = Y(tk[0] > 0 ? tk[0] : 0);
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = col;
        segs.forEach(function (sg) {
          if (sg.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(X(sg[0]), base);
          sg.forEach(function (i) { ctx.lineTo(X(i), Y(rows[i].v[k])); });
          ctx.lineTo(X(sg[sg.length - 1]), base);
          ctx.closePath();
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      // 孤零零的一个点画成小圆点，不然看不见
      segs.forEach(function (sg) { if (sg.length === 1) dot(ctx, X(sg[0]), Y(rows[sg[0]].v[k]), u(6), col); });
      ctx.strokeStyle = col;
      ctx.lineWidth = u(5);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      var pen = false;
      rows.forEach(function (r, i) {
        if (!isFinite(r.v[k])) { pen = false; return; }
        if (pen) ctx.lineTo(X(i), Y(r.v[k])); else ctx.moveTo(X(i), Y(r.v[k]));
        pen = true;
      });
      ctx.stroke();
    });

    // 末端：圆点 + 标签，标签上下挤开，不重叠
    var labs = ends.map(function (e) { return { e: e, y: Y(e.v) }; }).sort(function (p, q) { return p.y - q.y; });
    var gap = multi ? u(62) : u(36);
    for (var j = 1; j < labs.length; j++) labs[j].y = Math.max(labs[j].y, labs[j - 1].y + gap);
    var over = labs.length ? labs[labs.length - 1].y - bottom : 0;
    if (over > 0) labs.forEach(function (l) { l.y -= over; });
    labs.forEach(function (l) {
      var e = l.e, col = C.cats[e.k];
      dot(ctx, X(e.i), Y(e.v), u(11), C.card);
      dot(ctx, X(e.i), Y(e.v), u(8), col);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.ink;
      ctx.font = font(28, 700);
      ctx.fillText(fmt(e.v) + unit, X(e.i) + u(22), multi ? l.y - u(14) : l.y);
      if (multi) {
        ctx.font = font(24, 400);
        ctx.fillStyle = C.ink2;
        ctx.fillText(names[e.k], X(e.i) + u(22), l.y + u(16));
      }
    });
    xLabels(ctx, rows.map(function (r) { return r.name; }), X, bottom + u(16), (x1 - x0) / Math.max(1, n));
  }

  // ⑧ 环形图：和华夫饼图同一套占比算法和图例，中间写合计
  function donut(ctx, d, opt) {
    var a = frame(ctx, opt);
    var rows = shares(d);
    if (!rows.length) return empty(ctx, a, opt);

    var wide = a.w > a.h * 1.2;
    var size = wide ? Math.min(a.h - u(20), a.w * 0.5) : Math.min(a.w - u(40), u(600));
    var gx = wide ? a.x + u(10) : a.x + (a.w - size) / 2, gy = wide ? a.y + (a.h - size) / 2 : a.y + u(10);
    var cx = gx + size / 2, cy = gy + size / 2, R = size / 2, th = R * 0.32, mid = R - th / 2;
    var ang = -Math.PI / 2, cuts = [];
    rows.forEach(function (r, i) {
      var sweep = r.v / rows.total * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, mid, ang, ang + sweep);
      ctx.strokeStyle = C.cats[i % C.cats.length];
      ctx.lineWidth = th;
      ctx.lineCap = 'butt';
      ctx.stroke();
      cuts.push(ang);
      ang += sweep;
    });
    // 扇区之间留一道底色缝
    if (rows.length > 1) cuts.forEach(function (t) {
      ctx.strokeStyle = C.card;
      ctx.lineWidth = u(6);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(t) * (R - th - u(2)), cy + Math.sin(t) * (R - th - u(2)));
      ctx.lineTo(cx + Math.cos(t) * (R + u(2)), cy + Math.sin(t) * (R + u(2)));
      ctx.stroke();
    });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.ink2;
    ctx.font = font(28, 400);
    ctx.fillText(d.totalLabel || '合计', cx, cy - u(40));
    ctx.fillStyle = C.ink;
    ctx.font = font(Math.min(64, (R - th) / s * 0.42), 700);
    ctx.fillText(fit(ctx, fmt(rows.total) + (d.unit || ''), (R - th) * 1.7), cx, cy + u(18));
    shareLegend(ctx, rows, d, a, wide, gx, gy, size);
  }

  // ⑨ 堆积柱形图：最多 5 个系列，从下往上按系列顺序堆，柱顶写合计
  function stacked(ctx, d, opt) {
    var a = frame(ctx, opt);
    var sr = seriesRows(d, 5, 16), names = sr.names, rows = sr.rows;
    rows.forEach(function (r) {
      r.v = r.v.map(function (v) { return isFinite(v) && v > 0 ? v : 0; });
      r.t = r.v.reduce(function (t, v) { return t + v; }, 0);
    });
    if (!rows.length || !rows.some(function (r) { return r.t > 0; })) return empty(ctx, a, opt);

    legend(ctx, names.map(function (n, k) { return { label: n, color: C.cats[k] }; }), a.x, a.y + u(14));
    var tk = ticks(0, Math.max.apply(null, rows.map(function (r) { return r.t; })), 5);
    var x0 = a.x + yAxisWidth(ctx, tk), x1 = a.x + a.w, top = a.y + u(110), bottom = a.y + a.h - u(80);
    var Y = yAxis(ctx, x0, x1, top, bottom, tk);
    var slot = (x1 - x0) / rows.length, bw = Math.min(u(110), slot * 0.62), unit = d.unit || '';
    var X = function (i) { return x0 + slot * (i + 0.5); };
    var fs = Math.max(18, Math.min(26, slot / s * 0.34));

    rows.forEach(function (r, i) {
      var cum = 0, lastK = -1;
      r.v.forEach(function (v, k) { if (v > 0) lastK = k; });
      r.v.forEach(function (v, k) {
        if (!(v > 0)) return;
        var yb = Y(cum) - (cum > 0 ? u(3) : 0), yt = Y(cum + v);
        ctx.fillStyle = C.cats[k];
        if (k === lastK) dataBar(ctx, X(i) - bw / 2, yb, bw, yt - yb, u(8), 't');
        else { ctx.beginPath(); ctx.rect(X(i) - bw / 2, yt, bw, yb - yt); }
        ctx.fill();
        cum += v;
      });
      ctx.font = font(fs, 700);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      if (ctx.measureText(fmt(r.t) + unit).width < slot * 0.96 || i === rows.length - 1)
        ctx.fillText(fmt(r.t) + unit, X(i), Y(r.t) - u(10));
    });
    xLabels(ctx, rows.map(function (r) { return r.name; }), X, bottom + u(16), slot);
  }

  // ⑩ 瀑布图：第一行是起点（比如去年利润），中间每行是增减，最后一根柱子自动算出终点
  function waterfall(ctx, d, opt) {
    var a = frame(ctx, opt);
    var rows = d.rows.map(function (r) { return { name: r.name, v: num(r.a) }; })
      .filter(function (r) { return r.name && isFinite(r.v); }).slice(0, 14);
    if (!rows.length) return empty(ctx, a, opt);

    var cum = 0, bars = rows.map(function (r, i) {
      if (i === 0) { cum = r.v; return { name: r.name, y0: 0, y1: r.v, v: r.v, total: true }; }
      var b = { name: r.name, y0: cum, y1: cum + r.v, v: r.v };
      cum += r.v;
      return b;
    });
    bars.push({ name: d.endLabel || '合计', y0: 0, y1: cum, v: cum, total: true });
    var ys = [];
    bars.forEach(function (b) { ys.push(b.y0, b.y1); });
    var tk = ticks(Math.min(0, Math.min.apply(null, ys)), Math.max(0, Math.max.apply(null, ys)), 5);
    var TOT = mix(C.card, C.ink, 0.55);
    legend(ctx, [{ label: '增加', color: C.acc }, { label: '减少', color: C.down }, { label: d.totalLegend || '起点 / 合计', color: TOT }],
      a.x, a.y + u(14));
    var x0 = a.x + yAxisWidth(ctx, tk), x1 = a.x + a.w, top = a.y + u(110), bottom = a.y + a.h - u(80);
    var Y = yAxis(ctx, x0, x1, top, bottom, tk);
    var slot = (x1 - x0) / bars.length, bw = Math.min(u(96), slot * 0.64), unit = d.unit || '';
    var X = function (i) { return x0 + slot * (i + 0.5); };
    var fs = Math.max(18, Math.min(26, slot / s * 0.3));

    bars.forEach(function (b, i) {
      if (i > 0) {
        ctx.strokeStyle = C.ink2;
        ctx.lineWidth = u(2);
        ctx.setLineDash([u(6), u(6)]);
        ctx.beginPath(); ctx.moveTo(X(i - 1) + bw / 2, Y(bars[i - 1].y1)); ctx.lineTo(X(i) - bw / 2, Y(bars[i - 1].y1)); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = b.total ? TOT : b.v >= 0 ? C.acc : C.down;
      var yt = Y(Math.max(b.y0, b.y1)), yb = Y(Math.min(b.y0, b.y1));
      ctx.beginPath(); ctx.rect(X(i) - bw / 2, yt, bw, Math.max(u(2), yb - yt)); ctx.fill();
      ctx.font = font(fs, 700);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      var txt = b.total ? fmt(b.v) : (b.v >= 0 ? '+' : '−') + fmt(Math.abs(b.v));
      ctx.fillText(txt + unit, X(i), yt - u(10));
    });
    xLabels(ctx, bars.map(function (b) { return b.name; }), X, bottom + u(16), slot);
  }

  // ⑪ 数字卡：每行一个指标（名称、本期、对比期），最多 6 个；有对比期就写涨跌
  function kpi(ctx, d, opt) {
    var a = frame(ctx, opt);
    var rows = d.rows.map(function (r) { return { name: r.name, v: num(r.a), b: num(r.b), unit: r.unit || d.unit || '' }; })
      .filter(function (r) { return r.name && isFinite(r.v); }).slice(0, 6);
    if (!rows.length) return empty(ctx, a, opt);

    var wide = a.w > a.h * 1.2, n = rows.length;
    var cols = d.cols ? Math.min(d.cols, n) : n === 1 ? 1 : wide ? Math.min(3, n) : 2, rowsN = Math.ceil(n / cols);
    var cw = a.w / cols, ch = Math.min(a.h / rowsN, u(wide ? 420 : 360));
    var gy = a.y + (a.h - ch * rowsN) / 2;
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = u(1.5);
    for (var c = 1; c < cols; c++) {
      ctx.beginPath(); ctx.moveTo(a.x + cw * c, gy + u(20)); ctx.lineTo(a.x + cw * c, gy + ch * rowsN - u(20)); ctx.stroke();
    }
    for (var k = 1; k < rowsN; k++) {
      ctx.beginPath(); ctx.moveTo(a.x, gy + ch * k); ctx.lineTo(a.x + a.w, gy + ch * k); ctx.stroke();
    }
    rows.forEach(function (r, i) {
      var x = a.x + (i % cols) * cw + (i % cols ? u(36) : 0), y = gy + Math.floor(i / cols) * ch, maxW = cw - u(56);
      var cy = y + ch / 2;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.ink2;
      ctx.font = font(30, 500);
      ctx.fillText(fit(ctx, r.name, maxW), x, cy - u(62));
      // 大数字：放不下就缩
      // 小于 10 的数保留两位小数（1.86 万人不能写成 1.9）
      var fs = Math.min(n === 1 ? 160 : 96, ch / s * 0.32), num0 = Math.abs(r.v) < 10 ? String(Math.round(r.v * 100) / 100) : fmt(r.v);
      ctx.font = font(fs, 700);
      var uw = function () { ctx.font = font(fs * 0.4, 500); var w = ctx.measureText(r.unit).width; ctx.font = font(fs, 700); return w; };
      while (fs > 36 && ctx.measureText(num0).width + uw() + u(8) > maxW) { fs -= 4; ctx.font = font(fs, 700); }
      ctx.fillStyle = C.ink;
      ctx.fillText(num0, x, cy + u(fs * 0.38));
      var nw = ctx.measureText(num0).width;
      if (r.unit) {
        ctx.font = font(fs * 0.4, 500);
        ctx.fillStyle = C.ink2;
        ctx.fillText(r.unit, x + nw + u(8), cy + u(fs * 0.38));
      }
      if (isFinite(r.b) && r.b !== 0) {
        var chg = (r.v - r.b) / Math.abs(r.b), up = chg >= 0, flat = Math.abs(chg) < 0.0005;
        ctx.font = font(28, 700);
        ctx.fillStyle = flat ? C.ink2 : up ? C.acc : C.down;
        var t1 = (flat ? '— 持平' : (up ? '▲ ' : '▼ ') + pct(Math.abs(chg))), w1 = ctx.measureText(t1).width, by = cy + u(fs * 0.38) + u(58);
        ctx.fillText(t1, x, by);
        ctx.font = font(26, 400);
        ctx.fillStyle = C.ink2;
        ctx.fillText(fit(ctx, d.labelB || '较上期', maxW - w1 - u(14)), x + w1 + u(14), by);
      }
    });
  }


  /* ===== 看板：几张图拼成一页 ===== */

  // 看板里的一个格子：卡片 + 左上角小标题，返回格子里能画图的区域。字号比例 s 由整页统一定，不随格子大小变
  function panelFrame(ctx, opt) {
    var p = opt.panel;
    s = p.s;
    useTheme(opt);
    ctx.save();
    ctx.shadowColor = C.shadow;
    ctx.shadowBlur = u(30);
    ctx.shadowOffsetY = u(10);
    ctx.fillStyle = C.card;
    rr(ctx, p.x, p.y, p.w, p.h, u(28));
    ctx.fill();
    ctx.restore();
    var pad = u(36), top = u(28);
    if (opt.title) {
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = C.ink;
      ctx.font = font(34, 700);
      var t = fit(ctx, opt.title, p.w - pad * 2);
      ctx.fillText(t, p.x + pad, p.y + u(62));
      if (opt.subtitle) {
        var tw = ctx.measureText(t).width + u(16);
        ctx.font = font(24, 400);
        ctx.fillStyle = C.ink2;
        if (tw < p.w - pad * 2 - u(80)) ctx.fillText(fit(ctx, opt.subtitle, p.w - pad * 2 - tw), p.x + pad + tw, p.y + u(62));
      }
      top = u(96);
    }
    return { x: p.x + pad, y: p.y + top, w: p.w - pad * 2, h: p.h - top - u(30) };
  }

  // 排版：第一个格子是数字卡时单独占一整行；其余的图横版每行 2–3 个，长图每行 1 个。
  // 横版 1920×1080（PPT、投屏），长图宽 1080、高度按格子数算（手机）
  function dashLayout(d, W, H) {
    var panels = (d.panels || []).filter(function (p) { return p && Charts[p.kind] && p.kind !== 'dashboard'; }).slice(0, 7);
    var wideMode = W > H, out = [];
    var kp = panels.length && panels[0].kind === 'kpi' ? panels[0] : null, rest = kp ? panels.slice(1) : panels;
    var nk = kp ? Math.min(6, (kp.rows || []).length) : 0;
    if (wideMode) {
      var k = W / 1920, ps = 0.55 * k, mx = 48 * k, gap = 24 * k;
      var y = 156 * k, bottom = H - (d.sign ? 60 : 40) * k;
      if (kp) {
        var kh = (kp.title ? 250 : 200) * k;
        out.push({ p: kp, cols: nk, r: { x: mx, y: y, w: W - mx * 2, h: kh, s: ps } });
        y += kh + gap;
      }
      var n = rest.length, rowsN = n <= 3 ? 1 : 2, first = Math.ceil(n / rowsN);
      var rh = (bottom - y - gap * (rowsN - 1)) / rowsN, i = 0;
      for (var r = 0; r < rowsN; r++) {
        var m = r === 0 ? first : n - first, cw = (W - mx * 2 - gap * (m - 1)) / m;
        for (var c = 0; c < m; c++, i++) out.push({ p: rest[i], r: { x: mx + c * (cw + gap), y: y + r * (rh + gap), w: cw, h: rh, s: ps } });
      }
      return { panels: out, h: H, page: k, wide: true };
    }
    var k2 = W / 1080, ps2 = 0.9 * k2, mx2 = 48 * k2, gap2 = 32 * k2, y2 = 236 * k2;
    if (kp) {
      var kc = nk <= 3 ? nk : nk === 4 ? 2 : 3, kh2 = ((kp.title ? 130 : 70) + Math.ceil(nk / kc) * 230) * k2;
      out.push({ p: kp, cols: kc, r: { x: mx2, y: y2, w: W - mx2 * 2, h: kh2, s: ps2 } });
      y2 += kh2 + gap2;
    }
    rest.forEach(function (p) {
      var h = (p.kind === 'calendar' ? 820 : 640) * k2;
      out.push({ p: p, r: { x: mx2, y: y2, w: W - mx2 * 2, h: h, s: ps2 } });
      y2 += h + gap2;
    });
    return { panels: out, h: y2 - gap2 + (d.sign ? 100 : 56) * k2, page: k2, wide: false };
  }

  // 长图要多高：先算好再建 canvas
  function dashboardHeight(d, W) { return Math.round(dashLayout(d, W || 1080, Infinity).h); }

  // ⑫ 看板：d.panels 是几张图（写法和单张图一样），横版还是长图看 canvas 的宽高
  function dashboard(ctx, d, opt) {
    setup(ctx);
    useTheme(opt);
    var L = dashLayout(d, W, H), k = L.page;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink;
    var mx = 48 * k;
    ctx.font = (L.wide ? 700 : 700) + ' ' + (L.wide ? 48 : 64) * k + 'px ' + FONT;
    ctx.fillText(fit(ctx, opt.title || '', W - mx * 2), mx, (L.wide ? 82 : 128) * k);
    if (opt.subtitle) {
      ctx.fillStyle = C.ink2;
      ctx.font = '400 ' + (L.wide ? 24 : 32) * k + 'px ' + FONT;
      ctx.fillText(fit(ctx, opt.subtitle, W - mx * 2), mx, (L.wide ? 124 : 186) * k);
    }
    if (!L.panels.length) {
      s = L.wide ? 0.55 * k : 0.9 * k;
      return empty(ctx, { x: 0, y: 0, w: W, h: H }, opt);
    }
    L.panels.forEach(function (it) {
      var p = it.p, dd = p;
      if (it.cols) { dd = {}; for (var key in p) dd[key] = p[key]; dd.cols = it.cols; }
      Charts[p.kind](ctx, dd, { title: p.title, subtitle: p.subtitle, theme: opt.theme, panel: it.r,
        emptyText: opt.emptyText });
    });
    if (opt.sign) {
      ctx.fillStyle = C.ink2;
      ctx.font = '500 ' + (L.wide ? 20 : 26) * k + 'px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(typeof opt.sign === 'string' ? opt.sign : 'NeoSun', mx, H - (L.wide ? 22 : 44) * k);
    }
  }

  function empty(ctx, a, opt) {
    ctx.fillStyle = C.ink2;
    ctx.font = font(34, 400);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opt.emptyText || '填几行数据，图就出来了', a.x + a.w / 2, a.y + a.h / 2);
  }

  window.Charts = { dumbbell: dumbbell, waffle: waffle, bullet: bullet, calendar: calendar,
    bar: bar, column: column, line: line, donut: donut, stacked: stacked, waterfall: waterfall, kpi: kpi,
    dashboard: dashboard, dashboardHeight: dashboardHeight,
    num: num, THEMES: THEMES, parseDate: parseDate, dateKey: dateKey };
})();
(function () {
  var SIZES = [{ key: '3x4', w: 1080, h: 1440, cls: 'c34', label: '下载 3:4 PNG' },
               { key: '16x9', w: 1920, h: 1080, cls: 'c169', label: '下载 16:9 PNG' }];
  var NAMES = { latte: '燕麦拿铁', mist: '雾霾蓝', navy: '深夜蓝' };
  var theme = '';  // 空 = 每张图用自己写的 theme，没写就用燕麦拿铁
  var canvases = [];
  var list = document.getElementById('list');

  function draw(item) {
    var c = item.c;
    Charts[c.kind](item.cv.getContext('2d'), c, { title: c.title, subtitle: c.subtitle, sign: c.sign || false,
      theme: theme || c.theme || 'latte', emptyText: '没有可画的数据' });
  }

  var bar = document.getElementById('themes');
  [''].concat(Object.keys(NAMES)).forEach(function (k) {
    var b = document.createElement('button');
    b.textContent = k ? NAMES[k] : '按各图设置';
    b.className = k === theme ? 'on' : '';
    b.addEventListener('click', function () {
      theme = k;
      Array.prototype.forEach.call(bar.querySelectorAll('button'), function (x) { x.className = x === b ? 'on' : ''; });
      canvases.forEach(draw);
    });
    bar.appendChild(b);
  });

  CHARTS.forEach(function (c, i) {
    if (!Charts[c.kind]) return;
    var fig = document.createElement('figure');
    var cap = document.createElement('figcaption');
    cap.textContent = (i + 1) + '. ' + (c.title || c.kind);
    fig.appendChild(cap);
    var pair = document.createElement('div');
    pair.className = 'pair';
    var sizes = c.kind !== 'dashboard' ? SIZES :
      [{ key: '16x9', w: 1920, h: 1080, cls: 'c169', label: '下载 16:9 PNG' },
       { key: 'long', w: 1080, h: Charts.dashboardHeight(c, 1080), cls: 'c34', label: '下载手机长图 PNG' }];
    sizes.forEach(function (sz) {
      var box = document.createElement('div');
      var cv = document.createElement('canvas');
      cv.width = sz.w; cv.height = sz.h; cv.className = sz.cls;
      cv.id = 'chart-' + (i + 1) + '-' + sz.key;
      var item = { c: c, cv: cv };
      canvases.push(item);
      draw(item);
      var btn = document.createElement('button');
      btn.className = 'dl';
      btn.textContent = sz.label;
      btn.addEventListener('click', function () {
        var a = document.createElement('a');
        a.href = cv.toDataURL('image/png');
        a.download = (c.file || ('chart-' + (i + 1))) + '-' + sz.key + '.png';
        document.body.appendChild(a); a.click(); a.remove();
      });
      box.appendChild(cv); box.appendChild(btn);
      pair.appendChild(box);
    });
    fig.appendChild(pair);
    list.appendChild(fig);
  });
})();
</script>
</body>
</html>
```
