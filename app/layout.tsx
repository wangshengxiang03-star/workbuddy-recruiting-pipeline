import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "WorkBuddy 招聘判断助手",
    description: "从岗位 JD 生成候选人画像、简历标签和结构化面试问题。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "WorkBuddy 招聘判断助手",
      description: "岗位画像、简历初筛、面试问题，三步完成关键招聘判断。",
      images: [{ url: `${origin}/og-mvp.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "WorkBuddy 招聘判断助手",
      description: "岗位画像、简历初筛、面试问题，三步完成关键招聘判断。",
      images: [`${origin}/og-mvp.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
