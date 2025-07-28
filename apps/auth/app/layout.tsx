import type { Metadata } from "next";
import localFont from "next/font/local";
import "@repo/ui/styles/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@repo/ui/components/sonner";
import { auth, SessionProvider } from "@repo/auth";

export const dynamic = "force-dynamic";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "AIForge - One-Click AI Model Deployment & Monetization",
  description:
    "Deploy, manage, and monetize AI models with a single click. No complex infrastructure setup required. Upload your AI models and get instant API endpoints with automatic scaling and payment processing.",
  keywords: [
    "AI deployment",
    "AI monetization",
    "machine learning",
    "API generation",
    "AI models",
    "cloud deployment",
    "artificial intelligence",
    "model hosting",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SessionProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
