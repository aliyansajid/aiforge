import type { Metadata } from "next";
import localFont from "next/font/local";
import "@repo/ui/globals.css";
import { auth, SessionProvider } from "@repo/auth";
import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { Toaster } from "@repo/ui/components/sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "AIForge | One-Click AI Model Deployment & Monetization Platform",
  description:
    "Deploy, manage, and monetize your AI models in one click. AIForge automates hosting, API generation, scaling, and monetization for fast, cost-effective AI adoption. ",
  keywords: [
    "AI deployment",
    "Model deployment",
    "AI monetization",
    "FastAPI",
    "Next.js",
    "Machine Learning API",
    "Model Hosting",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
