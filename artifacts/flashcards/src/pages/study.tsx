import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListFlashcards, useUpdateFlashcardProgress, FlashcardLevel, getListFlashcardsQueryKey } from "@workspace/api-client-react";
import { Flashcard } from "@/components/flashcard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PartyPopper, ArrowRight, ArrowLeft } from "lucide-react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function Study() {
  const params = useParams();
  const levelParam = (params.level?.toUpperCase() || "A1") as FlashcardLevel;
  
  const { data, isLoading } = useListFlashcards({ level: levelParam, limit: 50 });
  const cards = data?.items || [];
  
  const updateProgress = useUpdateFlashcardProgress();
  const queryClient = useQueryClient();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const handleProgress = (id: number, known: boolean) => {
    updateProgress.mutate({ id, data: { known } });

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsDone(true);
      // Invalidate to update dashboard stats
      queryClient.invalidateQueries({ queryKey: getListFlashcardsQueryKey({ level: levelParam, limit: 50 }) });
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

  if (cards.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
            <PartyPopper className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-3xl font-black font-serif mb-2">No Cards Yet!</h2>
          <p className="text-muted-foreground mb-8">There are no flashcards available for {levelParam} yet. Generate some to get started!</p>
          <div className="flex gap-4">
             <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/generate">
              <Button>Generate {levelParam} Cards</Button>
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
          <h2 className="text-3xl font-black font-serif mb-2">Level Complete!</h2>
          <p className="text-muted-foreground mb-8">You've finished your study session for {levelParam}. Keep up the great momentum.</p>
          <div className="flex flex-col gap-3 w-full">
            <Button size="lg" variant="outline" onClick={() => { setCurrentIndex(0); setIsDone(false); }}>
              Study Again
            </Button>
            <Link href="/" className="w-full">
              <Button size="lg" className="w-full font-bold">
                Back to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <Layout>
      <div className="flex flex-col items-center max-w-md mx-auto w-full">
        <div className="w-full flex justify-between items-center mb-6 px-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit
            </Button>
          </Link>
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{levelParam} Study</span>
          <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
        
        <Flashcard 
          key={currentCard.id}
          card={currentCard}
          isStudyMode
          onKnown={(id) => handleProgress(id, true)}
          onUnknown={(id) => handleProgress(id, false)}
        />
      </div>
    </Layout>
  );
}
