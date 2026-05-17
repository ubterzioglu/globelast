import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayarmı",
  description: "Dünyanın neresindesin? Kendini pinle! Çoşkuya katıl!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="h-full overflow-hidden bg-black">{children}</body>
    </html>
  );
}
