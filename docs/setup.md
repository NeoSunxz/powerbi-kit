# 在自己电脑上配好 Power BI MCP（Windows）

目标：让 AI 工具（Claude Code / WorkBuddy / DeepSeek harness）直接连上本机打开的 Power BI Desktop，建表、写度量值、核数。

资料来源：微软官方文档「Power BI Authoring MCP server」和 GitHub 仓库 `microsoft/powerbi-modeling-mcp`、`microsoft/skills-for-fabric`（2026-10-25 查阅）。

## 0. 先装好这三样

1. **Power BI Desktop**（最新版）。
2. **Node.js 18 或更高**：<https://nodejs.org>。装完在 PowerShell 里跑 `node -v`，能看到版本号就行。
3. **git**：用来拉这个仓库。

## 1. 拉仓库

```powershell
cd $HOME
git clone <仓库地址> powerbi-kit
```

以后更新：`cd $HOME\powerbi-kit; git pull`

## 2. 接上 Power BI MCP

用的是微软的 **Power BI Authoring MCP（本地版，已正式发布）**，npm 包名 `@microsoft/powerbi-modeling-mcp`。它在你电脑上运行，所以能连到本机的 Power BI Desktop。

> 微软还有一个托管版（在云端，preview），但它连不到你本机的 Power BI Desktop。**两个别同时装**，工具会重复，AI 容易选错。

### Claude Code

在 PowerShell 里：

```powershell
claude mcp add --scope user powerbi-authoring-local -- cmd /c npx -y @microsoft/powerbi-modeling-mcp@latest --start
```

- Windows 上用 `npx` 启动的 MCP 要套一层 `cmd /c`。
- 进 Claude Code 后输入 `/mcp`，看到 `powerbi-authoring-local` 是已连接状态就对了。

可选：装微软官方的 Power BI skills（建模型、做报表页面的官方说明书）：

```
/plugin marketplace add microsoft/skills-for-fabric
/plugin install powerbi-authoring@fabric-collection
```

### WorkBuddy、DeepSeek harness 等其他工具

在工具的 MCP 设置里添加下面这段（多数工具用 `mcpServers` 这个格式）：

```json
{
  "mcpServers": {
    "powerbi-authoring-local": {
      "command": "npx",
      "args": ["-y", "@microsoft/powerbi-modeling-mcp@latest", "--start"]
    }
  }
}
```

- 如果工具报找不到 `npx`，把 `"command"` 改成 `"cmd"`，`args` 前面加上 `"/c", "npx"`。
- MCP 设置在工具的哪个菜单里，各工具不一样。**测试后把位置补到这里**：
  - WorkBuddy：（待补）
  - DeepSeek harness：（待补）

### 第一次用：同意许可协议

这个 MCP 第一次用时要先同意微软的许可协议（EULA），没同意前其他功能都用不了。AI 会提示你，你看过协议、确认同意后，让它调用 `accept_eula` 就行，之后不会再问。

## 3. 装上自己的 skill（neo-powerbi）

skill 就是一份写给 AI 的「做事规矩」，在 `skills/neo-powerbi/SKILL.md`。

- **Claude Code**：把整个文件夹复制到用户目录，Claude Code 会自动读到：
  ```powershell
  Copy-Item -Recurse $HOME\powerbi-kit\skills\neo-powerbi $HOME\.claude\skills\
  ```
  以后 `git pull` 之后再复制一次就是最新的。
- **其他工具**：如果支持 skills 目录，同样复制进去；不支持的话，在对话开头说一句「先读 `<路径>\SKILL.md`，按里面的规矩做」。**测试后把各工具的做法补到这里。**

## 4. 测一下通没通

1. 用 Power BI Desktop 新建一个文件，**获取数据 → 文本/CSV**，导入 `sample-data\cpi_monthly_yoy.csv`，存成 `cpi_demo.pbix`，保持打开。
2. 在 AI 工具里按顺序说：

```
连接 Power BI Desktop 里打开的 cpi_demo
列出这个模型里的所有表、列和度量值
建一张日期表，从 2016-01-01 到 2026-12-31，标记为日期表，和 cpi_monthly_yoy 的「月份」建关系
建一个度量值「总体CPI 平均同比」：「总体」这一列取平均再除以 100（表里存的是百分数，比如 2.0 表示 2.0%），格式 0.0%；然后用 DAX 查询把 2016–2026 每年的值列出来
```

3. 最后一步列出来的 2016 年应该约 2.0%，2019 年约 2.9%。对得上就说明环境、skill、数据都通了。

## 5. 常见问题

| 现象 | 先查 |
|---|---|
| 工具列表里没有 powerbi-authoring-local | MCP 是否已添加并启动；`node -v` 是否有版本；Claude Code 里看 `/mcp` |
| 找不到 Power BI Desktop 文件 | 文件要先在 Power BI Desktop 里打开；连接时用文件名，不带路径 |
| 能读不能改 | 本机文件一般不会；如果连的是云端工作区，需要写权限 |
| AI 改错了或卡在一半 | 换推理能力强的模型；把任务拆小一点；给它更多上下文 |

更多排查见 GitHub 仓库 `microsoft/powerbi-modeling-mcp` 里的 TROUBLESHOOTING.md。
