import type { Metadata } from "next";
import { Dela_Gothic_One } from "next/font/google";
import "./globals.css";

const delaGothic = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VAMP CHAT",
  description: "WHOLE LOTTA RED",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={delaGothic.className}>
        {children}
      </body>
    </html>
  );
}
