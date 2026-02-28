"use client";
import { useJobs } from "@/store/jobStore";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { CandidateMatch } from "@/types";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Container from "@/components/global/container";
import Wrapper from "@/components/global/wrapper";

const tierColors: Record<CandidateMatch["match_tier"], string> = {
  "Strong Match": "bg-success/10 text-success border-success/20",
  "Partial Match": "bg-warning/10 text-warning border-warning/20",
  "Weak Match": "bg-destructive/10 text-destructive border-destructive/20",
};

const tierIcons: Record<CandidateMatch["match_tier"], ReactNode> = {
  "Strong Match": <CheckCircle size={14} />,
  "Partial Match": <AlertCircle size={14} />,
  "Weak Match": <XCircle size={14} />,
};

export default function CandidateMatchPage() {
  const { id } = useParams<{ id: string }>();
  const { jobs } = useJobs();
  const router = useRouter();

  const job = jobs.find((j) => j.id === Number(id));

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Job offer not found.
      </div>
    );
  }

  const results = job.matchResults;

  return (
    <main className="w-full py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* header */}
        <div className="relative z-0 w-full h-full">
          <div className="absolute -top-16 inset-x-0 -z-10 mx-auto w-3/4 h-32 lg:h-60 rounded-full blur-[5rem] bg-[radial-gradient(86.02%_172.05%_at_50%_-40%,rgba(18,139,135,1)_0%,rgba(5,5,5,0)_80%)]"></div>
          <Wrapper className="py-6">
            <div className="flex flex-col items-center justify-center w-full z-10">
              <Container delay={0.1}>
                <h2 className="text-balance leading-tight! text-center text-4xl md:text-5xl font-semibold tracking-tight mt-6 w-full">
                  Candidate Match Results
                </h2>
              </Container>

              <Container delay={0.2}>
                <p className="text-base md:text-lg font-normal text-center text-balance text-muted-foreground max-w-4xl mx-auto mt-1">
                  Review matched candidates, compare scores, and find the perfect fit for your job requirements
                </p>
              </Container>
            </div>
          </Wrapper>
        </div>

        {/* content */}
        <div className="flex items-center justify-between mb-8 mt-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {results?.total_cvs_scanned} CV(s) scanned
            </p>
          </div>
          <Button
            onClick={() => router.push("/match")}
            variant="default"
            size="md"
            className="gap-2"
          >
            <ArrowLeft size={16} /> Back to Jobs
          </Button>
        </div>

        {!results?.match_found && (
          <Card className="mb-6 border-destructive/20 bg-destructive/5">
            <CardContent className="p-6">
              <h2 className="text-destructive font-semibold text-lg mb-2">
                No Matching Candidates Found
              </h2>
              <p className="text-destructive/80 text-sm">{results?.explanation}</p>
            </CardContent>
          </Card>
        )}

        {results?.top_candidates && results.top_candidates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Matched Candidates</h2>
            <div className="flex flex-col gap-4">
              {results.top_candidates.map((c, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-muted-foreground/20">
                          #{i + 1}
                        </span>
                        <div>
                          <h3 className="font-semibold">{c.candidate_name}</h3>
                          <p className="text-xs text-muted-foreground">{c.filename}</p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`gap-1 px-3 py-1 ${tierColors[c.match_tier]}`}
                      >
                        {tierIcons[c.match_tier]}
                        {c.match_tier}
                      </Badge>
                    </div>

                    {/* Score Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {[
                        { label: "Final Score", value: c.final_score },
                        { label: "Semantic", value: c.embedding_score },
                        { label: "Relevance", value: c.reranker_score },
                        { label: "Skills", value: c.skill_score },
                      ].map((s) => (
                        <Card key={s.label} className="bg-muted/50 border-0">
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                            <p className="text-lg font-bold text-foreground">
                              {Math.round(s.value * 100)}%
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Skills Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-success mb-2 flex items-center gap-1">
                          <CheckCircle size={12} /> Matched Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.matched_skills.map((s, j) => (
                            <Badge key={j} variant="secondary" className="bg-success/10 text-success hover:bg-success/20">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
                          <XCircle size={12} /> Missing Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.missing_skills.map((s, j) => (
                            <Badge key={j} variant="secondary" className="bg-destructive/10 text-destructive hover:bg-destructive/20">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {results?.near_misses && results.near_misses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Near Misses</h2>
            <div className="flex flex-col gap-3">
              {results.near_misses.map((nm, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{nm.candidate_name}</h3>
                      <Badge variant="outline" className="bg-muted/50">
                        {nm.their_domain}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{nm.suggestion}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {nm.their_skills.slice(0, 8).map((s, j) => (
                        <Badge key={j} variant="secondary" className="bg-muted/50">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {results?.suggestions && results.suggestions.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-primary text-base flex items-center gap-2">
                <AlertCircle size={16} /> Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {results.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-primary/80 flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}