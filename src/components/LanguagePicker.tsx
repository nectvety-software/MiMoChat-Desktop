import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSettingsStore, LANGUAGES, type Language } from "@/store/settingsStore";
import { Check, Search, X } from "lucide-react";

interface LanguagePickerProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}

export function LanguagePicker({ open, onClose, anchorRef }: LanguagePickerProps) {
  const [search, setSearch] = useState("");
  const { translateTarget, setTranslateTarget } = useSettingsStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const langs = Object.entries(LANGUAGES).filter(
    ([key, lang]) =>
      lang.label.toLowerCase().includes(search.toLowerCase()) || key.includes(search.toLowerCase())
  );

  const grouped: Record<string, [string, { label: string; flag: string; systemPrompt: string }][]> =
    {};
  for (const [key, lang] of langs) {
    const first = lang.label[0].toUpperCase();
    if (!grouped[first]) grouped[first] = [];
    grouped[first].push([key, lang]);
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-0 z-50 mb-2 w-[420px] max-h-[500px] overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[13px] font-semibold text-foreground">Chọn ngôn ngữ dịch đến</span>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm ngôn ngữ..."
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Language Grid */}
      <div className="max-h-[400px] overflow-y-auto p-3">
        {search ? (
          <div className="grid grid-cols-3 gap-1.5">
            {langs.map(([key, lang]) => (
              <LanguageItem
                key={key}
                code={key}
                lang={lang}
                selected={translateTarget === key}
                onClick={() => {
                  setTranslateTarget(key as Language);
                  onClose();
                }}
              />
            ))}
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([letter, items]) => (
              <div key={letter} className="mb-3">
                <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  {letter}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {items.map(([key, lang]) => (
                    <LanguageItem
                      key={key}
                      code={key}
                      lang={lang}
                      selected={translateTarget === key}
                      onClick={() => {
                        setTranslateTarget(key as Language);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="text-xl">
            {LANGUAGES[translateTarget as keyof typeof LANGUAGES].flag}
          </span>
          <span>
            Đang chọn:{" "}
            <strong className="text-foreground">
              {LANGUAGES[translateTarget as keyof typeof LANGUAGES].label}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}

function LanguageItem({
  code: _code,
  lang,
  selected,
  onClick,
}: {
  code: string;
  lang: { label: string; flag: string };
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] transition",
        selected
          ? "bg-primary/10 text-primary border border-primary/30"
          : "text-foreground hover:bg-surface-elevated border border-transparent"
      )}
    >
      <span className="text-base">{lang.flag}</span>
      <span className="min-w-0 flex-1 truncate">{lang.label}</span>
      {selected && <Check className="h-3 w-3 shrink-0 text-primary" />}
    </button>
  );
}
