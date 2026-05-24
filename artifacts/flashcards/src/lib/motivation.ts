export interface Motivation {
  de: string;
  en: string;
  ar: string;
}

export const MOTIVATIONS: Motivation[] = [
  {
    de: "Wer eine Sprache lernt, gewinnt eine zweite Seele.",
    en: "He who learns a language gains a second soul.",
    ar: "من يتعلّم لغةً يكسب روحاً ثانية.",
  },
  {
    de: "Übung macht den Meister.",
    en: "Practice makes the master.",
    ar: "بالممارسة تتقن.",
  },
  {
    de: "Schritt für Schritt wirst du Deutsch beherrschen.",
    en: "Step by step you will master German.",
    ar: "خطوة بخطوة ستتقن الألمانية.",
  },
  {
    de: "Heute zehn Wörter — morgen ein Gespräch.",
    en: "Ten words today — a conversation tomorrow.",
    ar: "عشر كلمات اليوم — محادثة غداً.",
  },
  {
    de: "Aller Anfang ist schwer, aber jeder Tag macht es leichter.",
    en: "All beginnings are hard, but every day makes it easier.",
    ar: "كل البدايات صعبة، لكنّ كل يومٍ يجعلها أسهل.",
  },
  {
    de: "Kleine Schritte führen zu großen Zielen.",
    en: "Small steps lead to great goals.",
    ar: "الخطوات الصغيرة تقود إلى أهدافٍ كبيرة.",
  },
  {
    de: "Fehler sind Beweise, dass du es versuchst.",
    en: "Mistakes are proof that you are trying.",
    ar: "الأخطاء دليلٌ على أنك تحاول.",
  },
  {
    de: "Sprache ist der Schlüssel zur Welt.",
    en: "Language is the key to the world.",
    ar: "اللغة هي مفتاح العالم.",
  },
  {
    de: "Du kannst mehr, als du denkst.",
    en: "You can do more than you think.",
    ar: "تستطيع أكثر مما تظن.",
  },
  {
    de: "Lerne jeden Tag etwas Neues.",
    en: "Learn something new every day.",
    ar: "تعلّم شيئاً جديداً كل يوم.",
  },
];

export function pickMotivationOfTheDay(date = new Date()): Motivation {
  const days = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return MOTIVATIONS[days % MOTIVATIONS.length]!;
}
