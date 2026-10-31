import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { OnboardingGate } from "@/components/onboarding-gate";
import { TopNav } from "@/components/top-nav";
import "./globals.css";

// The Figma uses Gilroy, which needs a license. Plus Jakarta Sans is the closest free match.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: { default: "ZeeKoach", template: "%s · ZeeKoach" },
  description: "Find a Koach near you, book sessions and train together.",
};

export const viewport: Viewport = { themeColor: "#6b48ff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-4 sm:px-6 lg:pb-10 xl:px-10 xl:pt-[30px]">
          <AuthProvider>
            <OnboardingGate />
            <TopNav />
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
