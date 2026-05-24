import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Brain, Type, Languages, Sparkles, Check, X, RotateCcw } from "lucide-react";
import { useLangPrefs } from "@/lib/useLangPrefs";
import { LANG_BY_CODE, SUPPORTED_LANGS, isRtl } from "@/lib/languages";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Mode = "de-to-en" | "en-to-de" | "article" | "typing";

interface Question {
  flashcardId: number;
  questionType: Mode;
  prompt: string;
  hint?: string | null;
  options?: string[];
  correctAnswer: string;
}

interface QuizResp {
  sessionId: string | null;
  mode: Mode;
  level: string | null;
  questions: Question[];
}

interface AnswerLog {
  flashcardId: number;
  questionType: Mode;
  userAnswer: string;
  correct: boolean;
  prompt: string;
}

function buildModes(langName: string): { id: Mode; label: string; desc: string; icon: typeof Brain; color: string }[] {
  return [
    { id: "de-to-en", label: `German → ${langName}`, desc: `Pick the ${langName} meaning`, icon: Languages, color: "text-blue-500 border-blue-500/40 bg-blue-500/5" },
    { id: "en-to-de", label: `${langName} → German`, desc: "Pick the German word", icon: Languages, color: "text-purple-500 border-purple-500/40 bg-purple-500/5" },
    { id: "article", label: "Der · Die · Das", desc: "Pick the right article", icon: Sparkles, color: "text-amber-500 border-amber-500/40 bg-amber-500/5" },
    { id: "typing", label: "Type the German", desc: "Type the word from memory", icon: Type, color: "text-emerald-500 border-emerald-500/40 bg-emerald-500/5" },
  ];
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

const articleColor: Record<string, string> = {
  der: "text-blue-500", die: "text-pink-500", das: "text-green-500",
};

export default function QuizPage() {
  const { prefs } = useLangPrefs();
  const [lang, setLang] = useState<string>(prefs.primaryLang || "en");
  const langMeta = LANG_BY_CODE[lang];
  const langName = langMeta?.name ?? "English";
  const rtl = isRtl(lang);
  const MODES = useMemo(() => buildModes(langName), [langName]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizResp | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ correct: number; total: number; saved: boolean } | null>(null);

  const current = quiz?.questions[idx];
  const score = useMemo(() => answers.filter((a) => a.correct).length, [answers]);

  async function startQuiz() {
    if (!mode) return;
    setLoading(true); setError(null); setDone(null); setAnswers([]); setIdx(0);
    setPicked(null); setTyped(""); setRevealed(false);
    try {
      const r = await fetch(`${basePath}/api/quiz/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, level, count: 10, lang }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to start quiz");
      }
      setQuiz(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start quiz");
    } finally {
      setLoading(false);
    }
  }

  function submitAnswer() {
    if (!current || revealed) return;
    const userAnswer = current.questionType === "typing" ? typed.trim() : (picked ?? "");
    if (!userAnswer) return;
    const correct =
      current.questionType === "typing"
        ? userAnswer.toLowerCase() === current.correctAnswer.toLowerCase()
        : userAnswer === current.correctAnswer;
    setAnswers((prev) => [...prev, {
      flashcardId: current.flashcardId, questionType: current.questionType,
      userAnswer, correct, prompt: current.prompt,
    }]);
    setRevealed(true);
  }

  async function nextQuestion() {
    if (!quiz) return;
    if (idx + 1 >= quiz.questions.length) {
      // finish
      setLoading(true);
      try {
        const r = await fetch(`${basePath}/api/quiz/finish`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: quiz.sessionId, answers }),
        });
        const j = await r.json().catch(() => ({ correct: score, total: answers.length, saved: false }));
        setDone({ correct: j.correct ?? score, total: j.total ?? answers.length, saved: Boolean(j.saved) });
      } finally {
        setLoading(false);
      }
      return;
    }
    setIdx(idx + 1); setPicked(null); setTyped(""); setRevealed(false);
  }

  function reset() {
    setQuiz(null); setDone(null); setAnswers([]); setIdx(0);
    setPicked(null); setTyped(""); setRevealed(false); setError(null);
  }

  // ─── Picker ─────────────────────────────────────────────────────────────────
  if (!quiz && !done) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Quiz Time 🎯</h1>
            <p className="text-muted-foreground">Pick a mode and test what you've learned.</p>
          </div>

          <Card>
            <CardHeader><CardTitle>Mode</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "text-left p-4 rounded-xl border-2 transition-all hover-elevate",
                    mode === m.id ? `${m.color} ring-2 ring-current/30` : "border-border bg-card",
                  )}
                >
                  <m.icon className={cn("w-6 h-6 mb-2", mode === m.id ? "" : "text-muted-foreground")} />
                  <div className="font-bold text-foreground">{m.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Language</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {SUPPORTED_LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    "px-3 py-2 rounded-lg border-2 font-semibold text-sm transition-colors",
                    lang === l.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                  dir={l.rtl ? "rtl" : "ltr"}
                >
                  {l.nativeName} <span className="opacity-60">· {l.name}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Level (optional)</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <button
                onClick={() => setLevel(null)}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 font-semibold transition-colors",
                  level === null ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                All
              </button>
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLevel(lv)}
                  className={cn(
                    "px-4 py-2 rounded-lg border-2 font-semibold transition-colors",
                    level === lv ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {lv}
                </button>
              ))}
            </CardContent>
          </Card>

          {error && <div className="text-sm text-red-500 px-2">{error}</div>}

          <Button
            size="lg" className="w-full font-bold text-base"
            disabled={!mode || loading} onClick={startQuiz}
          >
            {loading ? "Loading…" : "Start Quiz"}
          </Button>
        </div>
      </Layout>
    );
  }

  // ─── Results ────────────────────────────────────────────────────────────────
  if (done) {
    const pct = done.total > 0 ? Math.round((done.correct / done.total) * 100) : 0;
    const grade = pct >= 90 ? "Outstanding! 🏆" : pct >= 70 ? "Great work! 🎉" : pct >= 50 ? "Keep going! 💪" : "Practice makes perfect 📚";
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="text-center">
            <CardContent className="py-10 space-y-4">
              <div className="text-6xl font-black text-primary">{pct}%</div>
              <div className="text-2xl font-bold">{grade}</div>
              <div className="text-lg text-muted-foreground">
                {done.correct} of {done.total} correct
              </div>
              {!done.saved && (
                <div className="text-xs text-muted-foreground/70">
                  Sign in to save quiz history and track your stats.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {answers.map((a, i) => (
              <div key={i} className={cn(
                "p-3 rounded-lg border flex items-center gap-3",
                a.correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5",
              )}>
                {a.correct
                  ? <Check className="w-5 h-5 text-green-500 shrink-0" />
                  : <X className="w-5 h-5 text-red-500 shrink-0" />}
                <div className="flex-1 text-sm">
                  <div className="font-semibold">{a.prompt}</div>
                  <div className="text-xs text-muted-foreground">
                    You: <span className={a.correct ? "text-green-600" : "text-red-600"}>{a.userAnswer || "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-2" /> New Quiz
            </Button>
            <Button className="flex-1 font-bold" onClick={() => { reset(); }}>
              Done
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Question screen ────────────────────────────────────────────────────────
  if (!current) return <Layout><div /></Layout>;
  const progress = quiz ? ((idx + (revealed ? 1 : 0)) / quiz.questions.length) * 100 : 0;
  const isArticle = current.questionType === "article";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
            <span>Question {idx + 1} of {quiz!.questions.length}</span>
            <span>Score: {score}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              {current.questionType === "de-to-en" && `What does this mean in ${langName}?`}
              {current.questionType === "en-to-de" && "What is this in German?"}
              {current.questionType === "article" && "Der, Die, or Das?"}
              {current.questionType === "typing" && "Type the German word"}
            </div>
            <div
              className={cn("text-4xl font-black text-foreground")}
              dir={
                current.questionType === "de-to-en" || current.questionType === "article"
                  ? "ltr" // German prompt
                  : rtl ? "rtl" : "ltr" // language prompt (for en-to-de & typing)
              }
            >
              {current.prompt}
            </div>
            {current.hint && (
              <div className="text-sm text-muted-foreground italic">
                hint: {current.hint}
              </div>
            )}
          </CardContent>
        </Card>

        {current.questionType === "typing" ? (
          <div className="space-y-3">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !revealed) submitAnswer(); }}
              disabled={revealed}
              autoFocus
              placeholder="Type here…"
              className={cn(
                "w-full px-4 py-3 rounded-lg border-2 text-lg font-semibold bg-background",
                revealed
                  ? typed.trim().toLowerCase() === current.correctAnswer.toLowerCase()
                    ? "border-green-500 text-green-600"
                    : "border-red-500 text-red-600"
                  : "border-border focus:border-primary outline-none",
              )}
            />
            {revealed && typed.trim().toLowerCase() !== current.correctAnswer.toLowerCase() && (
              <div className="text-sm text-muted-foreground">
                Correct answer: <span className="font-bold text-foreground">{current.correctAnswer}</span>
              </div>
            )}
          </div>
        ) : (
          <div className={cn("grid gap-3", isArticle ? "grid-cols-3" : "sm:grid-cols-2")}>
            {current.options!.map((opt) => {
              const isCorrect = opt === current.correctAnswer;
              const isPicked = picked === opt;
              const showAsCorrect = revealed && isCorrect;
              const showAsWrong = revealed && isPicked && !isCorrect;
              return (
                <button
                  key={opt}
                  onClick={() => !revealed && setPicked(opt)}
                  disabled={revealed}
                  className={cn(
                    "p-4 rounded-xl border-2 font-bold transition-all text-base",
                    isArticle && articleColor[opt],
                    showAsCorrect && "border-green-500 bg-green-500/15 text-green-600",
                    showAsWrong && "border-red-500 bg-red-500/15 text-red-600",
                    !revealed && isPicked && "border-primary bg-primary/10",
                    !revealed && !isPicked && "border-border bg-card hover-elevate",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {!revealed ? (
          <Button
            size="lg" className="w-full font-bold"
            disabled={current.questionType === "typing" ? !typed.trim() : !picked}
            onClick={submitAnswer}
          >
            Check
          </Button>
        ) : (
          <Button
            size="lg" className="w-full font-bold" onClick={nextQuestion} disabled={loading}
          >
            {idx + 1 >= quiz!.questions.length ? (loading ? "Saving…" : "See Results") : "Next →"}
          </Button>
        )}
      </div>
    </Layout>
  );
}
