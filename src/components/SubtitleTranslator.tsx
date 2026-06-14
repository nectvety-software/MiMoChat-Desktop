import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { cn } from "@/lib/utils";
import { useSettingsStore, LANGUAGES } from "@/store/settingsStore";
import {
  Subtitles,
  Upload,
  Languages,
  Download,
  X,
  Check,
  Loader2,
  FileText,
  Minimize2,
  Maximize2,
  GripVertical,
} from "lucide-react";
import {
  parseSRT,
  parseVTT,
  parseASS,
  entriesToSRT,
  entriesToVTT,
  detectFormat,
  buildTranslationPrompt,
  type SubtitleEntry,
} from "@/lib/subtitle";

type Step = "upload" | "preview" | "translating" | "done";
type Position = { x: number; y: number };

interface SubtitleTranslatorProps {
  open: boolean;
  onClose: () => void;
  onSendToChat: (message: string) => void;
}

export function SubtitleTranslator({ open, onClose, onSendToChat }: SubtitleTranslatorProps) {
  const [step, setStep] = useState<Step>("upload");
  const [filename, setFilename] = useState("");
  const [format, setFormat] = useState<"srt" | "vtt" | "ass" | null>(null);
  const [entries, setEntries] = useState<SubtitleEntry[]>([]);
  const [translatedEntries, setTranslatedEntries] = useState<SubtitleEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - 400,
    y: window.innerHeight - 200,
  });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const { translateTarget, addLog } = useSettingsStore();

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    const handleUp = () => setDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, dragOffset]);

  const handleDragStart = (e: React.MouseEvent) => {
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDragging(true);
    }
  };

  const handleFileUpload = useCallback(async () => {
    try {
      const result = await invoke<{ path: string; content: string; filename: string }>(
        "read_subtitle_file"
      );
      if (!result) return;

      const fmt = detectFormat(result.filename);
      if (!fmt) {
        setError("Định dạng file không hỗ trợ. Chỉ hỗ trợ .srt, .vtt, .ass");
        return;
      }

      let parsed: SubtitleEntry[];
      switch (fmt) {
        case "srt":
          parsed = parseSRT(result.content);
          break;
        case "vtt":
          parsed = parseVTT(result.content);
          break;
        case "ass":
          parsed = parseASS(result.content);
          break;
        default:
          return;
      }

      if (parsed.length === 0) {
        setError("Không tìm thấy phụ đề nào trong file.");
        return;
      }

      setFilename(result.filename);
      setFormat(fmt);
      setEntries(parsed);
      setStep("preview");
      setError("");
      addLog("success", `Đã tải file phụ đề: ${result.filename}`, `${parsed.length} dòng phụ đề`);
    } catch (e) {
      setError(`Lỗi đọc file: ${e}`);
      addLog("error", "Lỗi đọc file phụ đề", String(e));
    }
  }, [addLog]);

  const handleTranslate = useCallback(async () => {
    setStep("translating");
    setProgress(0);
    setMinimized(false);
    const targetLang = LANGUAGES[translateTarget];

    // Use smaller batch size for faster feedback
    const BATCH_SIZE = 10;
    const batches: SubtitleEntry[][] = [];
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      batches.push(entries.slice(i, i + BATCH_SIZE));
    }

    const allTranslated: SubtitleEntry[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        const prompt = buildTranslationPrompt(
          batch,
          translateTarget,
          `${targetLang.label} (${targetLang.flag})`
        );

        const response = await invoke<{ success: boolean; message: string; error: string | null }>(
          "send_message",
          {
            message: prompt,
            systemPrompt:
              "Bạn là dịch giả phụ đề chuyên nghiệp. Dịch chính xác, giữ nguyên ngữ cảnh và cảm xúc. Chỉ trả về kết quả dịch, không thêm giải thích.",
          }
        );

        if (response.success) {
          const translated = parseTranslatedEntries(response.message, batch);
          allTranslated.push(...translated);
        } else {
          allTranslated.push(...batch);
        }

        setProgress(Math.round(((i + 1) / batches.length) * 100));
      }

      setTranslatedEntries(allTranslated);
      setStep("done");
    } catch (e) {
      setError(`Lỗi dịch: ${e}`);
      setStep("preview");
    }
  }, [entries, translateTarget]);

  const handleExport = useCallback(
    async (exportFormat: "srt" | "vtt") => {
      try {
        const content =
          exportFormat === "srt"
            ? entriesToSRT(translatedEntries)
            : entriesToVTT(translatedEntries);
        const outFilename = filename.replace(/\.[^.]+$/, `_vi.${exportFormat}`);
        await invoke("write_subtitle_file", { content, filename: outFilename });
        addLog(
          "success",
          `Đã xuất file: ${outFilename}`,
          `${translatedEntries.length} dòng phụ đề`
        );
        onSendToChat(`Đã dịch và xuất file phụ đề thành công: ${outFilename}`);
      } catch (e) {
        setError(`Lỗi xuất file: ${e}`);
        addLog("error", "Lỗi xuất file phụ đề", String(e));
      }
    },
    [translatedEntries, filename, addLog, onSendToChat]
  );

  const reset = () => {
    setStep("upload");
    setFilename("");
    setFormat(null);
    setEntries([]);
    setTranslatedEntries([]);
    setProgress(0);
    setError("");
  };

  if (!open) return null;

  // Minimized floating widget
  if (minimized) {
    return (
      <div
        ref={dragRef}
        className={cn(
          "fixed z-50 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-elevated",
          dragging ? "cursor-grabbing" : ""
        )}
        style={{ left: position.x, top: position.y }}
      >
        <div
          className="flex cursor-grab items-center justify-between bg-surface-elevated px-3 py-2"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
            <Subtitles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[12px] font-medium text-foreground">Dịch phụ đề</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(false)}
              className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="px-3 py-2">
          {step === "translating" && (
            <>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                <span className="truncate max-w-[150px]">{filename}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-gradient-brand transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                {Math.round((progress / 100) * entries.length)}/{entries.length} dòng
              </p>
            </>
          )}
          {step === "done" && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <Check className="h-3 w-3" />
              <span>Dịch xong {translatedEntries.length} dòng</span>
            </div>
          )}
          {(step === "upload" || step === "preview") && (
            <p className="text-[11px] text-muted-foreground">Sẵn sàng dịch...</p>
          )}
        </div>
      </div>
    );
  }

  // Full dialog
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-elevated">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
              <Subtitles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Dịch phụ đề</h2>
              <p className="text-[12px] text-muted-foreground">
                Nhập file .srt, .vtt, .ass → Dịch theo timecode → Xuất file
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {step === "translating" && (
              <button
                onClick={() => setMinimized(true)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-surface hover:text-foreground"
                title="Ẩn xuống"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="rounded-lg p-2 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === "upload" && (
            <div className="flex flex-col items-center py-10">
              <button
                onClick={handleFileUpload}
                className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border px-12 py-12 transition hover:border-primary/50 hover:bg-surface"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface transition group-hover:bg-surface-elevated">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-medium text-foreground">Chọn file phụ đề</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Hỗ trợ .srt, .vtt, .ass</p>
                </div>
              </button>
              {error && <p className="mt-4 text-[13px] text-red-400">{error}</p>}
            </div>
          )}

          {step === "preview" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">{filename}</span>
                  <span className="text-muted-foreground">
                    · {entries.length} dòng · {format?.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleTranslate}
                  className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
                >
                  <Languages className="h-4 w-4" />
                  Dịch sang {LANGUAGES[translateTarget].flag} {LANGUAGES[translateTarget].label}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-surface">
                {entries.slice(0, 20).map((e) => (
                  <div key={e.index} className="border-b border-border px-4 py-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="min-w-[30px] text-[11px] font-medium text-primary">
                        #{e.index}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {e.startTime} → {e.endTime}
                      </span>
                    </div>
                    <p className="mt-1 ml-[42px] text-[13px] text-foreground">{e.text}</p>
                  </div>
                ))}
                {entries.length > 20 && (
                  <div className="px-4 py-2 text-center text-[12px] text-muted-foreground">
                    ... và {entries.length - 20} dòng nữa
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "translating" && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-[14px] font-medium text-foreground">Đang dịch phụ đề...</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Dòng {Math.round((progress / 100) * entries.length) + 1} / {entries.length} đang được dịch
              </p>
              <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-gradient-brand transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground font-mono">
                {progress}% • Còn lại ~{Math.ceil(((100 - progress) / 100) * entries.length / 10)} batch
              </p>

              {/* Show current translating items */}
              <div className="mt-4 w-full max-w-md rounded-lg border border-border bg-surface p-3">
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Đang xử lý:</p>
                {entries
                  .slice(
                    Math.floor((progress / 100) * entries.length),
                    Math.floor((progress / 100) * entries.length) + 3
                  )
                  .map((e) => (
                    <div key={e.index} className="flex items-center gap-2 text-[11px] py-0.5">
                      <span className="text-primary font-mono">#{e.index}</span>
                      <span className="text-muted-foreground font-mono">{e.startTime} → {e.endTime}</span>
                      <span className="text-foreground truncate flex-1">{e.text.slice(0, 30)}...</span>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => setMinimized(true)}
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition hover:bg-surface hover:text-foreground"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Ẩn và làm việc khác
              </button>
            </div>
          )}

          {step === "done" && (
            <div>
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-3">
                <Check className="h-5 w-5 text-emerald-400" />
                <span className="text-[13px] font-medium text-emerald-400">
                  Dịch thành công {translatedEntries.length} dòng phụ đề sang{" "}
                  {LANGUAGES[translateTarget].label}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-surface">
                {translatedEntries.slice(0, 20).map((e) => (
                  <div key={e.index} className="border-b border-border px-4 py-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="min-w-[30px] text-[11px] font-medium text-primary">
                        #{e.index}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {e.startTime} → {e.endTime}
                      </span>
                    </div>
                    <p className="mt-1 ml-[42px] text-[13px] text-muted-foreground line-through">
                      {e.originalText}
                    </p>
                    <p className="mt-0.5 ml-[42px] text-[13px] text-foreground font-medium">
                      {e.text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => handleExport("srt")}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-surface"
                >
                  <Download className="h-4 w-4" /> Xuất .srt
                </button>
                <button
                  onClick={() => handleExport("vtt")}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-surface"
                >
                  <Download className="h-4 w-4" /> Xuất .vtt
                </button>
                <button
                  onClick={reset}
                  className="ml-auto text-[12px] text-muted-foreground hover:text-foreground transition"
                >
                  Dịch file mới
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function parseTranslatedEntries(translated: string, original: SubtitleEntry[]): SubtitleEntry[] {
  const lines = translated.split("\n");
  const result: SubtitleEntry[] = [];
  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.*)/);
    if (match) {
      const index = parseInt(match[1]);
      const orig = original.find((e) => e.index === index);
      if (orig) {
        result.push({ ...orig, text: match[2].trim(), originalText: orig.text });
      }
    }
  }
  if (result.length === 0) {
    return original.map((e) => ({ ...e, text: `[Dịch] ${e.text}` }));
  }
  return result;
}
