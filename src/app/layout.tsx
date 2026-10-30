import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
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

// Mobile first: every screen is phone-sized, centred on bigger screens.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#e9e7f5] font-sans">
        <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-bg">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
