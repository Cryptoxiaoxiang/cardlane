import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardLane · 礼品卡交易",
  description: "礼品卡测试网交易平台，加密存储、链上托管、付款后自动取卡。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
