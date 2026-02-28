import Footer from "@/components/home/footer";
import Navbar from "@/components/home/navbar";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="w-full grow relative">
            <Navbar />
            {children}
            <Footer />
        </main>
    );
};
