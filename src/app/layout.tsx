import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Honeststar",
  description: "Automate Google review reminders for your clinic",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-[430px] mx-auto min-h-screen bg-white shadow-sm">
          {children}
        </div>
      </body>
    </html>
  );
}
