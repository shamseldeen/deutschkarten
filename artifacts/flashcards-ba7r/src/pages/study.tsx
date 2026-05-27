import { useState } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout";
import {
  useListFlashcards,
  useUpdateFlashcardProgress,
  FlashcardLevel,
  getListFlashcardsQueryKey,
  getGetFlashcardStatsQueryKey,
} from "@workspace/api-client-react";
import { Flashcard } from "@/components/flashcard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PartyPopper, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function Study() {
  const params = useParams();
  const levelParam = (params.level?.toUpperCase() || "A1") as FlashcardLevel;

  const { data, isLoading } = useListFlashcards({ level: levelParam, limit: 50 });
  const allCards = data?.items || [];

  const updateProgress = useUpdateFlashcardProgress();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [relearningCards, setRelearningCards] = useState<typeof allCards>([]);
  const [isRelearning, setIsRelearning] = useState(false);
  const [relearningIndex, setRelearningIndex] = useState(0);

  const cards = isRelearning ? relearningCards : allCards;

  const handleProgress = (id: number, known: boolean) => {
    if (isSignedIn) {
      updateProgress.mutate({ id, data: { known } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFlashcardStatsQueryKey() });
        },
      });
    }

    if (known) {
      setKnownCount((n) => n + 1);
    } else if (!isRelearning) {
      setWrongIds((prev) => [...prev, id]);
    }

    const idx = isRelearning ? relearningIndex : currentIndex;
    if (idx < cards.length - 1) {
      if (isRelearning) setRelearningIndex((i) => i + 1);
      else setCurrentIndex((i) => i + 1);
    } else {
      queryClient.invalidateQueries({ queryKey: getListFlashcardsQueryKey({ level: levelParam, limit: 50 }) });
      queryClient.invalidateQueries({ queryKey: getGetFlashcardStatsQueryKey() });
      setIsDone(true);
    }
  };

  const startRelearning = () => {
    const wrong = allCards.filter((c) => wrongIds.includes(c.id));
    if (wrong.length === 0) return;
    setRelearningCards(wrong);
    setIsRelearning(true);
    setRelearningIndex(0);
    setIsDone(false);
  };

  const finishSession = () => {
    setCurrentIndex(0);
    setIsDone(false);
    setKnownCount(0);
    setWrongIds([]);
    setRelearningCards([]);
    setIsRelearning(false);
    setRelearningIndex(0);
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

  if (allCards.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
            <PartyPopper className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-3xl font-black font-serif mb-2">No Cards Yet!</h2>
          <p className="text-muted-foreground mb-8">
            There are no flashcards available for {levelParam} yet. Generate some to get started!
          </p>
          <div className="flex gap-4">
            <Link href="/"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button></Link>
            <Link href="/generate"><Button>Generate {levelParam} Cards</Button></Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isDone) {
    const wrongCount = wrongIds.length;
    const accuracy = cards.length > 0
      ? Math.round((knownCount / cards.length) * 100)
      : 0;

    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto animate-in fade-in zoom-in space-y-4">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
            <PartyPopper className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black font-serif">
            {isRelearning ? "Re-learning Done!" : "Level Complete!"}
          </h2>

          <div className="flex gap-4 justify-center">
            <div className="bg-green-50 dark:bg-green-950/30 px-4 py-2 rounded-lg">
              <div className="text-xl font-bold text-green-600">{knownCount}</div>
              <div className="text-xs text-slate-500">Got it</div>
            </div>
            {!isRelearning && wrongCount > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 px-4 py-2 rounded-lg">
                <div className="text-xl font-bold text-red-500">{wrongCount}</div>
                <div className="text-xs text-slate-500">Not yet</div>
              </div>
            )}
            <div className="bg-yellow-50 dark:bg-yellow-950/30 px-4 py-2 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{accuracy}%</div>
              <div className="text-xs text-slate-500">Accuracy</div>
            </div>
          </div>

          <p className="text-muted-foreground text-sm">
            {isRelearning
              ? "You re-reviewed the tricky cards. Each correct answer earned bonus XP!"
              : "Your XP is calculated based on card difficulty × your streak."}
          </p>

          <div className="flex flex-col gap-3 w-full">
            {!isRelearning && wrongCount > 0 && (
              <Button size="lg" variant="outline" onClick={startRelearning} className="w-full border-orange-300 text-orange-600 hover:bg-orange-50">
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-learn {wrongCount} tricky card{wrongCount !== 1 ? "s" : ""} (+bonus XP)
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={finishSession} className="w-full">
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

  const currentCard = cards[isRelearning ? relearningIndex : currentIndex];

  return (
    <Layout>
      <div className="flex flex-col items-center max-w-md mx-auto w-full">
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />Exit
            </Button>
          </Link>
          <div className="text-center">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest block">
              {isRelearning ? "Re-learning" : `${levelParam} Study`}
            </span>
            {isRelearning && <span className="text-xs text-orange-500">tricky cards</span>}
          </div>
          <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
            {(isRelearning ? relearningIndex : currentIndex) + 1} / {cards.length}
          </span>
        </div>

        <div className="w-full bg-muted rounded-full h-1.5 mb-4 px-2">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${((isRelearning ? relearningIndex : currentIndex) / cards.length) * 100}%` }}
          />
        </div>

        {currentCard && (
          <Flashcard
            key={currentCard.id}
            card={currentCard}
            isStudyMode
            onKnown={(id) => handleProgress(id, true)}
            onUnknown={(id) => handleProgress(id, false)}
          />
        )}
      </div>
    </Layout>
  );
}
