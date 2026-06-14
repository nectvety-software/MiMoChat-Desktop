import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { cn } from "@/lib/utils";
import {
  Puzzle,
  Search,
  X,
  Plus,
  Loader2,
  Trash2,
  Download,
  ExternalLink,
  Upload,
  Code2,
  Bug,
  Languages,
  Terminal,
  Database,
  Shield,
  Palette,
  Type,
  GitBranch,
  Zap,
  Settings,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Cpu,
  RefreshCw,
  Layers,
  Check,
  Copy,
  Wand2,
  Sparkles,
  FileText,
} from "lucide-react";

const MIMO_SKILLS = [
  {
    id: "code_review",
    icon: Code2,
    title: "Code Review",
    desc: "Đánh giá code chuyên nghiệp",
    prompt: "/code_review ",
  },
  {
    id: "bug_hunter",
    icon: Bug,
    title: "Bug Hunter",
    desc: "Tìm và sửa lỗi code",
    prompt: "/bug_hunter ",
  },
  {
    id: "refactor",
    icon: Wand2,
    title: "Refactor",
    desc: "Tái cấu trúc code sạch hơn",
    prompt: "/refactor ",
  },
  {
    id: "explain",
    icon: BookOpen,
    title: "Code Explainer",
    desc: "Giải thích code đơn giản",
    prompt: "/explain ",
  },
  {
    id: "write_test",
    icon: Check,
    title: "Test Writer",
    desc: "Tạo unit test tự động",
    prompt: "/write_test ",
  },
  { id: "api", icon: Layers, title: "API Builder", desc: "Thiết kế REST API", prompt: "/api " },
  { id: "sql", icon: Database, title: "SQL Expert", desc: "Viết & tối ưu SQL", prompt: "/sql " },
  {
    id: "security",
    icon: Shield,
    title: "Security Audit",
    desc: "Kiểm tra bảo mật code",
    prompt: "/security ",
  },
  { id: "doc", icon: FileText, title: "Doc Generator", desc: "Tạo documentation", prompt: "/doc " },
  {
    id: "translate",
    icon: Languages,
    title: "Translator",
    desc: "Dịch đa ngôn ngữ",
    prompt: "/translate ",
  },
];

type SkillTab = "mimo" | "custom";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  rate_review: Code2,
  commit: GitBranch,
  help_outline: HelpCircle,
  bug_report: Bug,
  checklist: Check,
  auto_fix_high: Wand2,
  api: Layers,
  database: Database,
  security: Shield,
  description: BookOpen,
  translate: Languages,
  speed: Zap,
  code: Code2,
  terminal: Terminal,
  text_fields: Type,
  functions: Cpu,
  error_outline: X,
  palette: Palette,
  type_specimen: Type,
  sync: RefreshCw,
  settings: Settings,
  find_replace: MessageSquare,
  schema: Layers,
  pipeline: GitBranch,
  calculate: Cpu,
  data_object: Database,
  swap_horiz: RefreshCw,
  architecture: Layers,
  content_paste: Copy,
  extension: Puzzle,
  default: Puzzle,
};

function getIcon(iconName: string) {
  return ICON_MAP[iconName] || ICON_MAP.default;
}

export interface Skill {
  id: string;
  title: string;
  description: string;
  icon: string;
  filename: string;
  installed: boolean;
  content?: string;
}

interface SkillsManagerProps {
  open: boolean;
  onClose: () => void;
  onSkillSelect: (skill: Skill) => void;
}

