export type Milestone = {
  count: number;
  emoji: string;
  headline: string;
  sub: string;
  color: "amber" | "emerald" | "blue" | "purple" | "rose";
};

export const MILESTONES: Milestone[] = [
  {
    count: 10,
    emoji: "🎯",
    headline: "أحسنت! ذاكرت 10 بطاقات",
    sub: "بداية رائعة — تقدمك حقيقي. سجّل الآن حتى لا تضيعه.",
    color: "amber",
  },
  {
    count: 20,
    emoji: "🔥",
    headline: "20 بطاقة! أنت في الإيقاع",
    sub: "ذاكرت 20 كلمة ألمانية في جلسة واحدة. هذا إنجاز. لا تتركه في المتصفح.",
    color: "amber",
  },
  {
    count: 50,
    emoji: "⚡",
    headline: "50 بطاقة — مذهل!",
    sub: "أنت تُنجز ما لا يفعله معظم الناس. تقدمك يستحق أن يُحفظ.",
    color: "emerald",
  },
  {
    count: 100,
    emoji: "🏆",
    headline: "100 بطاقة! لا تُضيّع هذا",
    sub: "مئة كلمة ألمانية في جلسة واحدة. هذا مستوى لا يصله إلا المجتهدون. سجّل الآن وحافظ على هذا التقدم.",
    color: "blue",
  },
  {
    count: 150,
    emoji: "🚀",
    headline: "150 بطاقة — أنت لا تعرف الكسل!",
    sub: "استمر، وسجّل حسابك حتى نحفظ رحلتك كاملة.",
    color: "purple",
  },
  {
    count: 200,
    emoji: "🐙",
    headline: "200 بطاقة — أنت كراكن المذاكرة!",
    sub: "أعلى مستوى في التفاني. تقدمك يستحق خادماً حقيقياً، لا localStorage.",
    color: "rose",
  },
];

const SHOWN_KEY = "__dk_milestones_shown";

let _sessionCardCount = 0;

export function incrementSessionCount(): number {
  _sessionCardCount += 1;
  return _sessionCardCount;
}

export function getSessionCardCount(): number {
  return _sessionCardCount;
}

function getShownSet(): Set<number> {
  try {
    const raw = sessionStorage.getItem(SHOWN_KEY);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {}
  return new Set();
}

function markShown(count: number) {
  try {
    const s = getShownSet();
    s.add(count);
    sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...s]));
  } catch {}
}

export function checkMilestone(newCount: number): Milestone | null {
  const shown = getShownSet();
  for (const m of MILESTONES) {
    if (newCount >= m.count && !shown.has(m.count)) {
      markShown(m.count);
      return m;
    }
  }
  return null;
}
