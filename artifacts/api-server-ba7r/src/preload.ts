if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for Ba7r API server");
}

const url = new URL(process.env.DATABASE_URL);
const existing = url.searchParams.get("options") ?? "";
const withoutSearchPath = existing
  .split(" ")
  .filter((opt) => !/^-c\s*search_path=/i.test(opt))
  .join(" ")
  .trim();
const merged = [withoutSearchPath, "-csearch_path=ba7r,public"]
  .filter(Boolean)
  .join(" ");
url.searchParams.set("options", merged);
process.env.DATABASE_URL = url.toString();
