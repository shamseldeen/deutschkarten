import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListFlashcards, FlashcardLevel, ListFlashcardsParams } from "@workspace/api-client-react";
import { Flashcard } from "@/components/flashcard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getGenderColor, getLevelColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function Browse() {
  const [level, setLevel] = useState<FlashcardLevel | "ALL">("ALL");
  const [category, setCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const params: ListFlashcardsParams = {
    limit: 100,
    offset: 0,
    ...(level !== "ALL" ? { level: level as FlashcardLevel } : {}),
    ...(category ? { category } : {}),
  };

  const { data, isLoading } = useListFlashcards(params, { 
    query: { queryKey: ["/ba7r-api/flashcards", level, category] } 
  });

  const filteredItems = data?.items.filter(item => 
    searchTerm ? item.baseWord.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 item.englishTranslation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 item.arabicTranslation.includes(searchTerm) : true
  ) || [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black font-serif">Browse Library</h1>
            <p className="text-muted-foreground mt-1">Search and filter your entire vocabulary collection.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex-1">
            <Input 
              placeholder="Search in German, English, or Arabic..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background"
            />
          </div>
          <Select value={level} onValueChange={(val: any) => setLevel(val)}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              {Object.values(FlashcardLevel).map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input 
            placeholder="Category (e.g. food)" 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-[200px] bg-background"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((card) => (
              <Dialog key={card.id}>
                <DialogTrigger asChild>
                  <div className="group cursor-pointer bg-card border border-border hover:border-primary/40 rounded-xl p-4 transition-all hover:shadow-md hover-elevate">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5", getLevelColor(card.level))}>
                        {card.level}
                      </Badge>
                      {card.known && (
                        <div className="w-2 h-2 rounded-full bg-green-500" title="Known" />
                      )}
                    </div>
                    <h3 className="font-serif text-xl font-bold text-foreground truncate">
                      {card.article && (
                        <span className={cn("mr-1.5 text-sm", getGenderColor(card.article))}>
                          {card.article}
                        </span>
                      )}
                      {card.baseWord}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{card.englishTranslation}</p>
                    <p className="text-lg text-foreground mt-2 truncate text-right font-medium" dir="rtl">{card.arabicTranslation}</p>
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] p-0 bg-transparent border-none shadow-none">
                  <Flashcard card={card} />
                </DialogContent>
              </Dialog>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground text-lg">No flashcards found matching your criteria.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
