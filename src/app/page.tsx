import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl animate-fade-in">
        <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          AI-native Content Operating System
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-semibold tracking-tight text-foreground">
            Content-ment
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            One idea. Every platform. Your voice — amplified by AI across the entire content graph.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">
              Get started
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>

        <div className="flex items-center gap-8 text-xs text-muted-foreground pt-4">
          <span>Brand DNA</span>
          <span>·</span>
          <span>Content Graph</span>
          <span>·</span>
          <span>Multi-platform Publishing</span>
          <span>·</span>
          <span>AI Writing</span>
        </div>
      </div>
    </main>
  );
}
