import Wrapper from "../global/wrapper";
import Icons from "../global/icons";
import Image from "next/image";
import Link from "next/link";
import Container from "../global/container";
import { Button } from "../ui/button";

const Hero = () => {
    return (
        <div className="relative z-0 w-full h-full">

            <div className="absolute -top-16 inset-x-0 -z-10 mx-auto w-3/4 h-32 lg:h-40 rounded-full blur-[5rem] bg-[radial-gradient(86.02%_172.05%_at_50%_-40%,rgba(18,139,135,1)_0%,rgba(5,5,5,0)_80%)]"></div>

            <Image src="/images/hero.svg" alt="" width={1024} height={1024}
                className="absolute inset-x-0 -top-16 w-full z-10 min-w-full"
            />

            <Wrapper className="py-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full z-10">
                    {/* Left Column - Content */}
                    <div className="flex flex-col items-center lg:items-start justify-center">
                        <Container>
                            <div className="flex items-center justify-center lg:justify-start gap-x-1 px-2 py-1.5 relative w-max mx-auto lg:mx-0 rounded-full before:absolute before:inset-0 before:-z-10 before:p-px before:rounded-3xl before:bg-linear-to-b before:from-neutral-700 before:to-neutral-900 before:content-[''] after:absolute after:inset-px after:-z-10 after:rounded-[22px] after:bg-[#181818]/60">
                                <Icons.stars className="size-5" />
                                <span className="text-sm text-white">
                                    Tender AI – Inetum Challenge 2026
                                </span>
                            </div>
                        </Container>

                        <Container delay={0.1}>
                            <h2 className="text-balance leading-tight! text-center lg:text-left text-5xl md:text-6xl font-semibold tracking-tight mt-6 w-full">
                                Automate Your Entire <br className="hidden lg:inline-block" /> Tendering Workflow
                            </h2>
                        </Container>

                        <Container delay={0.2}>
                            <p className="text-base md:text-lg font-normal text-center lg:text-left text-balance text-muted-foreground max-w-3xl mx-auto lg:mx-0 mt-4">
                                Smart tender detection, CV-to-requirement matching, and AI-powered document generation... all in one platform!
                            </p>
                        </Container>

                        <Container delay={0.3}>
                            <div className="mt-6 flex justify-center lg:justify-start">
                                <Link href="/dashboard">
                                    <Button size="lg">
                                        Try MVP Demo
                                    </Button>
                                </Link>
                            </div>
                        </Container>
                    </div>

                    {/* Right Column - Image */}
                    <Container className="w-full">
                        <div className="relative mx-auto max-w-lg">
                            <Image
                                src="/images/resume.png"
                                alt="Tender AI Dashboard"
                                priority
                                width={1280}
                                height={1280}
                                loading="eager"
                                className="rounded-2xl md:rounded-[26px] w-full h-auto"
                            />
                        </div>
                    </Container>
                </div>
            </Wrapper>
        </div>
    )
};

export default Hero;