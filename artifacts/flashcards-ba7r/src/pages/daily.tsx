import { useState } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout";
import {
  useGetDailyFlashcards,
  useUpdateFlashcardProgress,
  getGetDailyFlashcardsQueryKey,
} from "@workspace/api-client-react";
import { Flashcard } from "@/components/flashcard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PartyPopper, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function Daily() {
  const { isSignedIn } = useAuth();
  const { data: cards, isLoading } = useGetDailyFlashcards();
  const updateProgress = useUpdateFlashcardProgress();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const handleProgress = (id: number, known: boolean) => {
    // Guests can study but cannot persist progress server-side (would let
    // anonymous users mutate shared state). Skip the API call locally.
    if (isSignedIn) {
      updateProgress.mutate({ id, data: { known } });
    }

    if (cards && currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsDone(true);
      queryClient.invalidateQueries({
        queryKey: getGetDailyFlashcardsQueryKey(),
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Skeleton className="w-full max-w-md aspect-[3/4] rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <PartyPopper className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-black font-serif mb-2">
            All Caught Up!
          </h2>
          <p className="text-muted-foreground mb-8">
            You don't have any cards due for review today. Great job staying on
            top of your learning!
          </p>
          <div className="flex gap-4">
            <Link href="/browse">
              <Button variant="outline">Browse Cards</Button>
            </Link>
            <Link href="/generate">
              <Button>Learn New Words</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isDone) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto animate-in fade-in zoom-in">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
            <PartyPopper className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black font-serif mb-2">Wunderbar!</h2>
          <p className="text-muted-foreground mb-8">
            You've completed your daily review set. Your brain is getting
            stronger every day.
          </p>
          <Link href="/">
            <Button size="lg" className="font-bold">
              Back to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <Layout>
      <div className="flex flex-col items-center max-w-md mx-auto w-full">
        <div className="w-full flex justify-between items-center mb-6 px-2">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            Daily Review
          </span>
          <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>

        <Flashcard
          key={currentCard.id} // Force remount on card change for fresh flip state
          card={currentCard}
          isStudyMode
          onKnown={(id) => handleProgress(id, true)}
          onUnknown={(id) => handleProgress(id, false)}
        />
      </div>
    </Layout>
  );
}
