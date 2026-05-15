import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "19 Mayıs Global Türk Gençlik Haritası",
  description: "Dünyanın neresindesin? 19 Mayıs'ta global haritada yerini al.",
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
