import React from "react";
import Image from "next/image";
import Wrapper from "@/components/global/wrapper";
import Container from "@/components/global/container";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
    {
        question: "What problem does our platform solve?",
        answer: "Tender automates the tendering workflow with three core capabilities: smart tender detection, CV-to-requirement matching, and AI-assisted document generation.",
    },
    {
        question: "How does the CV matching work?",
        answer: "Our AI analyzes expert profiles against tender requirements to identify the most suitable candidates for each opportunity.",
    },
    {
        question: "Where are tenders detected from?",
        answer: "Tender scans multiple procurement platforms and aggregates relevant opportunities in one centralized platform.",
    },
    {
        question: "Who is it designed for?",
        answer: "Tender is designed for organizations and teams who regularly respond to tenders and want to streamline their workflow.",
    },
    {
        question: "What makes our solution different?",
        answer: "Tender combines detection, matching, and document generation in one unified platform—eliminating manual work across the entire process.",
    }
];

const Faq = () => {
    return (
      <div className="flex flex-col items-center justify-center relative w-full py-16 lg:py-24 overflow-hidden">
        <div className="absolute top-0 -right-1/3 -z-10 ml-auto w-4/5 h-32 lg:h-48 rounded-full blur-[5rem] bg-[radial-gradient(86.02%_172.05%_at_50%_-40%,rgba(18,139,135,0.7)_0%,rgba(5,5,5,0)_80%)]"></div>

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-size-[3rem_3rem] mask-[radial-gradient(ellipse_60%_70%_at_90%_0%,#000_20%,transparent_70%)] h-full -z-10" />

        <Wrapper>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            <Container>
              <div className="flex flex-col">
                <div className="flex flex-col items-start justify-start lg:items-center lg:justify-center lg:items-start lg:justify-start">
                  <h2 className="text-3xl lg:text-4xl font-semibold text-left lg:text-start tracking-tight">
                    Frequently asked questions
                  </h2>
                  <p className="text-base lg:text-lg font-normal text-muted-foreground text-left lg:text-start mt-2 max-w-md">
                    Here you will find the answers to the most commonly asked questions & answers.
                  </p>
                </div>
                <div className="mt-10">
                  <Accordion type="single" collapsible className="w-full">
                    {FAQS.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-base font-base font-semibold">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-base text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            </Container>

            <Container>
              <div className="col-span-1 w-full z-10">
                <div className="flex w-full">
                  <Image src="/images/faq.svg" alt="Box" width={1024} height={1024} className="w-full" />
                </div>
              </div>
            </Container>
          </div>
        </Wrapper>
      </div>
    );
};

export default Faq
