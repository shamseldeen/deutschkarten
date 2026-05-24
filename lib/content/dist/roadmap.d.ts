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
export declare const ROADMAP: LevelRoadmap[];
export type StudyHabitIcon = "calendar" | "mic" | "tag" | "headphones" | "repeat" | "edit-3";
export interface StudyHabit {
    title: string;
    desc: string;
    icon: StudyHabitIcon;
}
export declare const STUDY_HABITS: StudyHabit[];
//# sourceMappingURL=roadmap.d.ts.map