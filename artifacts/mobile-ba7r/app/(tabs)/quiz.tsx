import React, { useMemo, useState } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet, TextInput, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";
import { useLangPrefs } from "@/lib/useLangPrefs";
import { LANG_BY_CODE, SUPPORTED_LANGS, isRtl } from "@/lib/languages";

type Mode = "de-to-en" | "en-to-de" | "article" | "typing";

interface Question {
  flashcardId: number;
  questionType: Mode;
  prompt: string;
  hint?: string | null;
  options?: string[];
  correctAnswer: string;
  level: string;
}
interface QuizResp { sessionId: string | null; mode: Mode; level: string | null; questions: Question[]; }
interface AnswerLog { flashcardId: number; questionType: Mode; userAnswer: string; correct: boolean; prompt: string; level: string; }

function buildModes(langName: string): { id: Mode; label: string; desc: string; icon: keyof typeof Feather.glyphMap; color: string }[] {
  return [
    { id: "de-to-en", label: `German → ${langName}`, desc: `Pick the ${langName} meaning`, icon: "globe", color: "#3b82f6" },
    { id: "en-to-de", label: `${langName} → German`, desc: "Pick the German word", icon: "globe", color: "#a855f7" },
    { id: "article", label: "Der · Die · Das", desc: "Pick the right article", icon: "star", color: "#f59e0b" },
    { id: "typing", label: "Type the German", desc: "Type the word from memory", icon: "edit-3", color: "#10b981" },
  ];
}
const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
const ARTICLE_COLOR: Record<string, string> = { der: "#3b82f6", die: "#ec4899", das: "#10b981" };

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prefs } = useLangPrefs();
  const [lang, setLang] = useState<string>(prefs.primaryLang || "en");
  const langName = LANG_BY_CODE[lang]?.name ?? "English";
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

  const paddingTop = Platform.OS === "web" ? 24 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  async function startQuiz() {
    if (!mode) return;
    setLoading(true); setError(null); setDone(null); setAnswers([]); setIdx(0);
    setPicked(null); setTyped(""); setRevealed(false);
    try {
      const r = await apiFetch("/ba7r-api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode, level, lang,
          count: level === "mixed" ? 20 : 10,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to start quiz");
      }
      setQuiz(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start quiz");
    } finally { setLoading(false); }
  }

  function submitAnswer() {
    if (!current || revealed) return;
    const userAnswer = current.questionType === "typing" ? typed.trim() : (picked ?? "");
    if (!userAnswer) return;
    const correct = current.questionType === "typing"
      ? userAnswer.toLowerCase() === current.correctAnswer.toLowerCase()
      : userAnswer === current.correctAnswer;
    setAnswers((p) => [...p, { flashcardId: current.flashcardId, questionType: current.questionType, userAnswer, correct, prompt: current.prompt, level: current.level }]);
    setRevealed(true);
  }

  async function nextQuestion() {
    if (!quiz) return;
    if (idx + 1 >= quiz.questions.length) {
      setLoading(true);
      try {
        const r = await apiFetch("/ba7r-api/quiz/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: quiz.sessionId, answers }),
        });
        const j = await r.json().catch(() => ({ correct: score, total: answers.length, saved: false }));
        setDone({ correct: j.correct ?? score, total: j.total ?? answers.length, saved: Boolean(j.saved) });
      } finally { setLoading(false); }
      return;
    }
    setIdx(idx + 1); setPicked(null); setTyped(""); setRevealed(false);
  }

  function reset() {
    setQuiz(null); setDone(null); setAnswers([]); setIdx(0);
    setPicked(null); setTyped(""); setRevealed(false); setError(null);
  }

  // ─── PICKER ────────────────────────────────────────────────────────────────
  if (!quiz && !done) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop, paddingBottom, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.h1, { color: colors.foreground }]}>Quiz Time 🎯</Text>
        <Text style={[s.subtitle, { color: colors.mutedForeground }]}>Pick a mode and test what you've learned.</Text>

        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>MODE</Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {MODES.map((m) => (
            <Pressable
              key={m.id} onPress={() => setMode(m.id)}
              style={[
                s.modeCard,
                { backgroundColor: colors.card, borderColor: mode === m.id ? m.color : colors.border },
                mode === m.id && { backgroundColor: m.color + "12" },
              ]}
            >
              <Feather name={m.icon} size={22} color={mode === m.id ? m.color : colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[s.modeLabel, { color: colors.foreground }]}>{m.label}</Text>
                <Text style={[s.modeDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
              </View>
              {mode === m.id && <Feather name="check-circle" size={20} color={m.color} />}
            </Pressable>
          ))}
        </View>

        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>LANGUAGE</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {SUPPORTED_LANGS.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[
                s.chip,
                {
                  borderColor: lang === l.code ? colors.primary : colors.border,
                  backgroundColor: lang === l.code ? colors.primary + "15" : "transparent",
                },
              ]}
            >
              <Text style={{ fontWeight: "700", color: lang === l.code ? colors.primary : colors.mutedForeground, fontSize: 13 }}>
                {l.nativeName}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>LEVEL</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 10, marginTop: -4 }}>
          Already know some German? Tap{" "}
          <Text style={{ color: colors.primary, fontWeight: "700" }}>🎯 Test my level</Text>
          {" "}for a placement quiz across A1–C1.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          <Pressable
            onPress={() => setLevel("mixed")}
            style={[
              s.chip,
              {
                borderColor: colors.primary,
                backgroundColor: level === "mixed" ? colors.primary + "20" : colors.primary + "08",
              },
            ]}
          >
            <Text style={{ fontWeight: "800", color: colors.primary, fontSize: 13 }}>
              🎯 Test my level
            </Text>
          </Pressable>
          <LevelChip label="All" active={level === null} onPress={() => setLevel(null)} colors={colors} />
          {LEVELS.map((lv) => (
            <LevelChip key={lv} label={lv} active={level === lv} onPress={() => setLevel(lv)} colors={colors} />
          ))}
        </View>

        {error && <Text style={{ color: "#ef4444", marginBottom: 12 }}>{error}</Text>}

        <Pressable
          onPress={startQuiz}
          disabled={!mode || loading}
          style={[s.primaryBtn, { backgroundColor: colors.primary, opacity: !mode || loading ? 0.5 : 1 }]}
        >
          <Text style={s.primaryBtnText}>{loading ? "Loading…" : "Start Quiz"}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ─── RESULTS ───────────────────────────────────────────────────────────────
  if (done) {
    const pct = done.total > 0 ? Math.round((done.correct / done.total) * 100) : 0;
    const grade = pct >= 90 ? "Outstanding! 🏆" : pct >= 70 ? "Great work! 🎉" : pct >= 50 ? "Keep going! 💪" : "Practice makes perfect 📚";

    // Per-level breakdown (computed locally from answers — works for both
    // signed-in and guest users). Shown after a placement quiz or whenever
    // the questions happened to span more than one CEFR level.
    const perLevel: Record<string, { correct: number; total: number }> = {};
    for (const a of answers) {
      const b = (perLevel[a.level] ??= { correct: 0, total: 0 });
      b.total += 1;
      if (a.correct) b.correct += 1;
    }
    const levelsHit = LEVELS.filter((lv) => perLevel[lv]);
    const showBreakdown = quiz?.level === "mixed" || levelsHit.length > 1;
    const estimatedLevel = (() => {
      if (!showBreakdown) return null;
      let best: string | null = null;
      for (const lv of LEVELS) {
        const b = perLevel[lv];
        if (!b || b.total < 2) continue;
        if (b.correct / b.total >= 0.6) best = lv;
      }
      return best;
    })();

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop, paddingBottom, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.bigScore, { color: colors.primary }]}>{pct}%</Text>
          <Text style={[s.grade, { color: colors.foreground }]}>{grade}</Text>
          <Text style={[s.subtitle, { color: colors.mutedForeground, textAlign: "center" }]}>
            {done.correct} of {done.total} correct
          </Text>
          {estimatedLevel && (
            <Text style={{ marginTop: 10, textAlign: "center", color: colors.mutedForeground, fontSize: 14 }}>
              Estimated level:{" "}
              <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 18 }}>{estimatedLevel}</Text>
            </Text>
          )}
          {!done.saved && (
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 8, textAlign: "center" }}>
              Sign in to save quiz history and track your stats.
            </Text>
          )}
        </View>

        {showBreakdown && (
          <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
            <Text style={{ fontWeight: "800", fontSize: 14, color: colors.foreground, marginBottom: 10 }}>
              Per-level breakdown
            </Text>
            {LEVELS.map((lv) => {
              const b = perLevel[lv];
              if (!b) return null;
              const lvPct = Math.round((b.correct / b.total) * 100);
              return (
                <View key={lv} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontWeight: "800", color: colors.foreground }}>{lv}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {b.correct}/{b.total} · {lvPct}%
                    </Text>
                  </View>
                  <View style={[s.progressBg, { backgroundColor: colors.muted }]}>
                    <View style={[s.progressFill, { width: `${lvPct}%`, backgroundColor: colors.primary }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {answers.map((a, i) => (
          <View key={i} style={[s.answerRow, {
            borderColor: a.correct ? "#10b98155" : "#ef444455",
            backgroundColor: a.correct ? "#10b9810f" : "#ef44440f",
          }]}>
            <Feather name={a.correct ? "check" : "x"} size={18} color={a.correct ? "#10b981" : "#ef4444"} />
            <View style={{ flex: 1 }}>
              <Text style={[s.answerPrompt, { color: colors.foreground }]} numberOfLines={1}>{a.prompt}</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                You: <Text style={{ color: a.correct ? "#10b981" : "#ef4444", fontWeight: "700" }}>{a.userAnswer || "—"}</Text>
              </Text>
            </View>
          </View>
        ))}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Pressable onPress={reset} style={[s.secondaryBtn, { borderColor: colors.border, flex: 1 }]}>
            <Text style={[s.secondaryBtnText, { color: colors.foreground }]}>New Quiz</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ─── QUESTION ──────────────────────────────────────────────────────────────
  if (!current) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  const total = quiz!.questions.length;
  const progress = ((idx + (revealed ? 1 : 0)) / total) * 100;
  const isArticle = current.questionType === "article";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop, paddingBottom, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ color: colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>
          Question {idx + 1} of {total}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>Score: {score}</Text>
      </View>
      <View style={[s.progressBg, { backgroundColor: colors.muted }]}>
        <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>

      <View style={[s.questionCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 20 }]}>
        <Text style={[s.questionType, { color: colors.mutedForeground }]}>
          {current.questionType === "de-to-en" && `What does this mean in ${langName}?`}
          {current.questionType === "en-to-de" && "What is this in German?"}
          {current.questionType === "article" && "Der, Die, or Das?"}
          {current.questionType === "typing" && "Type the German word"}
        </Text>
        <Text
          style={[
            s.prompt,
            { color: colors.foreground },
            (current.questionType === "en-to-de" || current.questionType === "typing") && rtl
              ? { writingDirection: "rtl" } : null,
          ]}
        >
          {current.prompt}
        </Text>
        {current.hint && (
          <Text style={{ color: colors.mutedForeground, fontStyle: "italic", marginTop: 6 }}>
            hint: {current.hint}
          </Text>
        )}
      </View>

      {current.questionType === "typing" ? (
        <View style={{ marginTop: 16 }}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            editable={!revealed}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            placeholder="Type here…"
            placeholderTextColor={colors.mutedForeground}
            onSubmitEditing={submitAnswer}
            style={[s.input, {
              backgroundColor: colors.background, color: colors.foreground,
              borderColor: revealed
                ? typed.trim().toLowerCase() === current.correctAnswer.toLowerCase() ? "#10b981" : "#ef4444"
                : colors.border,
            }]}
          />
          {revealed && typed.trim().toLowerCase() !== current.correctAnswer.toLowerCase() && (
            <Text style={{ marginTop: 8, color: colors.mutedForeground }}>
              Correct answer: <Text style={{ color: colors.foreground, fontWeight: "800" }}>{current.correctAnswer}</Text>
            </Text>
          )}
        </View>
      ) : (
        <View style={[s.optionsWrap, isArticle ? { flexDirection: "row" } : {}]}>
          {current.options!.map((opt) => {
            const isCorrect = opt === current.correctAnswer;
            const isPicked = picked === opt;
            const showAsCorrect = revealed && isCorrect;
            const showAsWrong = revealed && isPicked && !isCorrect;
            const articleC = isArticle ? ARTICLE_COLOR[opt] : undefined;
            return (
              <Pressable
                key={opt} disabled={revealed}
                onPress={() => setPicked(opt)}
                style={[
                  s.optionBtn,
                  isArticle && { flex: 1 },
                  {
                    backgroundColor: colors.card,
                    borderColor: showAsCorrect ? "#10b981" : showAsWrong ? "#ef4444"
                      : isPicked ? colors.primary : colors.border,
                  },
                  showAsCorrect && { backgroundColor: "#10b98120" },
                  showAsWrong && { backgroundColor: "#ef444420" },
                  !revealed && isPicked && { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Text style={[
                  s.optionText,
                  { color: showAsCorrect ? "#10b981" : showAsWrong ? "#ef4444" : (articleC ?? colors.foreground) },
                ]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {!revealed ? (
        <Pressable
          onPress={submitAnswer}
          disabled={current.questionType === "typing" ? !typed.trim() : !picked}
          style={[s.primaryBtn, {
            backgroundColor: colors.primary, marginTop: 20,
            opacity: (current.questionType === "typing" ? !typed.trim() : !picked) ? 0.5 : 1,
          }]}
        >
          <Text style={s.primaryBtnText}>Check</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={nextQuestion} disabled={loading}
          style={[s.primaryBtn, { backgroundColor: colors.primary, marginTop: 20, opacity: loading ? 0.6 : 1 }]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={s.primaryBtnText}>{idx + 1 >= total ? "See Results" : "Next →"}</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

function LevelChip({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.chip,
        { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "15" : "transparent" },
      ]}
    >
      <Text style={{ fontWeight: "700", color: active ? colors.primary : colors.mutedForeground }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "900", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 10 },
  modeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 2 },
  modeLabel: { fontSize: 15, fontWeight: "800" },
  modeDesc: { fontSize: 12, marginTop: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 2 },
  primaryBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondaryBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  secondaryBtnText: { fontWeight: "700" },
  progressBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  questionCard: { padding: 24, borderRadius: 18, borderWidth: 1, alignItems: "center" },
  questionType: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, textAlign: "center" },
  prompt: { fontSize: 32, fontWeight: "900", textAlign: "center" },
  optionsWrap: { gap: 10, marginTop: 16 },
  optionBtn: { padding: 16, borderRadius: 14, borderWidth: 2, alignItems: "center" },
  optionText: { fontSize: 17, fontWeight: "800" },
  input: { padding: 14, borderRadius: 12, borderWidth: 2, fontSize: 18, fontWeight: "700" },
  resultCard: { padding: 28, borderRadius: 20, borderWidth: 1, alignItems: "center", marginBottom: 16 },
  bigScore: { fontSize: 64, fontWeight: "900" },
  grade: { fontSize: 22, fontWeight: "800", marginVertical: 8 },
  answerRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  answerPrompt: { fontSize: 13, fontWeight: "700" },
});
