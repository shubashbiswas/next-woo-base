import { Section, Container } from "@/components/craft";

export default function Loading() {
  return (
    <Section>
      <Container>
        <div className="space-y-8 animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-accent/50 rounded" />
            <div className="h-4 w-96 bg-accent/50 rounded" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-48 bg-accent/50 rounded-lg" />
                <div className="h-4 w-3/4 bg-accent/50 rounded" />
                <div className="h-4 w-1/2 bg-accent/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}