export function SkillsManager({ open, onClose, onSkillSelect }: SkillsManagerProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [newSkill, setNewSkill] = useState({ title: "", description: "", icon: "extension" });
  const [importing, setImporting] = useState(false);
  const [skillTab, setSkillTab] = useState<SkillTab>("mimo");

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<Skill[]>("scan_skills");
      setSkills(result);
    } catch (e) {
      console.error("Failed to load skills:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) loadSkills();
  }, [open, loadSkills]);

  const handleInstall = useCallback(async () => {
    if (!newSkill.title.trim()) return;
    setInstalling(newSkill.title);
    try {
      await invoke("install_skill", {
        title: newSkill.title,
        description: newSkill.description,
        icon: newSkill.icon,
      });
      await loadSkills();
      setShowInstallForm(false);
      setNewSkill({ title: "", description: "", icon: "extension" });
    } catch (e) {
      console.error("Install failed:", e);
    }
    setInstalling(null);
  }, [newSkill, loadSkills]);

  const handleUninstall = useCallback(
    async (filename: string) => {
      setInstalling(filename);
      try {
        await invoke("uninstall_skill", { filename });
        await loadSkills();
      } catch (e) {
        console.error("Uninstall failed:", e);
      }
      setInstalling(null);
    },
    [loadSkills]
  );

  const handleImportSkill = useCallback(async () => {
    setImporting(true);
    try {
      const result = await invoke<{ files: { filename: string; content: string }[] }>(
        "import_skill_files"
      );
      if (result.files && result.files.length > 0) {
        await loadSkills();
      }
    } catch (e) {
      console.error("Import failed:", e);
    }
    setImporting(false);
  }, [loadSkills]);

  if (!open) return null;

  const filtered = skills.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 flex w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-background shadow-elevated"
        style={{ maxHeight: "85vh" }}
      >
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-border bg-sidebar p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
                <Puzzle className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-[14px] font-semibold text-foreground">Skills</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-surface p-1 mb-4">
            <button
              onClick={() => setSkillTab("mimo")}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition",
                skillTab === "mimo"
                  ? "bg-surface-elevated text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Skills Mimo
            </button>
            <button
              onClick={() => setSkillTab("custom")}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition",
                skillTab === "custom"
                  ? "bg-surface-elevated text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Custom
            </button>
          </div>

          {skillTab === "custom" && (
            <>
              <div className="space-y-2 mb-4">
                <button
                  onClick={() => setShowInstallForm(!showInstallForm)}
                  className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-[13px] font-medium text-foreground transition hover:border-primary/40 hover:bg-surface-elevated"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  Tạo Skill mới
                </button>

                <button
                  onClick={handleImportSkill}
                  disabled={importing}
                  className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-[13px] font-medium text-foreground transition hover:border-primary/40 hover:bg-surface-elevated disabled:opacity-50"
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 text-emerald-400" />
                  )}
                  Import Skill (.md)
                </button>
              </div>

              {showInstallForm && (
                <div className="mb-4 rounded-xl border border-border bg-surface p-3 space-y-2">
                  <input
                    value={newSkill.title}
                    onChange={(e) => setNewSkill((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Tên skill..."
                    className="w-full rounded-lg bg-background px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground outline-none border border-border"
                  />
                  <input
                    value={newSkill.description}
                    onChange={(e) => setNewSkill((s) => ({ ...s, description: e.target.value }))}
                    placeholder="Mô tả ngắn..."
                    className="w-full rounded-lg bg-background px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground outline-none border border-border"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={newSkill.icon}
                      onChange={(e) => setNewSkill((s) => ({ ...s, icon: e.target.value }))}
                      placeholder="icon name"
                      className="flex-1 rounded-lg bg-background px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground outline-none border border-border"
                    />
                    <button
                      onClick={handleInstall}
                      disabled={!newSkill.title.trim() || !!installing}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-brand px-3 py-2 text-[12px] font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                    >
                      {installing === newSkill.title ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Tạo
                    </button>
                  </div>
                </div>
              )}

              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                Đã cài ({skills.length})
              </div>
              <div className="text-[11px] text-muted-foreground/60">Thư mục: /app/skills/</div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {skillTab === "mimo" ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-foreground">Skills Mimo</h2>
                  <p className="text-[12px] text-muted-foreground">
                    Template mặc định - click để sử dụng
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {MIMO_SKILLS.filter(
                  (s) =>
                    s.title.toLowerCase().includes(search.toLowerCase()) ||
                    s.desc.toLowerCase().includes(search.toLowerCase())
                ).map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      onSkillSelect({
                        id: skill.id,
                        title: skill.title,
                        description: skill.desc,
                        icon: "extension",
                        filename: "",
                        installed: true,
                        content: skill.prompt,
                      });
                      onClose();
                    }}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition hover:border-primary/40 hover:bg-surface-elevated"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition">
                      <skill.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-foreground">{skill.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{skill.desc}</div>
                      <div className="mt-2 text-[10px] text-primary/70 font-mono">/{skill.id}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-xl bg-surface px-4 py-2.5 border border-border">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm skill..."
                      className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                  <button
                    onClick={loadSkills}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-[12px] text-muted-foreground hover:bg-surface hover:text-foreground transition"
                  >
                    <Loader2 className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    Quét lại
                  </button>
                </div>
              </div>

              {loading && skills.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-[13px]">Đang quét skills...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-muted-foreground">
                  <Puzzle className="h-10 w-10 opacity-30 mb-3" />
                  <p className="text-[14px] font-medium">Không tìm thấy skill nào</p>
                  <p className="text-[12px] mt-1">Thêm skill mới hoặc import file .md</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      installing={installing === skill.filename}
                      onSelect={() => onSkillSelect(skill)}
                      onUninstall={() => handleUninstall(skill.filename)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  installing,
  onSelect,
  onUninstall,
}: {
  skill: Skill;
  installing: boolean;
  onSelect: () => void;
  onUninstall: () => void;
}) {
  const IconComp = getIcon(skill.icon);

  return (
    <div className="group rounded-xl border border-border bg-surface p-4 transition hover:border-primary/40 hover:bg-surface-elevated">
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <IconComp className="h-5 w-5 text-primary" />
        </div>
        <button
          onClick={onUninstall}
          disabled={installing}
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition hover:bg-red-400/10 hover:text-red-400"
          title="Xóa skill"
        >
          {installing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <h3 className="text-[13px] font-semibold text-foreground mb-1">{skill.title}</h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
        {skill.description}
      </p>
      <button
        onClick={onSelect}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[12px] font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
      >
        <ExternalLink className="h-3 w-3" />
        Sử dụng
      </button>
    </div>
  );
}
