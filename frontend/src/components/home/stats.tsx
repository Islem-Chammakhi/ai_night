import Container from "@/components/global/container";
import Wrapper from "@/components/global/wrapper";
import { STATS } from "@/constants";
import Image from "next/image";

const Stats = () => {
    return (
        <div className="flex flex-col items-center justify-center relative w-full py-16 lg:py-24 overflow-hidden">
            <Wrapper>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center w-full">
                    {STATS.map((stat, index) => (
                        <Container
                            key={index}
                            delay={0.1 + index * 0.1}
                        >
                            <div className="flex flex-col items-center justify-center">
                                <div className="flex items-center justify-center px-4 lg:px-6 py-2 rounded-full relative before:absolute before:inset-0 before:-z-10 before:p-[1.5px] before:rounded-3xl before:bg-gradient-to-b before:from-neutral-700/80 before:to-neutral-950 before:content-[''] after:absolute after:inset-[1.5px] after:-z-10 after:rounded-[22px] after:bg-[#181818]/80">
                                    <Image
                                        src={stat.icon}
                                        alt="Stats"
                                        width={1024}
                                        height={1024}
                                        className="w-full size-8"
                                    />
                                </div>
                                <div className="text-center">
                                    <h4 className="text-lg lg:text-2xl text-transparent bg-gradient-to-b from-neutral-100 to bg-neutral-500 bg-clip-text font-semibold mt-5">
                                        {stat.value}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {stat.title}
                                    </p>
                                </div>
                            </div>
                        </Container>
                    ))}
                </div>
            </Wrapper>
        </div>
    )
};

export default Stats
