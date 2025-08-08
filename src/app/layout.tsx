import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/layout/SiteHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClientErrorSetup } from "@/components/ClientErrorSetup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Task Editor",
  description: "Manage requests and tasks backed by tasks.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-full bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100`}
      >
        <ClientErrorSetup />
        <ErrorBoundary>
          <SiteHeader />
          <main className="max-w-6xl mx-auto px-4 py-6">
            {children}
          </main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
