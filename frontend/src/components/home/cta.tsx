import { CheckCircle2 } from "lucide-react";
import React from 'react'
import Wrapper from "../global/wrapper";
import Container from "../global/container";
import Image from "next/image";
import { Button } from "../ui/button";

const CTA = () => {
    return (
        <div className="flex flex-col items-center justify-center relative w-full py-16 lg:py-24 overflow-hidden">
            <div className="absolute bottom-0 lg:bottom-0 inset-x-0 mx-auto bg-primary/50 lg:bg-primary/70 rounded-full w-1/3 h-1/16 blur-3xl"></div>

            <Wrapper>
                <div className="grid grid-cols-1 lg:grid-cols-2 w-full py-8">
                    <div className="flex flex-col items-start justify-center w-full">
                        <Container className="w-max mx-auto">
                            <h2 className="text-3xl lg:text-5xl leading-tight text-transparent bg-clip-text bg-linear-to-b from-neutral-100 to-neutral-400 font-semibold">
                                Automate Your <br /> Tendering Process
                            </h2>
                            <div className="flex items-center gap-4 mt-6">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-primary" />
                                    <span className="text-sm font-medium">
                                        Smart tender detection
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-primary" />
                                    <span className="text-sm font-medium">
                                        CV matching included
                                    </span>
                                </div>
                            </div>
                        </Container>
                    </div>
                    <div className="flex flex-col justify-center w-full mt-8 lg:mt-0">
                        <Container className="w-max mx-auto">
                            <div className="flex size-20">
                                <Image
                                    src="/icons/heart.svg"
                                    alt="Heart"
                                    width={1024}
                                    height={1024}
                                    className="object-cover size-full"
                                />
                            </div>
                            <div className="flex items-center gap-4 mt-6">
                                <Button size="lg">
                                    Get Started
                                </Button>
                                <div className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">
                                        Built for the <br /> Inetum Challenge 2026
                                    </span>
                                </div>
                            </div>
                        </Container>
                    </div>
                </div>
            </Wrapper>
        </div>
    )
};

export default CTA;