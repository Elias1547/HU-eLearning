import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/lib/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { LmsAppShell } from "@/components/layout/lms-app-shell";
import { Breadcrumbs } from "@/components/navbar-breadcrumb";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hu-elearning (LMS)",
  authors: [
    {
      name: "Hu-elearning",
      url: "",
    },
  ],
  keywords: [
    "LMS",
    "Learning Management System",
    "Online Education",
    "E-Learning",
    "Course Management",
    "Student Portal",
    "Teacher Portal",
    "Education Platform",
    "Hu-elearning",
  ],
  description:
    "A modern platform for online education. Learn, teach, and grow with us. EduLearn is your go-to solution for managing courses, students, and educational content. Join us today!",
    
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex min-h-screen flex-col bg-background">
              <LmsAppShell>
                <>
                  <Breadcrumbs />
                  <div className="flex-1 bg-muted/20 dark:bg-muted/10">{children}</div>
                </>
              </LmsAppShell>
            </div>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}