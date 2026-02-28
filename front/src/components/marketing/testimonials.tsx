import React from "react";
import Image from "next/image";
import { FAQS, TESTIMONIALS } from "@/constants";
import Wrapper from "@/components/global/wrapper";
import Container from "@/components/global/container";
import { Marquee } from "../ui/marquee";

type Testimonial = {
    name: string;
    role: string;
    company: string;
    companyUrl: string;
    image: string;
    content: string;
    time: string;
    date: string;
    highlighted?: boolean;
};

const Testimonials = () => {
    return (
        <div className="flex flex-col items-center justify-center relative w-full pb-16 lg:pb-24">
            <Wrapper>
                <div className="relative flex flex-col items-center justify-center overflow-hidden">
                    <Marquee pauseOnHover className="[--duration:80s] gap-8">
                        {TESTIMONIALS.map((item) => (
                            <Item key={item.name} item={item} />
                        ))}
                    </Marquee>
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background"></div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background"></div>
                </div>
            </Wrapper>
            <div className="absolute hidden lg:block top-1/4 left-1/4 w-1/8 h-16 rounded-full bg-primary/80 -z-10 blur-[6rem]"></div>
            <div className="absolute hidden lg:block top-1/4 right-1/4 w-1/8 h-16 rounded-full bg-primary/80 -z-10 blur-[6rem]"></div>
        </div>
    )
};

const Item = ({ item }: { item: Testimonial }) => (
    <Container>
        <div className="flex flex-col bg-neutral-900/80 border border-border/50 rounded-lg lg:rounded-xl p-4 lg:p-6 w-full">
            <div className="flex items-center gap-x-3 w-full">
                <div className="w-10 h-10 flex-shrink-0 rounded-full">
                    <Image
                        src={item.image}
                        alt={item.name}
                        width={1024}
                        height={1024}
                        className="rounded-full object-cover size-full"
                    />
                </div>
                <div className="flex flex-col">
                    <h4 className="font-semibold">
                        {item.name}
                    </h4>
                    <div className="text-muted-foreground text-sm">
                        {item.role}{" "}
                        <span className="text-primary ml-1">
                            @{item.company}
                        </span>
                    </div>
                </div>
            </div>
            <div className="text-muted-foreground max-w-xs mt-2">
                &quot;{item.content}&quot;
            </div>
            <div className="text-xs text-muted-foreground mt-4 flex gap-2">
                <span>{item.time}</span>
                <span>·</span>
                <span>{item.date}</span>
            </div>
        </div>
    </Container>
);

export default Testimonials
