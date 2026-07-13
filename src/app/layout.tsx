import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HumenAI — Assistant e-commerce intelligent",
  description:
    "Déployez un agent conversationnel IA sur tous vos canaux de vente. WhatsApp, Instagram, Messenger, TikTok, Shopify et plus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
