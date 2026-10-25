# 一键安装提示词（复制给 AI 工具）

适用：Windows 电脑，已经有一个支持 MCP 的 AI 工具（Claude Code、WorkBuddy 等）。把下面整段发给它。

```
帮我在这台 Windows 电脑上接好 Power BI 的 MCP。一步一步来，每步做完告诉我结果；需要我确认的地方先停下来问我。
1. 运行 node -v 检查 Node.js。没装或低于 18，就让我去 nodejs.org 装 LTS 版，我装好再继续。
2. 确认电脑上装了 Power BI Desktop。
3. 把微软官方的 Power BI Authoring MCP 加到你的 MCP 配置里：名字 powerbi-authoring-local，命令 npx，参数 -y @microsoft/powerbi-modeling-mcp@latest --start。Windows 上需要的话用 cmd /c 包一层。加完告诉我改的是哪个文件。
4. 告诉我怎么重启或重新加载，让你能用上这个 MCP，然后确认工具列表里有它。
5. 第一次用要同意微软的许可协议：先把协议给我看，等我回复「同意」再调用 accept_eula。
6. 我会在 Power BI Desktop 里打开一个文件。你连上它，只读地列出所有表、列和度量值，这一步不要做任何修改。
```

说明：
- 第 3 步的包名、参数来自微软官方 GitHub `microsoft/powerbi-modeling-mcp`。
- 第 5 步不要让 AI 自己替你同意，协议要自己看。
- 第 6 步用示例文件测，不要拿工作文件。
