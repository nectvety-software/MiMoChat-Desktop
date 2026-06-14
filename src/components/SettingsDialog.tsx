import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/shell";
import { cn } from "@/lib/utils";
import {
  X,
  Globe,
  ScrollText,
  Check,
  Trash2,
  ChevronRight,
  Cpu,
  BarChart3,
  RefreshCw,
  Loader2,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { useSettingsStore, LANGUAGES, type Language, type LogEntry } from "@/store/settingsStore";

type Tab = "language" | "logs" | "models" | "stats";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [tab, setTab] = useState<Tab>("language");
  const { language, logs, setLanguage, clearLogs } = useSettingsStore();

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: typeof Globe }[] = [
    { id: "language", label: "Ngôn ngữ trò chuyện", icon: Globe },
    { id: "models", label: "Mô hình AI", icon: Cpu },
    { id: "stats", label: "Thống kê", icon: BarChart3 },
    { id: "logs", label: "Nhật ký kết nối", icon: ScrollText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 flex w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-elevated"
        style={{ maxHeight: "80vh" }}
      >
        <div className="w-56 shrink-0 border-r border-border bg-sidebar p-3">
          <div className="mb-4 flex items-center justify-between px-2">
            <span className="text-[13px] font-semibold text-foreground">Cài đặt</span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="space-y-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition",
                  tab === t.id
                    ? "bg-surface-elevated text-foreground"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                )}
              >
                <t.icon className={cn("h-4 w-4", tab === t.id && "text-primary")} />
                {t.label}
              </button>
            ))}
          </nav>
          <div className="mt-6 border-t border-border pt-4 px-2">
            <div className="text-[11px] text-muted-foreground/60 leading-relaxed">
              <p>MimoChat v0.1.0</p>
              <p className="mt-1">100% powered by mimo.exe</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "language" && <LanguageTab language={language} onSelect={setLanguage} />}
          {tab === "models" && <ModelsTab />}
          {tab === "stats" && <StatsTab />}
          {tab === "logs" && <LogsTab logs={logs} onClear={clearLogs} />}
        </div>
      </div>
    </div>
  );
}

