import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zeiterfassung - KITA Mitte",
  description: "Arbeitszeiterfassung fuer KITA Mitte",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
