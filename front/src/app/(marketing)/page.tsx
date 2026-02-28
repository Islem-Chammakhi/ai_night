import CTA from "@/components/marketing/cta";
import Faq from "@/components/marketing/faq";
import Hero from "@/components/marketing/hero";
import HowItWorks from "@/components/marketing/how-it-works";

const HomePage = () => {
    return (
        <div className="w-full relative flex flex-col pt-16">
            <Hero />
            <HowItWorks />
            <Faq />
            <CTA />
        </div>
    );
};

export default HomePage;
