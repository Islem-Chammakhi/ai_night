import Providers from "@/components/global/providers";
import { base, heading } from "@/constants/fonts";
import { cn } from "@/lib";
import "@/styles/globals.css";
import { generateMetadata } from "@/utils";
import { JobProvider } from "@/store/jobStore";
import { Toaster } from "react-hot-toast";

export const metadata = generateMetadata();

export default function RootLayout({ children, }: { children: React.ReactNode; }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cn( "min-h-screen bg-[#050505] text-foreground font-base antialiased dark", base.variable, heading.variable, )} >
                <JobProvider>
                    <Providers>
                        {children}
                        <Toaster position="top-right" />
                    </Providers>
                </JobProvider>
            </body>
        </html>
    );
};
