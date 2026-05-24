import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Flashcard as TFlashcard } from "@workspace/api-client-react";
import { getGenderColor, getLevelColor } from "@/lib/colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Volume2, Users } from "lucide-react";
import { useLangPrefs } from "@/lib/useLangPrefs";
import { LANG_BY_CODE, isRtl } from "@/lib/languages";
import { ReportCardButton } from "@/components/ReportCardButton";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type CardWithTranslations = TFlashcard & {
  translations?: Record<string, string> | null;
  exampleTranslations?: Record<string, string> | null;
  createdBy?: string | null;
};

interface FlashcardProps {
  card: TFlashcard;
  onKnown?: (id: number) => void;
  onUnknown?: (id: number) => void;
  isStudyMode?: boolean;
}

export function Flashcard({ card: incomingCard, onKnown, onUnknown, isStudyMode = false }: FlashcardProps) {
  const { prefs } = useLangPrefs();
  const [card, setCard] = useState<CardWithTranslations>(incomingCard as CardWithTranslations);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => { setCard(incomingCard as CardWithTranslations); }, [incomingCard]);

  const translations = card.translations ?? { en: card.englishTranslation, ar: card.arabicTranslation };
  const exampleTr = card.exampleTranslations ?? { en: card.exampleSentenceEn, ar: card.exampleSentenceAr };

  // dedupe + drop nulls
  const langList = [prefs.primaryLang, prefs.secondaryLang].filter(
    (l, i, arr): l is string => !!l && arr.indexOf(l) === i,
  );

  // Translate missing languages on demand
  useEffect(() => {
    let cancelled = false;
    const missing = langList.filter((l) => !translations[l]);
    if (missing.length === 0) return;
    (async () => {
      for (const lang of missing) {
        try {
          const r = await fetch(`/ba7r-api/flashcards/${card.id}/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ lang }),
          });
          if (!r.ok) continue;
          const updated = await r.json();
          if (cancelled) return;
          setCard(updated);
        } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, prefs.primaryLang, prefs.secondaryLang]);

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleSpeak = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const fullText = card.article ? `${card.article} ${card.baseWord}` : card.baseWord;
    setIsSpeaking(true);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(fullText);
      utter.lang = "de-DE";
      utter.rate = 0.85;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    } else {
      setIsSpeaking(false);
    }
  }, [card.article, card.baseWord]);

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
            <div className="flex gap-1.5">
              {card.category && (
                <Badge variant="secondary" className="text-xs uppercase tracking-wider">
                  {card.category}
                </Badge>
              )}
              {card.createdBy && (
                <Badge variant="outline" className="text-xs gap-1" title="Contributed by the community">
                  <Users className="w-3 h-3" />
                </Badge>
              )}
              <div onClick={(e) => e.stopPropagation()}>
                <ReportCardButton cardId={card.id} word={card.baseWord} />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            {card.imageUrl && (
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-muted/50">
                <img src={card.imageUrl} alt={card.baseWord} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-col items-center gap-3">
              <h2 className="text-4xl md:text-5xl font-black text-foreground font-serif tracking-tight">
                {card.article && (
                  <span className={cn("mr-2 font-normal opacity-80 text-3xl md:text-4xl", getGenderColor(card.article))}>
                    {card.article}
                  </span>
                )}
                {card.baseWord}
              </h2>
              <button
                onClick={handleSpeak}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  isSpeaking
                    ? "bg-primary text-primary-foreground scale-95"
                    : "bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
                title="Listen to pronunciation"
              >
                <Volume2 className={cn("w-3.5 h-3.5", isSpeaking && "animate-pulse")} />
                {isSpeaking ? "Playing…" : "Pronunciation"}
              </button>
            </div>
            <p className="text-sm text-muted-foreground animate-pulse mt-2">
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

          <div className="flex flex-col gap-5 flex-1">
            {langList.map((lang) => {
              const meta = LANG_BY_CODE[lang];
              const rtl = isRtl(lang);
              const value = translations[lang];
              const example = exampleTr[lang];
              return (
                <div key={lang} className={cn("space-y-1", rtl && "text-right")} dir={rtl ? "rtl" : "ltr"}>
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    {meta?.name ?? lang} {meta && meta.nativeName !== meta.name ? `(${meta.nativeName})` : ""}
                  </h3>
                  <p className={cn("text-2xl font-medium text-foreground", rtl && "text-3xl")}>
                    {value ?? <span className="text-muted-foreground italic text-base">Translating…</span>}
                  </p>
                  {example && (
                    <p className="text-xs text-muted-foreground mt-1">{example}</p>
                  )}
                </div>
              );
            })}

            <div className="space-y-1 mt-2 pt-4 border-t border-border/50">
              <p className="text-sm font-serif font-medium text-foreground">{card.exampleSentenceDe}</p>
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
