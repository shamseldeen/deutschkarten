import { Layout } from "@/components/layout";
import {
  useGenerateFlashcards,
  FlashcardGenerateInputLevel,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2, Clock, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useCallback } from "react";

const generateSchema = z.object({
  level: z.enum([
    FlashcardGenerateInputLevel.A1,
    FlashcardGenerateInputLevel.A2,
    FlashcardGenerateInputLevel.B1,
    FlashcardGenerateInputLevel.B2,
    FlashcardGenerateInputLevel.C1,
  ]),
  category: z.string().optional(),
  count: z.coerce.number().min(1).max(20).default(5),
});
type GenerateFormValues = z.infer<typeof generateSchema>;

interface LimitStatus {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

function useCountdown(resetsAt: string | null) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!resetsAt) {
      setLabel("");
      return;
    }
    const tick = () => {
      const diff = new Date(resetsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(
        `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resetsAt]);
  return label;
}

export default function Generate() {
  const generateMutation = useGenerateFlashcards();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [limitStatus, setLimitStatus] = useState<LimitStatus | null>(null);
  const [blockedResetsAt, setBlockedResetsAt] = useState<string | null>(null);
  const countdown = useCountdown(blockedResetsAt);

  const fetchStatus = useCallback(() => {
    fetch("/ba7r-api/flashcards/generate/status")
      .then((r) => r.json())
      .then((data: LimitStatus) => {
        setLimitStatus(data);
        if (data.remaining === 0) setBlockedResetsAt(data.resetsAt);
        else setBlockedResetsAt(null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      level: FlashcardGenerateInputLevel.A1,
      category: "",
      count: 5,
    },
  });

  const onSubmit = (data: GenerateFormValues) => {
    generateMutation.mutate(
      { data },
      {
        onSuccess: (cards) => {
          toast({
            title: "Cards Generated!",
            description: `Created ${cards.length} new flashcards.`,
          });
          fetchStatus();
          setLocation("/browse");
        },
        onError: (error: any) => {
          const status = error?.status ?? error?.response?.status;
          const body = error?.data ?? error?.response?.data ?? {};
          if (status === 429 || body?.resetsAt) {
            setBlockedResetsAt(body.resetsAt ?? null);
            setLimitStatus((prev) =>
              prev ? { ...prev, remaining: 0, used: prev.limit } : null,
            );
            toast({
              title: "Daily limit reached",
              description:
                "You've used all free AI generations for today. Keep learning in the meantime!",
              variant: "destructive",
            });
          } else if (status === 502) {
            toast({
              title: "AI Generation Failed",
              description:
                body?.detail ??
                body?.error ??
                "The AI service is unavailable. Please try again in a moment.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Generation Failed",
              description: body?.error ?? "Please try again.",
              variant: "destructive",
            });
          }
          fetchStatus();
        },
      },
    );
  };

  const isBlocked = limitStatus ? limitStatus.remaining === 0 : false;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black font-serif">
            Generate Flashcards
          </h1>
          <p className="text-muted-foreground mt-2">
            Use AI to instantly create rich, multi-lingual flashcards complete
            with context and examples.
          </p>
        </div>

        {/* Free tier banner */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <span className="font-bold">Free AI Generation</span> —{" "}
            {limitStatus ? (
              <>
                You have{" "}
                <span
                  className={`font-bold ${limitStatus.remaining === 0 ? "text-red-600" : "text-blue-700"}`}
                >
                  {limitStatus.remaining} of {limitStatus.limit}
                </span>{" "}
                generations remaining today.
                {limitStatus.remaining === 0 && (
                  <>
                    {" "}
                    Resets in{" "}
                    <span className="font-mono font-bold">
                      {countdown || "calculating…"}
                    </span>
                    .
                  </>
                )}
              </>
            ) : (
              "Up to 3 free AI generations per day."
            )}
          </div>
        </div>

        {/* Limit reached card */}
        {isBlocked ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
              <Clock className="w-12 h-12 text-red-400" />
              <div>
                <p className="text-lg font-bold text-red-700">
                  Daily limit reached
                </p>
                <p className="text-sm text-red-600 mt-1">
                  You've used all {limitStatus?.limit} free AI generations for
                  today.
                </p>
              </div>
              <div className="rounded-xl bg-white border border-red-200 px-8 py-4">
                <p className="text-xs text-red-400 uppercase font-semibold tracking-widest mb-1">
                  Next generation available in
                </p>
                <p className="text-4xl font-mono font-black text-red-600">
                  {countdown || "—"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                While you wait, keep studying your existing cards or browse all{" "}
                <button
                  className="underline text-blue-600"
                  onClick={() => setLocation("/browse")}
                >
                  your flashcards
                </button>
                .
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20 shadow-md shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                AI Generation Settings
              </CardTitle>
              <CardDescription>
                Choose a CEFR level and an optional category (like "food",
                "travel", or "business") to guide the generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEFR Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem
                                value={FlashcardGenerateInputLevel.A1}
                              >
                                A1 (Beginner)
                              </SelectItem>
                              <SelectItem
                                value={FlashcardGenerateInputLevel.A2}
                              >
                                A2 (Elementary)
                              </SelectItem>
                              <SelectItem
                                value={FlashcardGenerateInputLevel.B1}
                              >
                                B1 (Intermediate)
                              </SelectItem>
                              <SelectItem
                                value={FlashcardGenerateInputLevel.B2}
                              >
                                B2 (Upper Intermediate)
                              </SelectItem>
                              <SelectItem
                                value={FlashcardGenerateInputLevel.C1}
                              >
                                C1 (Advanced)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Cards</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} max={20} {...field} />
                          </FormControl>
                          <FormDescription>
                            Generate up to 20 cards at once.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. at the restaurant, ordering train tickets..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Leave blank for random vocabulary for the selected
                          level.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full font-bold"
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Magic…
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5 mr-2" />
                        Generate Cards
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
