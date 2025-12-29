import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { cn } from "@/utils/cn";
import MainLayout from "@/components/ui/MainLayout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp"
});

export const metadata: Metadata = {
  title: "SNS Auto Post System",
  description: "Advanced SNS multi-preview and editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={cn(inter.variable, notoSansJP.variable, "font-sans antialiased")}>
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
