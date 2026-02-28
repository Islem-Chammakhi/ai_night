import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { JobProvider } from "@/store/jobStore";
import { Toaster } from "react-hot-toast";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartTender AI",
  description: "Intelligent CV Matching for Tenders",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <JobProvider>
          {children}
          <Toaster position="top-right" />
        </JobProvider>
      </body>
    </html>
  );
}