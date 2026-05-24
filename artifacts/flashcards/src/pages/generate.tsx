import { Layout } from "@/components/layout";
import { useGenerateFlashcards, FlashcardLevel, FlashcardGenerateInputLevel } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2 } from "lucide-react";
import { useLocation } from "wouter";

const generateSchema = z.object({
  level: z.enum([
    FlashcardGenerateInputLevel.A1,
    FlashcardGenerateInputLevel.A2,
    FlashcardGenerateInputLevel.B1,
    FlashcardGenerateInputLevel.B2,
    FlashcardGenerateInputLevel.C1
  ]),
  category: z.string().optional(),
  count: z.coerce.number().min(1).max(20).default(5),
});

type GenerateFormValues = z.infer<typeof generateSchema>;

export default function Generate() {
  const generateMutation = useGenerateFlashcards();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      level: FlashcardGenerateInputLevel.A1,
      category: "",
      count: 5,
    },
  });

  const onSubmit = (data: GenerateFormValues) => {
    generateMutation.mutate({ data }, {
      onSuccess: (cards) => {
        toast({
          title: "Cards Generated!",
          description: `Successfully created ${cards.length} new flashcards.`,
        });
        setLocation("/browse");
      },
      onError: (error) => {
        toast({
          title: "Generation Failed",
          description: "There was an error generating flashcards. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black font-serif">Generate Flashcards</h1>
          <p className="text-muted-foreground mt-2">Use AI to instantly create rich, multi-lingual flashcards complete with context and examples.</p>
        </div>

        <Card className="border-primary/20 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              AI Generation Settings
            </CardTitle>
            <CardDescription>
              Choose a CEFR level and an optional category (like "food", "travel", or "business") to guide the generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEFR Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={FlashcardGenerateInputLevel.A1}>A1 (Beginner)</SelectItem>
                            <SelectItem value={FlashcardGenerateInputLevel.A2}>A2 (Elementary)</SelectItem>
                            <SelectItem value={FlashcardGenerateInputLevel.B1}>B1 (Intermediate)</SelectItem>
                            <SelectItem value={FlashcardGenerateInputLevel.B2}>B2 (Upper Intermediate)</SelectItem>
                            <SelectItem value={FlashcardGenerateInputLevel.C1}>C1 (Advanced)</SelectItem>
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
                        <FormDescription>Generate up to 20 cards at once.</FormDescription>
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
                        <Input placeholder="e.g. at the restaurant, ordering train tickets..." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>Leave blank for random vocabulary appropriate for the level.</FormDescription>
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
                      Generating Magic...
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
      </div>
    </Layout>
  );
}