function LanguageTab({
  language,
  onSelect,
}: {
  language: Language;
  onSelect: (l: Language) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">Ngôn ngữ trò chuyện</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Chọn ngôn ngữ mà Mimo sẽ sử dụng để trả lời bạn.
      </p>
      <div className="mt-5 space-y-2">
        {Object.entries(LANGUAGES).map(([key, lang]) => (
          <button
            key={key}
            onClick={() => onSelect(key as Language)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
              language === key
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-surface hover:border-primary/30 hover:bg-surface-elevated"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{lang.flag}</span>
              <div>
                <div className="text-[13px] font-medium text-foreground">{lang.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 max-w-xs truncate">
                  {lang.systemPrompt}
                </div>
              </div>
            </div>
            {language === key && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Check className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModelsTab() {
  const [models, setModels] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const exists = await invoke<boolean>("check_mimo_exists");
      setConnected(exists);
      if (exists) {
        const result = await invoke<{ success: boolean; message: string }>("mimo_command", {
          args: ["--version"],
        });
        if (result.success) {
          setConnected(true);
        }
      }
    } catch {
      setConnected(false);
    }
    setChecking(false);
  };

  const loadModels = async () => {
    setLoading(true);
    try {
      const result = await invoke<{ success: boolean; message: string }>("mimo_command", {
        args: ["models"],
      });
      setModels(result.success ? result.message : "Không thể tải danh sách model");
    } catch (e) {
      setModels(`Lỗi: ${e}`);
    }
    setLoading(false);
  };

  const openBrainFolder = async () => {
    try {
      // Try to open the brain folder using Tauri's shell
      await invoke("mimo_command", { args: ["--version"] });
      // Get the path from the Rust backend
      const brainPath = await invoke<string>("get_brain_path");
      await open(brainPath);
    } catch {
      try {
        // Fallback: try common paths
        const paths = [
          "brain",
          ".",
          "C:\\Program Files\\MimoChat\\brain",
        ];
        for (const p of paths) {
          try {
            await open(p);
            return;
          } catch {
            continue;
          }
        }
      } catch {
        // Final fallback
        alert("Không thể mở thư mục. Vui lòng mở thủ công:\n\nbrain/");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Setup Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Cài đặt mimo.exe</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Kết nối mimo.exe làm bộ não AI cho MimoChat
        </p>

        {/* Connection Status */}
        <div className={cn(
          "mt-4 flex items-center gap-3 rounded-xl border p-4",
          connected === true && "border-emerald-400/30 bg-emerald-400/5",
          connected === false && "border-red-400/30 bg-red-400/5",
          connected === null && "border-border bg-surface"
        )}>
          {checking ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : connected === true ? (
            <Check className="h-5 w-5 text-emerald-400" />
          ) : connected === false ? (
            <AlertCircle className="h-5 w-5 text-red-400" />
          ) : (
            <Cpu className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="flex-1">
            <p className="text-[13px] font-medium text-foreground">
              {connected === true ? "Đã kết nối mimo.exe" : connected === false ? "Chưa tìm thấy mimo.exe" : "Chưa kiểm tra"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {connected === true ? "mimo.exe sẵn sàng sử dụng" : "Cần copy mimo.exe vào thư mục brain/"}
            </p>
          </div>
          <button
            onClick={checkConnection}
            disabled={checking}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition hover:bg-surface hover:text-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
            Kiểm tra
          </button>
        </div>

        {/* Setup Steps */}
        <div className="mt-4 space-y-3">
          <h3 className="text-[13px] font-medium text-foreground">Hướng dẫn cài đặt:</h3>

          {/* Directory Structure */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cấu trúc thư mục:</p>
            <div className="font-mono text-[12px] leading-relaxed">
              <div className="flex items-center gap-2">
                <span className="text-primary">📁</span>
                <span className="text-foreground font-medium">C:\Program Files\MimoChat\</span>
                <span className="text-[10px] text-muted-foreground">(thư mục cài đặt)</span>
              </div>
              <div className="flex items-center gap-2 ml-5">
                <span className="text-primary">├──</span>
                <span className="text-foreground">mimochat.exe</span>
                <span className="text-[10px] text-muted-foreground">(app chính)</span>
              </div>
              <div className="flex items-center gap-2 ml-5">
                <span className="text-primary">├──</span>
                <span className="text-foreground">📁 brain/</span>
              </div>
              <div className="flex items-center gap-2 ml-10">
                <span className={cn("text-emerald-400", connected !== true && "text-amber-400")}>│</span>
                <span className={cn(
                  "font-medium",
                  connected === true ? "text-emerald-400" : "text-amber-400"
                )}>
                  {connected === true ? "✓" : "○"} mimo.exe
                </span>
                {connected === true ? (
                  <span className="text-[10px] text-emerald-400">đã có</span>
                ) : (
                  <span className="text-[10px] text-amber-400">cần copy vào đây</span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-5">
                <span className="text-primary">├──</span>
                <span className="text-foreground">📁 resources/</span>
              </div>
              <div className="flex items-center gap-2 ml-5">
                <span className="text-primary">└──</span>
                <span className="text-foreground">📁 output/</span>
                <span className="text-[10px] text-muted-foreground">(logs, sessions)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3 rounded-lg bg-surface p-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                1
              </span>
              <div>
                <p className="text-[12px] font-medium text-foreground">Copy file mimo.exe</p>
                <p className="text-[11px] text-muted-foreground">
                  Copy file mimo.exe vào thư mục <code className="rounded bg-primary/10 px-1 text-primary">brain/</code> (cùng cấp với mimochat.exe)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-surface p-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                2
              </span>
              <div>
                <p className="text-[12px] font-medium text-foreground">Mở thư mục brain/</p>
                <p className="text-[11px] text-muted-foreground">
                  Click nút bên dưới để mở thư mục và paste mimo.exe vào
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-surface p-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                3
              </span>
              <div>
                <p className="text-[12px] font-medium text-foreground">Kiểm tra kết nối</p>
                <p className="text-[11px] text-muted-foreground">
                  Click "Kiểm tra" để xác nhận mimo.exe đã sẵn sàng
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openBrainFolder}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-[13px] font-medium text-foreground transition hover:border-primary/40 hover:bg-surface-elevated"
          >
            <FolderOpen className="h-4 w-4 text-primary" />
            Mở thư mục brain/
          </button>
        </div>
      </div>

      {/* Models List */}
      <div className="border-t border-border pt-6">
        <h3 className="text-[14px] font-semibold text-foreground">Danh sách Model</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Các model AI có sẵn trên mimo.exe</p>
        <div className="mt-3">
          <button
            onClick={loadModels}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Tải danh sách model
          </button>
        </div>
        {models && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <pre className="text-[12px] text-foreground whitespace-pre-wrap font-mono">{models}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const result = await invoke<{ success: boolean; message: string }>("mimo_command", {
        args: ["stats"],
      });
      setStats(result.success ? result.message : "Không thể tải thống kê");
    } catch (e) {
      setStats(`Lỗi: ${e}`);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">Thống kê sử dụng</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Token usage và chi phí từ mimo.exe</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Tải thống kê
        </button>
      </div>
      {stats && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <pre className="text-[12px] text-foreground whitespace-pre-wrap font-mono">{stats}</pre>
        </div>
      )}
    </div>
  );
}

function LogsTab({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  const typeColors: Record<string, string> = {
    info: "text-blue-400",
    success: "text-emerald-400",
    error: "text-red-400",
    warning: "text-amber-400",
  };
  const typeBg: Record<string, string> = {
    info: "bg-blue-400/10",
    success: "bg-emerald-400/10",
    error: "bg-red-400/10",
    warning: "bg-amber-400/10",
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Nhật ký kết nối</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Theo dõi hoạt động kết nối với mimo.exe
          </p>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" /> Xóa
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-surface max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ScrollText className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-[13px]">Chưa có nhật ký nào</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                    typeBg[log.type],
                    typeColors[log.type]
                  )}
                >
                  {log.type === "success" && <Check className="h-3 w-3" />}
                  {log.type === "error" && <X className="h-3 w-3" />}
                  {log.type === "info" && <span className="text-[8px]">i</span>}
                  {log.type === "warning" && <span className="text-[10px]">!</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[12px] font-medium", typeColors[log.type])}>
                      {log.message}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {log.timestamp.toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  {log.detail && (
                    <p className="mt-1 text-[11px] text-muted-foreground/70 whitespace-pre-wrap break-all">
                      {log.detail}
                    </p>
                  )}
                </div>
                <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/30" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
