import { useState } from "react";
import { ChevronDown, Plus, Check, Trash2, Layers } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListWorkspaces,
  useCreateWorkspace,
  useSwitchWorkspace,
  useDeleteWorkspace,
  type Workspace,
  type WorkspaceCreateInputSecondaryLanguage,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "ES", label: "Spanish" },
  { code: "FR", label: "French" },
  { code: "IT", label: "Italian" },
  { code: "TR", label: "Turkish" },
];

const FLAG: Record<string, string> = {
  AR: "🇸🇦",
  EN: "🇬🇧",
  ES: "🇪🇸",
  FR: "🇫🇷",
  IT: "🇮🇹",
  TR: "🇹🇷",
};

function invalidateScopedQueries(qc: ReturnType<typeof useQueryClient>) {
  // The generated query keys are prefixed with the request path (e.g.
  // ["/api/flashcards", ...params]). Invalidate everything that the
  // current workspace influences.
  for (const key of [
    "/api/me/workspaces",
    "/api/me/stats",
    "/api/flashcards",
    "/api/flashcards/stats",
    "/api/flashcards/daily",
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

export function WorkspaceSwitcher() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListWorkspaces();
  const [showCreate, setShowCreate] = useState(false);
  const [newLang, setNewLang] = useState<string>("EN");
  const [newName, setNewName] = useState("");

  const switchMutation = useSwitchWorkspace();
  const createMutation = useCreateWorkspace();
  const deleteMutation = useDeleteWorkspace();

  if (isLoading || !data) return null;

  const current = data.workspaces.find((w) => w.isCurrent) ?? data.workspaces[0];
  const userWorkspaces = data.workspaces.filter((w) => !w.isDefault);
  const canCreate = userWorkspaces.length < 2;

  const handleSwitch = (ws: Workspace) => {
    if (ws.isCurrent) return;
    switchMutation.mutate(
      { id: ws.id },
      {
        onSuccess: () => {
          invalidateScopedQueries(qc);
          toast({ title: `Switched to ${ws.name}` });
        },
        onError: () => toast({ title: "Could not switch workspace", variant: "destructive" }),
      },
    );
  };

  const handleDelete = (ws: Workspace) => {
    if (ws.isDefault) return;
    if (!confirm(`Delete "${ws.name}" workspace? Its progress will be lost.`)) return;
    deleteMutation.mutate(
      { id: ws.id },
      {
        onSuccess: () => {
          invalidateScopedQueries(qc);
          toast({ title: "Workspace deleted" });
        },
        onError: () => toast({ title: "Could not delete workspace", variant: "destructive" }),
      },
    );
  };

  const handleCreate = () => {
    createMutation.mutate(
      {
        data: {
          secondaryLanguage: newLang as WorkspaceCreateInputSecondaryLanguage,
          name: newName.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          invalidateScopedQueries(qc);
          setShowCreate(false);
          setNewName("");
          setNewLang("EN");
          toast({ title: "Workspace created" });
        },
        onError: (e) =>
          toast({
            title: "Could not create workspace",
            description: (e as Error)?.message ?? "Try again",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2"
            data-testid="workspace-switcher-trigger"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden md:inline text-sm">
              {FLAG[current?.secondaryLanguage ?? "AR"]} {current?.name ?? "Arabic"}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {data.workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onSelect={() => handleSwitch(ws)}
              className="flex items-center gap-2"
            >
              <span className="text-base">{FLAG[ws.secondaryLanguage] ?? "🏳️"}</span>
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.isCurrent && <Check className="w-4 h-4 text-primary" />}
              {!ws.isDefault && !ws.isCurrent && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(ws);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${ws.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!canCreate}
            onSelect={(e) => {
              e.preventDefault();
              if (canCreate) setShowCreate(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {canCreate ? "New workspace" : "Max 3 workspaces"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              A workspace pairs German with a second language. Cards, progress and stats are kept
              separate from your other workspaces.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Target language</label>
              <Select value={newLang} onValueChange={setNewLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {FLAG[l.code]} {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name (optional)</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={LANGUAGES.find((l) => l.code === newLang)?.label ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="workspace-create-submit"
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
