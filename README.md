# WorkBuddy 招聘流水线

面向 HR、招聘负责人和用人经理的一体化招聘运营系统，覆盖岗位标准、简历批量处理、候选人推进、面试筹备、人才池和招聘数据分析。

## 在线体验

[打开 WorkBuddy 在线体验站](https://workbuddy-hiring-pipeline.wangshengxiang7.chatgpt.site)

> 在线体验站运行完整的服务端接口、数据库和文件存储。GitHub Pages 仅适合静态网站，无法承载本项目的简历上传与数据处理能力。

## 当前能力

- 从岗位 JD 生成结构化招聘标准
- 管理硬门槛、评分权重和面试考察维度
- 批量上传 PDF、DOCX 和图片简历
- 在私有存储中提取 PDF、DOCX 文本
- 提取候选人姓名、联系方式、学历、院校、公司、职位和技能
- 按“姓名 + 手机号”识别重复投递
- 根据岗位标准执行硬门槛校验和匹配度评分
- 自动生成候选人记录并写入招聘台账
- 查看解析原文、人工校正字段并重新评分
- 推进邀约、面试安排和资料包状态

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

构建验证：

```bash
npm run build
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
