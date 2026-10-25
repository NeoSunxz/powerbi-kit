# Power BI 样式与组件调研（2026-10-25）

资料：微软 Learn 官方文档（报表主题、PBIR、自定义视觉对象、管理员设置），Deneb 与 HTML Content 官网。做样式 skill 前以此为准，细节变了再查。

## 1. 能自定义的样式（从粗到细）

| 层级 | 文件 / 位置 | 能改什么 | AI 能不能直接改 |
|---|---|---|---|
| 报表主题 | 主题 JSON（导入或放在 PBIP 的 `StaticResources/RegisteredResources`） | 数据色、结构色（背景、前景、表格强调色）、文字类（标题、标签、正文字体字号）、`visualStyles` 给每种视觉对象设默认格式、**样式预设**（Style presets，格式面板里出现下拉选项） | 能。官方公开 JSON schema（`powerbi-desktop-samples/Report Theme JSON Schema`），可校验 |
| 页面 | PBIR `definition/pages/<页>/page.json` | 页面尺寸、背景、壁纸、页面级筛选 | 能（PBIR 是公开格式，每个文件有 JSON schema） |
| 单个视觉对象 | PBIR `.../visuals/<视觉>/visual.json` | 位置大小、所有格式面板里的属性（`objects` 节点）、查询字段 | 能。Desktop 打开时改了文件，会提示「Apply external changes」 |
| 条件格式 / 数据驱动 | 度量值 + 格式面板「fx」 | 颜色、图标、数据条、图片 URL | 度量值能用 MCP 建，绑定要改 visual.json |

要点：
- 主题里的 `visualStyles` 结构是 `视觉类型 → 预设名（* 为默认）→ 卡片名 → 属性`。名字和格式面板上显示的不一定一样，以 schema 或 PBIR 文件为准（官方方法：存成 PBIP，在 visual.json 的 `objects` 里找属性名，再换成主题写法）。
- 单个视觉对象手动格式化后，主题不会覆盖它，除非「重置为默认」。所以样式 skill 优先改主题，少改单个 visual.json。
- PBIR 限制：每份报表最多 1000 页、每页 1000 个视觉对象；资源文件总计 300 MB。

## 2. 内置能用的组件

- 比较和趋势：柱形/条形、折线、面积、组合图（可双轴）、丝带图、瀑布图
- 占比：饼图/环形图、树状图、漏斗图
- 分布和关系：散点/气泡/点图、甘特图（预览）
- 表格：表、矩阵
- 地图：多种地图（含 Azure Maps，可用 SVG 当标记）
- 指标：卡片（新卡片支持多卡、图片、参考值）、KPI、仪表、目标
- AI 类：分解树、关键影响因素、智能叙述、异常检测
- 交互和装饰：切片器（按钮、列表、下拉、日期范围）、按钮和导航器、文本框和形状、图片
- 其他：分页报表视觉对象、Power Apps、R / Python 视觉对象、Q&A（2026-12 计划弃用）

## 3. 自定义组件（custom visuals）

三种来源：
1. **AppSource 公开市场**：直接在 Desktop 里「获取更多视觉对象」。有「认证」标记的经过微软代码审查（不访问外部服务）。
2. **组织视觉对象**：管理员统一上架，大家直接用。
3. **自己的 .pbiviz 文件**：从文件导入。PBIP 里这类私有视觉对象放在报表文件夹的 `CustomVisuals/`。

**能不能用 JS 图形库？能，但要打包成 .pbiviz：**
- 官方开发方式：Node.js + `powerbi-visuals-tools`（`pbiviz new` / `pbiviz package`），TypeScript 写，`npm install` 引入外部库，官方示例就是 D3。也可以用 ECharts、Chart.js 等任意 npm 库（官方说明以 D3 为例）。
- 运行在沙箱里；要联网得在 `capabilities.json` 里声明 `WebAccess` 权限，声明了就不能认证。
- 开发调试（开发者模式在 Power BI 服务里预览）需要 Pro 或 PPU 账号；打包好的 .pbiviz 导入 Desktop 用不需要。
- **公司环境的限制**：管理员可以关掉「允许使用 SDK 创建的视觉对象」或只允许认证视觉对象（服务端用租户设置，Desktop 用组策略）。未认证的视觉对象导出 PDF/PPT、邮件订阅、复制粘贴等功能受限。

## 4. 不写 .pbiviz 也能做「代码画图」的路

| 办法 | 怎么画 | 优点 | 限制 |
|---|---|---|---|
| **DAX 生成 SVG** | 度量值拼出 SVG 字符串，数据类别设为 Image URL，放进表格、矩阵、新卡片的图片 | 纯内置，不用装组件，公司环境也能用；官方卡片文档里就有用 DAX 函数画迷你趋势线的例子 | 写 DAX 拼 SVG 比较啰嗦；交互有限 |
| **Deneb**（社区，微软认证，MIT 开源免费） | 写 Vega / Vega-Lite 的 JSON 规格 | 几乎什么图都能画；支持提示框、交叉筛选、钻取；JSON 很适合让 AI 写 | 要从 AppSource 装；要学 Vega 语法（让 AI 写可以绕开） |
| **HTML Content**（社区，MIT） | 用数据或 DAX 生成 HTML / SVG | 能做排版类的卡片、标签 | 完整版未认证；「Secure」版认证，但只支持部分 HTML 和 SVG |
| **Python / R 视觉对象** | 脚本出图 | 统计图方便 | 出来是静态图片，不能点选交叉筛选；服务里有包和 150,000 行限制 |

## 5. 对「样式 skill」的结论

1. **第一优先：主题 JSON**。颜色、字体、每类图的默认格式、样式预设都能写进去，一个文件管全报表，AI 生成后有官方 schema 可以校验。
2. **第二：版式**。改 PBIR 的 page.json / visual.json（位置、尺寸、标题样式），配合官方 `powerbi-report-cli` skill。
3. **想要内置图做不到的图**：优先 DAX + SVG（不装任何东西），其次 Deneb（AI 写 Vega-Lite）。自己写 .pbiviz 成本最高，适合做成固定组件反复用。
4. **读者在公司电脑上可能装不了第三方组件**，内容里要提醒；DAX + SVG 和主题这两条路不受影响。
