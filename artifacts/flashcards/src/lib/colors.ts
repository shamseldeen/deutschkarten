import { z } from "zod";

export const getLevelColor = (level: string) => {
  switch (level?.toUpperCase()) {
    case "A1":
      return "bg-level-a1/10 text-level-a1 border-level-a1/20";
    case "A2":
      return "bg-level-a2/10 text-level-a2 border-level-a2/20";
    case "B1":
      return "bg-level-b1/10 text-level-b1 border-level-b1/20";
    case "B2":
      return "bg-level-b2/10 text-level-b2 border-level-b2/20";
    case "C1":
      return "bg-level-c1/10 text-level-c1 border-level-c1/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const getGenderColor = (article: string | null | undefined) => {
  switch (article?.toLowerCase()) {
    case "der":
      return "text-gender-der";
    case "die":
      return "text-gender-die";
    case "das":
      return "text-gender-das";
    default:
      return "text-foreground";
  }
};

export const getGenderBgColor = (article: string | null | undefined) => {
  switch (article?.toLowerCase()) {
    case "der":
      return "bg-gender-der";
    case "die":
      return "bg-gender-die";
    case "das":
      return "bg-gender-das";
    default:
      return "bg-foreground";
  }
};
