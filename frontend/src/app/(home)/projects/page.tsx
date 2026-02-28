import Container from "@/components/global/container";
import Wrapper from "@/components/global/wrapper";

const MatchPage = () => {
    return (
      <div className="w-full relative flex flex-col pt-16">
        {/* header */}
        <div className="relative z-0 w-full h-full">
          <div className="absolute -top-16 inset-x-0 -z-10 mx-auto w-3/4 h-32 lg:h-60 rounded-full blur-[5rem] bg-[radial-gradient(86.02%_172.05%_at_50%_-40%,rgba(18,139,135,1)_0%,rgba(5,5,5,0)_80%)]"></div>
          <Wrapper className="py-12">
            <div className="flex flex-col items-center justify-center w-full z-10">

              <Container delay={0.1}>
                <h2 className="text-balance leading-tight! text-center text-4xl md:text-5xl font-semibold tracking-tight mt-6 w-full">
                  Automated Job Matching - <br className="hidden lg:inline-block" /> 
                  Find the Perfect Project
                </h2>
              </Container>

              <Container delay={0.2}>
                <p className="text-base md:text-lg font-normal text-center text-balance text-muted-foreground max-w-3xl mx-auto mt-4">
                  Manage job offers and automatically match candidates using AI-powered CV analysis and smart scoring
                </p>
              </Container>
            </div>
          </Wrapper>
        </div>
        {/* content */}
        <div>

        </div>
      </div>
    );
};

export default MatchPage;