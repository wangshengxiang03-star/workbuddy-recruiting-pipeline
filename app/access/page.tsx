import { safeRelativePath } from "../lib/access-control";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeRelativePath(params.next ?? "/");
  return (
    <main className="access-page">
      <section className="access-card">
        <div className="access-mark">WB</div>
        <p className="access-eyebrow">WorkBuddy · HR AI 助手</p>
        <h1>进入招聘工作台</h1>
        <p className="access-description">
          输入体验码，使用岗位画像、简历初筛和面试问题生成。
        </p>
        <form action="/api/access" method="post">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="code">体验码</label>
          <input
            id="code"
            name="code"
            type="password"
            autoComplete="current-password"
            placeholder="请输入体验码"
            required
            autoFocus
          />
          {params.error && <p className="access-error">体验码不正确，请重新输入。</p>}
          <button type="submit">进入 WorkBuddy</button>
        </form>
        <p className="access-note">请勿上传未经授权的真实候选人敏感信息。</p>
      </section>
    </main>
  );
}
