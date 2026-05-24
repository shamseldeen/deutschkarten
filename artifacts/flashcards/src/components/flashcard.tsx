import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Flashcard as TFlashcard } from "@workspace/api-client-react";
import { getGenderColor, getLevelColor } from "@/lib/colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, RefreshCw } from "lucide-react";

interface FlashcardProps {
  card: TFlashcard;
  onKnown?: (id: number) => void;
  onUnknown?: (id: number) => void;
  isStudyMode?: boolean;
}

export function Flashcard({ card, onKnown, onUnknown, isStudyMode = false }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => setIsFlipped(!isFlipped);

  return (
    <div className="w-full max-w-md mx-auto aspect-[3/4] perspective-1000">
      <div
        className={cn(
          "w-full h-full relative transition-all duration-500 transform-style-3d cursor-pointer rounded-xl shadow-lg border border-border bg-card",
          isFlipped ? "rotate-y-180" : ""
        )}
        onClick={handleFlip}
      >
        {/* FRONT */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl bg-card flex flex-col p-6 overflow-hidden">
          <div className="flex justify-between items-start mb-auto">
            <Badge variant="outline" className={cn("font-bold text-sm", getLevelColor(card.level))}>
              {card.level}
            </Badge>
            {card.category && (
              <Badge variant="secondary" className="text-xs uppercase tracking-wider">
                {card.category}
              </Badge>
            )}
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            {card.imageUrl && (
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-muted/50">
                <img src={card.imageUrl} alt={card.baseWord} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-foreground font-serif tracking-tight">
                {card.article && (
                  <span className={cn("mr-2 font-normal opacity-80 text-3xl md:text-4xl", getGenderColor(card.article))}>
                    {card.article}
                  </span>
                )}
                {card.baseWord}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground animate-pulse mt-4">
              Tap to flip
            </p>
          </div>
        </div>

        {/* BACK */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl bg-card border-card-border p-6 flex flex-col overflow-y-auto rotate-y-180">
          <div className="flex justify-between items-start mb-4">
             <Badge variant="outline" className={cn("font-bold text-sm", getLevelColor(card.level))}>
              {card.level}
            </Badge>
          </div>
          
          <div className="flex flex-col gap-6 flex-1">
            <div className="space-y-1">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">English</h3>
              <p className="text-2xl font-medium text-foreground">{card.englishTranslation}</p>
            </div>
            
            <div className="space-y-1 text-right" dir="rtl">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Arabic (العربية)</h3>
              <p className="text-3xl font-medium text-foreground">{card.arabicTranslation}</p>
            </div>

            <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
              <div className="space-y-1">
                <p className="text-sm font-serif font-medium text-foreground">{card.exampleSentenceDe}</p>
                <p className="text-xs text-muted-foreground">{card.exampleSentenceEn}</p>
                <p className="text-xs text-muted-foreground text-right" dir="rtl">{card.exampleSentenceAr}</p>
              </div>
            </div>
          </div>

          {isStudyMode && (
            <div className="mt-6 flex justify-between gap-4" onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="outline" 
                size="lg" 
                className="flex-1 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive border-destructive/20 h-14"
                onClick={() => onUnknown?.(card.id)}
              >
                <X className="w-5 h-5 mr-2" />
                Again
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="flex-1 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 border-green-500/20 h-14"
                onClick={() => onKnown?.(card.id)}
              >
                <Check className="w-5 h-5 mr-2" />
                Got it
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
