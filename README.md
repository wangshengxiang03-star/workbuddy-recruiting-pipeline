# WorkBuddy 招聘判断助手

面向 HR 和用人经理的轻量招聘 MVP，聚焦三个关键判断：岗位画像、简历初筛和面试问题。

## 在线体验

[打开 GitHub Pages 公开演示版](https://wangshengxiang03-star.github.io/workbuddy-recruiting-pipeline/)

> GitHub Pages 版本使用虚构数据和浏览器内模拟接口，适合外部 HR 体验界面与流程。完整版本包含服务端接口、数据库和文件存储，不会在 GitHub Pages 上处理真实简历。

完整版本（部分网络环境可能限制访问）：[ChatGPT Sites 体验站](https://workbuddy-hiring-pipeline.wangshengxiang7.chatgpt.site)

## 当前能力

- 创建岗位并根据 JD 与补充要求生成、持久化候选人画像
- 提炼岗位使命、硬门槛、职级定位、典型背景、核心能力与判断证据
- 给出目标职位名称、人才搜索关键词、风险信号和 JD 待澄清问题
- 支持修改 JD 后重新分析、人工校准画像并保存新版本
- 支持一键复制画像或导出 Markdown 招聘文档
- 完整版本通过 OpenAI Responses API 生成结构化岗位画像，并展示模型来源与 JD 证据
- 模型不可用时自动回退到本地规则分析，页面会明确标记降级状态
- 批量上传 PDF、DOCX 和图片简历
- 为简历生成学校、学历、工作年限、职位和能力标签
- 根据岗位要求给出匹配度与初筛建议
- 根据 JD 生成 6 道结构化面试问题
- 每道问题包含考察重点与建议追问

图片和扫描版简历目前进入“待 OCR”队列，可由 HR 人工补充字段后重新评分。

## 技术结构

- Vinext、React、TypeScript
- Cloudflare Workers 兼容运行时
- D1：岗位、候选人、流程记录和简历元数据
- R2：原始简历文件
- Drizzle ORM：数据结构与迁移
- `unpdf`：PDF 文本提取
- `fflate`：DOCX 文档解析

## 本地开发

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

复制 `.env.example` 为 `.env.local`，配置 `OPENAI_API_KEY` 后可在本地启用模型分析。默认模型为 `gpt-5.6-sol`，可通过 `OPENAI_MODEL` 调整。

构建验证：

```bash
npm run build
```

构建 GitHub Pages 公开演示版：

```bash
npm run build:demo
```

数据库结构调整后生成迁移：

```bash
npm run db:generate
```

## 数据与隐私

- 原始简历存入项目绑定的私有对象存储
- 结构化招聘数据存入项目绑定的数据库
- PDF 与 DOCX 文本提取不调用外部大模型服务
- 公开体验时请使用虚构或已脱敏的候选人资料

## 文档

- `docs/WorkBuddy招聘流水线用户使用指南.docx`
- `docs/WorkBuddy招聘流水线网站介绍说明.md`
