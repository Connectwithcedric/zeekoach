import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { TopNav } from "@/components/top-nav";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: { default: "ZeeKOACH", template: "%s · ZeeKOACH" },
  description: "Find a Koach near you, book sessions and train together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <TopNav />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-4 sm:pb-16 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
