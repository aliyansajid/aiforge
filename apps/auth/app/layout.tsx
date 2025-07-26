import type { Metadata } from "next";
import localFont from "next/font/local";
import "@repo/ui/styles/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { GalleryVerticalEnd } from "lucide-react";
import { Toaster } from "@repo/ui/components/sonner";
import Link from "next/link";
import { auth, SessionProvider } from "@repo/auth";

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
            <div className="grid min-h-svh lg:grid-cols-2">
              <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                  <Link
                    href="/"
                    className="flex items-center gap-2 font-medium"
                  >
                    <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                      <GalleryVerticalEnd className="size-4" />
                    </div>
                    Aiforge
                  </Link>
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <div className="w-full max-w-xs">{children}</div>
                </div>
              </div>
              <div className="bg-muted relative hidden lg:block">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                >
                  <source src="/auth_video.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
