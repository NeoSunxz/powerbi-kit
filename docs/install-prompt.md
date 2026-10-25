# 一键安装提示词（复制给 AI 工具）

适用：Windows 电脑，已经有一个支持 MCP 的 AI 工具（Claude Code、WorkBuddy、DeepSeek harness 等）。把下面整段发给它，它会装好微软官方的 Power BI MCP 和 2 个官方 skill（semantic-model-authoring 管建模型，powerbi-report-cli 管报表页面）。

```
帮我在这台 Windows 电脑上装好微软官方的 Power BI AI 工具包（MCP + skill）。一步一步来，每步做完告诉我结果；需要我确认的地方先停下来问我。
1. 运行 node -v，没装或低于 18 就让我去 Node.js 官网装 LTS 版；再确认装了 Power BI Desktop。
2. 微软官方开源仓库 microsoft/skills-for-fabric 里有个插件叫 powerbi-authoring，包含 Power BI MCP 和 2 个 skill。你支持插件市场的话，添加这个市场并安装 powerbi-authoring@fabric-collection；不支持的话，把仓库下载下来，按 plugins/powerbi-authoring 里的配置注册 MCP，再把里面 2 个 skill 装到你的 skills 目录（common 文件夹一起带上）。装完告诉我改了哪些文件。
3. 告诉我怎么重启或重新加载，然后确认 MCP 和 2 个 skill 都能用。
4. MCP 第一次用要同意微软的许可协议：先把协议给我看，等我回复「同意」再调用 accept_eula。
5. 我会在 Power BI Desktop 里打开一个文件。你连上它，只读地列出所有表和度量值，不要做任何修改。
```

说明：
- 插件、MCP 包名来自微软官方仓库 `microsoft/skills-for-fabric`（插件 `powerbi-authoring`，内含 MCP `@microsoft/powerbi-modeling-mcp`）。
- Claude Code 支持插件市场：`/plugin marketplace add microsoft/skills-for-fabric`，`/plugin install powerbi-authoring@fabric-collection`。
- 第 4 步不要让 AI 自己替你同意，协议要自己看。
- 第 5 步用示例文件测（`sample-data/`），不要拿工作文件。
- 做报表页面的 skill 改的是 PBIP 项目文件里的报表定义，演示文件要另存为 PBIP 格式。
- 我们自己的规矩 skill（`skills/neo-powerbi`）装在官方 skill 之后，作为补充。
