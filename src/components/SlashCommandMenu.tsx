import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { cn } from "@/lib/utils";
import { useSettingsStore, LANGUAGES } from "@/store/settingsStore";
import type { Skill } from "./SkillsManager";
import { Code2, Bug, Play, Languages, FileText, Puzzle } from "lucide-react";

interface SlashCommandMenuProps {
  open: boolean;
  query: string;
  onSelect: (skill: Skill) => void;
  onClose: () => void;
}

const BUILTIN_COMMANDS: { id: string; title: string; description: string; icon: any }[] = [
  { id: "code_review", title: "Code Review", description: "Đánh giá code", icon: Code2 },
  { id: "bug_hunter", title: "Bug Hunter", description: "Tìm và sửa lỗi", icon: Bug },
  { id: "explain", title: "Code Explainer", description: "Giải thích code", icon: FileText },
  { id: "translate", title: "Translator", description: "Dịch đa ngôn ngữ", icon: Languages },
  { id: "write_test", title: "Test Writer", description: "Tạo unit test", icon: Play },
  { id: "security", title: "Security Audit", description: "Kiểm tra bảo mật", icon: Bug },
];

export function SlashCommandMenu({ open, query, onSelect, onClose }: SlashCommandMenuProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLanguages, setShowLanguages] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { translateTarget, setTranslateTarget } = useSettingsStore();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    invoke<Skill[]>("scan_skills")
      .then(setSkills)
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
    // Show language picker when typing /translate
    setShowLanguages(query.startsWith("translate"));
  }, [query]);

  // Filter builtin commands
  const filteredBuiltin = BUILTIN_COMMANDS.filter(
    (c) => c.id.includes(query.toLowerCase()) || c.title.toLowerCase().includes(query.toLowerCase())
  );

  // Filter custom skills
  const filteredSkills = skills.filter(
    (s) => s.title.toLowerCase().includes(query.toLowerCase()) || s.id.includes(query.toLowerCase())
  );

  const allItems = useMemo(
    () => [
      ...filteredBuiltin.map((c) => ({ ...c, type: "builtin" as const })),
      ...filteredSkills.map((s) => ({ ...s, type: "skill" as const })),
    ],
    [filteredBuiltin, filteredSkills]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          onSelect({
            id: allItems[selectedIndex].id,
            title: allItems[selectedIndex].title,
            description: allItems[selectedIndex].description,
            icon: "extension",
            filename: "",
            installed: true,
          });
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [allItems, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 z-50 mb-2 w-80 max-h-80 overflow-hidden rounded-xl border border-border bg-surface shadow-elevated"
    >
      <div className="border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {loading ? "Đang tải..." : `${allItems.length} commands`}
        </span>
      </div>

      {/* Language picker for /translate */}
      {showLanguages && (
        <div className="border-b border-border px-3 py-2">
          <div className="text-[10px] text-muted-foreground/60 mb-1.5">Chọn ngôn ngữ dịch đến:</div>
          <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto">
            {Object.entries(LANGUAGES)
              .slice(0, 24)
              .map(([code, lang]) => (
                <button
                  key={code}
                  onClick={() => {
                    setTranslateTarget(code as any);
                    onSelect({
                      id: "translate",
                      title: "Translator",
                      description: `Dịch sang ${lang.label}`,
                      icon: "extension",
                      filename: "",
                      installed: true,
                    });
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition",
                    translateTarget === code
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-surface-elevated"
                  )}
                >
                  <span>{lang.flag}</span>
                  <span className="truncate">{lang.label}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Commands list */}
      <div className="overflow-y-auto max-h-48">
        {allItems.length === 0 && !loading ? (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            Không tìm thấy command nào
          </div>
        ) : (
          allItems.map((item, i) => {
            const Icon = item.type === "builtin" ? item.icon : Puzzle;
            return (
              <button
                key={item.id}
                onClick={() =>
                  onSelect({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    icon: "extension",
                    filename: "",
                    installed: true,
                  })
                }
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition",
                  i === selectedIndex ? "bg-primary/10" : "hover:bg-surface-elevated"
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-foreground">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {item.description}
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground/40 font-mono">/{item.id}</span>
                {item.type === "skill" && (
                  <span className="text-[8px] text-emerald-400 bg-emerald-400/10 px-1 rounded">
                    custom
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
