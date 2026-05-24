export interface LevelRoadmap {
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  title: string;
  description: string;
  vocabGoal: number;
  hoursEstimate: string;
  canDo: string[];
  grammar: string[];
  topics: string[];
}

export const ROADMAP: LevelRoadmap[] = [
  {
    level: "A1",
    title: "Breakthrough — first words",
    description: "Greet people, introduce yourself, talk about family and daily life.",
    vocabGoal: 500,
    hoursEstimate: "60–80 hours",
    canDo: [
      "Order food, drinks and ask for the bill",
      "Spell your name and tell where you live",
      "Understand slow, clear questions about familiar topics",
      "Write a short postcard or text message",
    ],
    grammar: [
      "Personal pronouns (ich, du, er/sie/es, wir, ihr, sie/Sie)",
      "Present tense — regular and key irregular verbs (sein, haben, gehen)",
      "Articles: der, die, das + ein/eine (nominative)",
      "Negation with nicht and kein",
      "Numbers, days, time, dates",
      "W-questions (Wer? Was? Wo? Wann? Wie?)",
    ],
    topics: [
      "Greetings & introductions",
      "Family, friends, body",
      "Food, drinks, shopping",
      "Numbers, time, weather",
      "Home, rooms, furniture",
    ],
  },
  {
    level: "A2",
    title: "Waystage — everyday life",
    description: "Handle routine errands, describe past events, express what you like.",
    vocabGoal: 1200,
    hoursEstimate: "120–160 hours",
    canDo: [
      "Talk about your day in past tense",
      "Make appointments and small talk",
      "Read short articles and find key information",
      "Write a simple e-mail to a friend",
    ],
    grammar: [
      "Perfekt with haben & sein (Ich habe gegessen / Ich bin gefahren)",
      "Präteritum of sein, haben, modal verbs",
      "Modal verbs: können, müssen, dürfen, sollen, wollen, mögen",
      "Accusative & Dative cases + prepositions (für, mit, von, zu, …)",
      "Possessive articles (mein, dein, sein, ihr, unser)",
      "Comparatives & superlatives (groß / größer / am größten)",
    ],
    topics: [
      "Job, work, school",
      "Health & doctor's visit",
      "Travel, directions, transport",
      "Hobbies, sports, free time",
      "Apartment hunting, daily routine",
    ],
  },
  {
    level: "B1",
    title: "Threshold — independent user",
    description: "Manage most situations while travelling. Explain opinions and plans.",
    vocabGoal: 2500,
    hoursEstimate: "240–320 hours",
    canDo: [
      "Hold a conversation on familiar topics with native speakers",
      "Write a coherent letter, e-mail, or short essay",
      "Understand the main points of news or radio reports",
      "Pass the Goethe-Zertifikat B1 / Einbürgerungstest",
    ],
    grammar: [
      "Subordinate clauses: weil, dass, wenn, obwohl, damit",
      "Relative clauses (der Mann, der …)",
      "Konjunktiv II (würde / wäre / hätte) — wishes & polite requests",
      "Passive voice (Das Buch wird gelesen)",
      "Two-way prepositions (in, an, auf, …) with accusative vs dative",
      "Reflexive verbs (sich freuen, sich erinnern)",
    ],
    topics: [
      "Opinions & arguments",
      "Plans for the future",
      "Environment & society",
      "Media, internet, news",
      "Culture, books, films",
    ],
  },
  {
    level: "B2",
    title: "Vantage — confident communicator",
    description: "Speak fluently with native speakers and discuss complex topics.",
    vocabGoal: 4000,
    hoursEstimate: "400–500 hours",
    canDo: [
      "Follow lectures, podcasts and films without subtitles",
      "Write a structured essay or formal complaint",
      "Argue a position with examples and counter-arguments",
      "Study at a German university (TestDaF / Goethe B2)",
    ],
    grammar: [
      "All verb tenses incl. Plusquamperfekt and Futur II",
      "Konjunktiv I (indirect speech / reported)",
      "Nominalisation: verbs → nouns (lesen → das Lesen)",
      "Adjective endings — all 3 genders × 4 cases × def/indef",
      "Verbs with fixed prepositions (denken an, warten auf, …)",
      "Connectors: einerseits/andererseits, trotzdem, dennoch",
    ],
    topics: [
      "Politics, economy, history",
      "Science & technology",
      "Workplace communication",
      "Academic writing & presentations",
      "Idioms & figurative language",
    ],
  },
  {
    level: "C1",
    title: "Effective Operational Proficiency",
    description: "Use German flexibly for academic, professional and social purposes.",
    vocabGoal: 6000,
    hoursEstimate: "600–800 hours",
    canDo: [
      "Express yourself spontaneously without searching for words",
      "Understand long literary or technical texts",
      "Write detailed reports with clear structure",
      "Goethe-Zertifikat C1 / DSH-2 / TestDaF 4×4",
    ],
    grammar: [
      "Advanced word order & emphasis (Inversion, topicalisation)",
      "Participial constructions (das wachsende Interesse, gelaufen sein)",
      "Subjunctive in formal style (Konjunktiv I & II reported)",
      "Nominal style and complex noun phrases",
      "Modal particles (doch, ja, halt, eben, mal)",
      "Stylistic registers: gehoben, neutral, umgangssprachlich",
    ],
    topics: [
      "Philosophy & abstract debate",
      "Literature & rhetorical analysis",
      "Specialised professional vocabulary",
      "Cultural & regional varieties",
      "Negotiation & persuasion",
    ],
  },
];

export type StudyHabitIcon =
  | "calendar"
  | "mic"
  | "tag"
  | "headphones"
  | "repeat"
  | "edit-3";

export interface StudyHabit {
  title: string;
  desc: string;
  icon: StudyHabitIcon;
}

export const STUDY_HABITS: StudyHabit[] = [
  {
    title: "20 minutes daily beats 3 hours weekly",
    desc: "Short, daily exposure builds long-term memory better than rare marathon sessions.",
    icon: "calendar",
  },
  {
    title: "Speak from day one",
    desc: "Even single words. Pronounce them aloud — your mouth needs the practice too.",
    icon: "mic",
  },
  {
    title: "Learn nouns with their article",
    desc: "Never just \u201cHaus\u201d — always \u201cdas Haus\u201d. Gender is part of the word.",
    icon: "tag",
  },
  {
    title: "Mix listening + reading",
    desc: "Pair a podcast with its transcript. Hearing + seeing locks vocabulary in faster.",
    icon: "headphones",
  },
  {
    title: "Review yesterday before learning new",
    desc: "Spaced repetition: the brain only keeps what it sees again on day 1, 3, 7, 14, 30.",
    icon: "repeat",
  },
  {
    title: "Use the new word the same day",
    desc: "Write a sentence, message a friend, or describe your room. Active use sticks.",
    icon: "edit-3",
  },
];
