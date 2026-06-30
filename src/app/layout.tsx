import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Honeststar",
  description: "تذكير العملاء بتقييم جوجل بسهولة",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="max-w-[430px] mx-auto min-h-screen bg-white shadow-sm">
          {children}
        </div>
      </body>
    </html>
  );
}
