import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { cn } from "@/lib/utils";
import { useSettingsStore, LANGUAGES } from "@/store/settingsStore";
import { SettingsDialog } from "./SettingsDialog";
import { LanguagePicker } from "./LanguagePicker";
import { SubtitleTranslator } from "./SubtitleTranslator";
import { SkillsManager, type Skill } from "./SkillsManager";
import { SlashCommandMenu } from "./SlashCommandMenu";
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Bot,
  Sparkles,
  Settings,
  Mail,
  FileText,
  Code2,
  Languages,
  GraduationCap,
  Paperclip,
  Globe,
  ArrowUp,
  Square,
  User,
  Copy,
  Check,
  Trash2,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Subtitles,
  ChevronDown,
  File,
  Loader2,
  FolderOpen,
  X,
  Bug,
  Play,
  FileCode,
  Puzzle,
  Download,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[];
};

type Thread = { id: string; title: string; messages: Message[]; pinned: boolean };

type ImportedFile = {
  filename: string;
  content: string;
  size: number;
  type?: "text" | "image";
  mime?: string;
  path?: string;
};

type ProjectInfo = { path: string; name: string; features: string[]; active: boolean } | null;

const SUGGESTIONS = [
  {
    icon: Mail,
    label: "Viết email chuyên nghiệp",
    prompt: "Hãy giúp tôi viết một email chuyên nghiệp...",
  },
  { icon: FileText, label: "Tóm tắt văn bản", prompt: "Tóm tắt đoạn văn bản sau cho tôi:" },
  { icon: Code2, label: "Giải thích code", prompt: "Giải thích đoạn code sau cho tôi:" },
  { icon: Languages, label: "Dịch sang tiếng Anh", prompt: "Dịch sang tiếng Anh:" },
  {
    icon: GraduationCap,
    label: "Lên kế hoạch học tập",
    prompt: "Giúp tôi lên kế hoạch học tập về:",
  },
];

export function ChatApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("new");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [translatePickerOpen, setTranslatePickerOpen] = useState(false);
  const [subtitleOpen, setSubtitleOpen] = useState(false);
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [project, setProject] = useState<ProjectInfo>(null);
  const [openingProject, setOpeningProject] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [activeNav, setActiveNav] = useState<"bot" | "skills">("bot");
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [mimoLogs, setMimoLogs] = useState<{ type: string; message: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const translateBtnRef = useRef<HTMLDivElement>(null);

  const { language, translateTarget, addLog } = useSettingsStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Tool definitions with their skill IDs and contexts
  const TOOL_DEFS: Record<string, { skill: string; label: string; getCtx: () => string }> = {
    project: {
      skill: "project",
      label: "Dự án",
      getCtx: () =>
        project
          ? `[PROJECT]\n${project.name}\n${project.path}\n${project.features.join(", ")}`
          : "",
    },
    file: {
      skill: "file",
      label: "Nhập tệp",
      getCtx: () => {
        if (importedFiles.length === 0) return "";
        const subtitleExts = ["srt", "vtt", "ass", "ssa"];
        const codeExts = [
          "js",
          "ts",
          "tsx",
          "jsx",
          "py",
          "rs",
          "go",
          "java",
          "c",
          "cpp",
          "h",
          "css",
          "html",
        ];
        const subtitles = importedFiles.filter((f) =>
          subtitleExts.includes(f.filename.split(".").pop()?.toLowerCase() || "")
        );
        const code = importedFiles.filter((f) =>
          codeExts.includes(f.filename.split(".").pop()?.toLowerCase() || "")
        );
        const texts = importedFiles.filter((f) => !subtitles.includes(f) && !code.includes(f));
        let ctx = "[FILES]\n";
        if (subtitles.length)
          ctx += subtitles
            .map((f) => `[SUBTITLE:${f.filename}]\n${f.content.slice(0, 3000)}`)
            .join("\n");
        if (code.length)
          ctx += code.map((f) => `[CODE:${f.filename}]\n${f.content.slice(0, 3000)}`).join("\n");
        if (texts.length)
          ctx += texts.map((f) => `[TEXT:${f.filename}]\n${f.content.slice(0, 3000)}`).join("\n");
        return ctx;
      },
    },
    code: {
      skill: "code_review",
      label: "Code",
      getCtx: () => `[TASK: Viết và review code]`,
    },
    debug: {
      skill: "bug_hunter",
      label: "Debug",
      getCtx: () => `[TASK: Tìm và sửa lỗi]`,
    },
    explain: {
      skill: "explain",
      label: "Giải thích",
      getCtx: () => `[TASK: Giải thích code]`,
    },
    translate: {
      skill: "translate",
      label: "Dịch",
      getCtx: () => {
        const lang = LANGUAGES[translateTarget];
        return `[TRANSLATE]\nTarget: ${translateTarget}\nLanguage: ${lang.label}\nFlag: ${lang.flag}`;
      },
    },
    subtitle: {
      skill: "translate",
      label: "Phụ đề",
      getCtx: () => {
        const lang = LANGUAGES[translateTarget];
        return `[SUBTITLE TRANSLATE]\nTarget: ${translateTarget}\nLanguage: ${lang.label}`;
      },
    },
  };

  // Tool definitions with their skill IDs and prompts
  const TOOL_SKILLS: Record<string, { skill: string; label: string; prompt: string }> = {
    project: { skill: "project", label: "Dự án", prompt: "/project " },
    file: { skill: "file", label: "Nhập tệp", prompt: "/file " },
    code: { skill: "code_review", label: "Code", prompt: "/code_review " },
    debug: { skill: "bug_hunter", label: "Debug", prompt: "/bug_hunter " },
    explain: { skill: "explain", label: "Giải thích", prompt: "/explain " },
    translate: { skill: "translate", label: "Dịch", prompt: "/translate " },
    subtitle: { skill: "translate", label: "Phụ đề", prompt: "/subtitle " },
  };

  const toggleTool = (toolId: string) => {
    setActiveTools((prev) => {
      const newTools = prev.includes(toolId) ? prev.filter((t) => t !== toolId) : [...prev, toolId];

      // Build input text from active tools
      const toolPrompts = newTools
        .map((t) => TOOL_SKILLS[t]?.prompt || "")
        .filter(Boolean)
        .join("");

      if (toolPrompts) {
        // Keep user text after tool prompts
        const currentText = input.replace(/^\/[a-z_]+\s*/g, "").trim();
        setInput(toolPrompts + currentText);
      } else {
        // No tools - keep just user text
        const currentText = input.replace(/^\/[a-z_]+\s*/g, "").trim();
        setInput(currentText);
      }

      return newTools;
    });
  };

  const clearTools = () => {
    setActiveTools([]);
    // Keep only user text
    const currentText = input.replace(/^\/[a-z_]+\s*/g, "").trim();
    setInput(currentText);
  };

  // Fetch logs while mimo is working
  useEffect(() => {
    if (!isTyping) {
      setMimoLogs([]);
      return;
    }

    const fetchLogs = async () => {
      try {
        const logs = await invoke<{ id: string; timestamp: string; log_type: string; message: string; detail?: string }[]>("get_logs");
        const recentLogs = logs.slice(0, 15).map(l => ({
          type: l.log_type,
          message: l.message,
        }));
        setMimoLogs(recentLogs);
      } catch {
        // Ignore fetch errors while mimo is working
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, [isTyping]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 192) + "px";
    }
  }, [input]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [openMenuId]);

  // Load sessions on mount
  useEffect(() => {
    const init = async () => {
      try {
        const exists = await invoke<boolean>("check_mimo_exists");
        if (exists) {
          addLog("success", "Kết nối mimo.exe thành công");
        } else {
          addLog("error", "Không tìm thấy mimo.exe");
        }
      } catch (e) {
        addLog("error", "Lỗi kiểm tra mimo.exe", String(e));
      }

      // Load all sessions
      try {
        const data = await invoke<{
          threads: {
            id: string;
            title: string;
            messages: { id: string; role: string; content: string; timestamp: string; images?: string[] }[];
          }[];
          active_id?: string;
        }>("load_all_sessions");

        if (data && data.threads && data.threads.length > 0) {
          const loaded: Thread[] = data.threads.map((s) => ({
            id: s.id,
            title: s.title,
            messages: s.messages.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: new Date(m.timestamp),
              images: m.images,
            })),
            pinned: false,
          }));
          setThreads(loaded);

          // Restore last active session
          if (data.active_id) {
            const activeThread = loaded.find((t) => t.id === data.active_id);
            if (activeThread) {
              setActiveId(data.active_id);
              setMessages(activeThread.messages);
            }
          }

          addLog("success", `Đã tải ${loaded.length} cuộc trò chuyện đã lưu`);
        }
      } catch (e) {
        addLog("error", "Lỗi tải sessions", String(e));
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save session when messages change
  useEffect(() => {
    if (threads.length === 0) return;
    const timer = setTimeout(() => {
      const sessionThreads = threads.map((t) => ({
        id: t.id,
        title: t.title,
        messages: t.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
          images: m.images,
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Also save current messages to active thread
      if (activeId !== "new" && messages.length > 0) {
        const activeThread = sessionThreads.find((t) => t.id === activeId);
        if (activeThread) {
          activeThread.messages = messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
            images: m.images,
          }));
        }
      }

      invoke("save_all_sessions", {
        threads: sessionThreads,
        activeId: activeId !== "new" ? activeId : null,
      }).catch((e) => addLog("error", "Lỗi auto-save", String(e)));
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeId, threads]);

  const handleSend = useCallback(
    async (text?: string, toolPrefix?: string) => {
      const displayText = text ?? input;
      const content = (toolPrefix ? toolPrefix + displayText : displayText).trim();
      if (!content || isTyping) return;
      setInput("");

      // Detect skill invocation from text: /skill_id ...
      let detectedSkill = "";
      const skillMatch = content.match(/^\/([a-z_]+)\s*(.*)/);
      if (skillMatch) {
        detectedSkill = skillMatch[1];
      }

      // Collect all skill IDs: from text + from active tools
      const allSkills = new Set<string>();
      if (detectedSkill) allSkills.add(detectedSkill);
      activeTools.forEach((t) => {
        const def = TOOL_DEFS[t];
        if (def) allSkills.add(def.skill);
      });

      // Load skill prompts from backend
      const skillPrompts: string[] = [];
      try {
        const skills = await invoke<{ id: string; content?: string }[]>("scan_skills");
        for (const skillId of allSkills) {
          const skill = skills.find((s) => s.id === skillId);
          if (skill?.content) {
            skillPrompts.push(`[SKILL: ${skillId}]\n${skill.content}`);
          }
        }
      } catch {
        // Skills not found, continue without skill prompts
      }

      // Build combined context from all active tools
      const contextParts: string[] = [];
      activeTools.forEach((toolId) => {
        const def = TOOL_DEFS[toolId];
        if (def) {
          const ctx = def.getCtx();
          if (ctx) contextParts.push(ctx);
        }
      });

      // Add skill prompts
      if (skillPrompts.length > 0) {
        contextParts.push(`[SKILLS]\n${skillPrompts.join("\n\n")}`);
      }

      // Add output path for file operations
      const isFileOperation =
        activeTools.includes("translate") ||
        activeTools.includes("subtitle") ||
        content.includes("/translate") ||
        content.includes("/subtitle");
      if (isFileOperation) {
        contextParts.push(
          `[OUTPUT]\nSave translated files to: /output/\nFormat: Keep original filename + language code suffix\nExample: movie_vi.srt, movie_ja.vtt`
        );
      }

      // Add image context
      const images = importedFiles.filter((f) => f.type === "image");
      if (images.length > 0) {
        const imageContext = images
          .map(
            (img) =>
              `[IMAGE: ${img.filename}]\nData: ${img.content.slice(0, 500)}...`
          )
          .join("\n");
        contextParts.push(
          `[IMAGES - Please analyze these images]\n${imageContext}\n\nThe user wants you to analyze the image content and help them with their request.`
        );
      }

      // Add language context
      if (
        activeTools.includes("translate") ||
        activeTools.includes("subtitle") ||
        content.includes("/translate") ||
        content.includes("/subtitle")
      ) {
        const targetLang = LANGUAGES[translateTarget];
        contextParts.push(
          `[TARGET LANGUAGE]\nCode: ${translateTarget}\nName: ${targetLang.label}\nFlag: ${targetLang.flag}`
        );
      }

      // Build the task instruction based on active tools
      const taskParts: string[] = [];
      if (activeTools.includes("subtitle") && activeTools.includes("translate")) {
        taskParts.push("Dịch file phụ đề đã nhập sang ngôn ngữ mục tiêu và lưu vào /output/");
      } else if (activeTools.includes("subtitle")) {
        taskParts.push("Dịch file phụ đề đã nhập và lưu vào /output/");
      } else if (activeTools.includes("translate")) {
        if (importedFiles.length > 0) {
          taskParts.push("Dịch nội dung file đã nhập sang ngôn ngữ mục tiêu và lưu vào /output/");
        } else {
          taskParts.push("Dịch nội dung sang ngôn ngữ mục tiêu");
        }
      } else if (activeTools.includes("code")) {
        taskParts.push(project ? `Viết code cho dự án ${project.name}` : "Viết code");
      } else if (activeTools.includes("debug")) {
        taskParts.push(project ? `Tìm và sửa lỗi trong dự án ${project.name}` : "Tìm và sửa lỗi");
      } else if (activeTools.includes("explain")) {
        taskParts.push(project ? `Giải thích code dự án ${project.name}` : "Giải thích code");
      }

      // Combine message: task + user input
      const finalMessage = taskParts.length > 0 ? `${taskParts.join(". ")}: ${content}` : content;

      // Collect image URLs for display
      const imageUrls = importedFiles
        .filter((f) => f.type === "image")
        .map((f) => f.content);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayText,
        timestamp: new Date(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
      };

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);

      if (activeId === "new" && messages.length === 0) {
        const id = crypto.randomUUID();
        let title = displayText.slice(0, 40);
        if (displayText.startsWith("/")) {
          const parts = displayText.split(" ");
          title = parts[0];
        } else if (displayText.match(/^\d+ file$/)) {
          title = `Nhập ${displayText}`;
        }
        setThreads((t) => [{ id, title, messages: [], pinned: false }, ...t]);
        setActiveId(id);
      }

      setIsTyping(true);

      try {
        // Build final message with context for mimo.exe
        // mimo.exe handles everything internally, just pass the user's request
        const response = await invoke<{ success: boolean; message: string; error: string | null }>(
          "send_message",
          { message: finalMessage, systemPrompt: null }
        );

        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.success
            ? response.message
            : `Lỗi: ${response.error || "Không thể kết nối với Mimo AI"}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMsg]);

        // Clear tools and files after successful send
        setActiveTools([]);
        setImportedFiles([]);
      } catch (error) {
        addLog("error", "Lỗi gửi tin nhắn", String(error));
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Lỗi kết nối: ${error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      input,
      isTyping,
      messages,
      activeId,
      language,
      addLog,
      project,
      importedFiles,
      translateTarget,
      activeTools,
    ]
  );

  const handleFileImport = useCallback(async () => {
    setImporting(true);
    try {
      const result = await invoke<{ files: ImportedFile[]; count: number }>("read_any_file");
      if (result.files.length > 0) {
        setImportedFiles(result.files);
        const fileNames = result.files.map((f: ImportedFile) => f.filename).join(", ");
        const imageCount = result.files.filter((f) => f.type === "image").length;
        const textCount = result.files.filter((f) => f.type !== "image").length;

        // Auto-toggle file tool and update input
        if (!activeTools.includes("file")) {
          const newTools = [...activeTools, "file"];
          setActiveTools(newTools);
          const toolPrompts = newTools
            .map((t) => TOOL_SKILLS[t]?.prompt || "")
            .filter(Boolean)
            .join("");
          setInput(toolPrompts + input.replace(/^\/[a-z_]+\s*/g, "").trim());
        }

        // Set appropriate prompt based on file types
        if (imageCount > 0) {
          setInput((prev) => {
            const base = prev.replace(/^\/[a-z_]+\s*/g, "").trim();
            return `/file Phân tích hình ảnh: ${base}`;
          });
          addLog(
            "success",
            `Đã nhập ${result.count} file (${imageCount} ảnh, ${textCount} text)`,
            fileNames
          );
        } else {
          addLog("success", `Đã nhập ${result.count} file`, fileNames);
        }
      }
    } catch (e) {
      addLog("error", "Lỗi nhập file", String(e));
    } finally {
      setImporting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, activeTools, input]);

  const handleOpenProject = useCallback(async () => {
    setOpeningProject(true);
    try {
      const info = await invoke<{ path: string; name: string; features: string[] }>(
        "select_project_folder"
      );
      setProject({ ...info, active: true });

      // Auto-toggle project tool and update input
      if (!activeTools.includes("project")) {
        const newTools = [...activeTools, "project"];
        setActiveTools(newTools);
        const toolPrompts = newTools
          .map((t) => TOOL_SKILLS[t]?.prompt || "")
          .filter(Boolean)
          .join("");
        setInput(toolPrompts + input.replace(/^\/[a-z_]+\s*/g, "").trim());
      }

      addLog(
        "success",
        `Đã mở dự án: ${info.name}`,
        `Path: ${info.path}\nStack: ${info.features.join(", ")}`
      );
    } catch (e) {
      addLog("error", "Lỗi mở dự án", String(e));
    } finally {
      setOpeningProject(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, activeTools, input]);

  const handleCloseProject = useCallback(async () => {
    try {
      await invoke("close_project");
      setProject(null);
      addLog("info", "Đã đóng dự án");
    } catch (e) {
      addLog("error", "Lỗi đóng dự án", String(e));
    }
  }, [addLog]);

  const handleSkillSelect = useCallback((skill: Skill) => {
    setSkillsOpen(false);
    setInput(`/${skill.id} `);
    textareaRef.current?.focus();
  }, []);

  const handleSlashSelect = useCallback((skill: Skill) => {
    setSlashOpen(false);
    setSlashQuery("");
    setInput(`/${skill.id} `);
    textareaRef.current?.focus();
  }, []);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value === "/") {
      setSlashOpen(true);
      setSlashQuery("");
    } else if (value.startsWith("/")) {
      setSlashOpen(true);
      setSlashQuery(value.slice(1));
    } else {
      setSlashOpen(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setActiveId("new");
    setInput("");
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadResult = (message: Message) => {
    // Extract content between markers or use full content
    const content = message.content;
    // Try to find translated content
    const lines = content.split("\n");
    const translatedLines = lines.filter((l) => l.match(/^\[\d+\]/) || !l.startsWith("["));
    const result = translatedLines.join("\n") || content;

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `mimochat_output_${timestamp}.txt`;
    downloadFile(result, filename);
  };

  const clearHistory = () => {
    setThreads([]);
    newChat();
  };

  const deleteThread = (id: string) => {
    setThreads((t) => t.filter((th) => th.id !== id));
    if (activeId === id) newChat();
    setOpenMenuId(null);
    invoke("delete_session", { id }).catch(() => {});
  };

  const togglePin = (id: string) => {
    setThreads((t) => t.map((th) => (th.id === id ? { ...th, pinned: !th.pinned } : th)));
    setOpenMenuId(null);
  };

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
    setOpenMenuId(null);
  };

  const confirmRename = (id: string) => {
    if (renameValue.trim()) {
      setThreads((t) => t.map((th) => (th.id === id ? { ...th, title: renameValue.trim() } : th)));
    }
    setRenamingId(null);
  };

  const sortedThreads = [...threads].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const isEmpty = messages.length === 0;
  const currentLang = LANGUAGES[language];
  const targetLang = LANGUAGES[translateTarget];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          sidebarOpen ? "w-72" : "w-0"
        )}
      >
        <div
          className={cn(
            "flex h-full flex-col overflow-hidden",
            !sidebarOpen && "pointer-events-none opacity-0"
          )}
        >
          <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
            <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[15px] font-semibold tracking-tight">Mimo</span>
              <span className="text-[11px] text-muted-foreground">Desktop Studio</span>
            </div>
          </div>

          <div className="px-3">
            <button
              onClick={newChat}
              className="group flex w-full items-center justify-between rounded-xl border border-border/80 bg-surface px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-surface-elevated"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium">
                <Plus className="h-4 w-4 text-primary" />
                Cuộc trò chuyện mới
              </span>
              <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                Ctrl N
              </kbd>
            </button>
          </div>

          <nav className="mt-5 space-y-0.5 px-3">
            <NavItem
              icon={Bot}
              label="Bot"
              active={activeNav === "bot"}
              onClick={() => setActiveNav("bot")}
            />
            <NavItem
              icon={Puzzle}
              label="Skills"
              active={activeNav === "skills"}
              onClick={() => {
                setActiveNav("skills");
                setSkillsOpen(true);
              }}
            />
          </nav>

          {activeNav === "bot" && (
            <>
              <div className="mt-6 flex items-center gap-2 px-5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <History className="h-3 w-3" />
                Nhật ký trò chuyện
              </div>
              <div className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
                {sortedThreads.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-[12px] text-muted-foreground">
                    Chưa có cuộc trò chuyện nào
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {sortedThreads.map((t) => (
                      <li key={t.id} className="group relative">
                        {renamingId === t.id ? (
                          <div className="flex items-center gap-1 rounded-lg bg-surface-elevated px-2 py-1">
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") confirmRename(t.id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              onBlur={() => confirmRename(t.id)}
                              className="flex-1 bg-transparent text-[13px] text-foreground outline-none"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <button
                              onClick={() => {
                                setActiveId(t.id);
                                setMessages(t.messages);
                              }}
                              className={cn(
                                "min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-[13px] transition",
                                activeId === t.id
                                  ? "bg-surface-elevated text-foreground"
                                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
                              )}
                            >
                              {t.pinned && (
                                <Pin className="inline h-3 w-3 mr-1.5 text-primary/60 -mt-0.5" />
                              )}
                              {t.title}
                            </button>
                            <div
                              ref={openMenuId === t.id ? menuRef : undefined}
                              className="relative"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === t.id ? null : t.id);
                                }}
                                className="ml-0.5 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface hover:text-foreground"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                              {openMenuId === t.id && (
                                <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-elevated">
                                  <button
                                    onClick={() => startRename(t.id, t.title)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-foreground transition hover:bg-surface-elevated"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Đổi tên
                                  </button>
                                  <button
                                    onClick={() => togglePin(t.id)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-foreground transition hover:bg-surface-elevated"
                                  >
                                    {t.pinned ? (
                                      <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    {t.pinned ? "Bỏ ghim" : "Ghim"}
                                  </button>
                                  <div className="border-t border-border" />
                                  <button
                                    onClick={() => deleteThread(t.id)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-400 transition hover:bg-red-400/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-muted-foreground">Mimo Desktop</span>
              <span className="text-[10.5px] text-muted-foreground/70">mimo@studio · v0.1.0</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={clearHistory}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                title="Xóa lịch sử"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                title="Cài đặt"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span>
              {isEmpty
                ? project
                  ? `${project.name} - MimoChat`
                  : "Cuộc trò chuyện mới"
                : (threads.find((t) => t.id === activeId)?.title ?? "Cuộc trò chuyện")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {project && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11.5px] font-medium text-emerald-400">
                <FolderOpen className="h-3 w-3" />
                {project.name}
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11.5px] font-medium text-primary">
              <Globe className="h-3 w-3" />
              {currentLang.flag} mimo-auto
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11.5px] text-muted-foreground transition hover:bg-surface-elevated"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Đã kết nối
            </button>
          </div>
        </header>

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 bg-aura" />

          {isEmpty ? (
            <div className="relative flex flex-1 flex-col items-center justify-center px-6">
              <div className="relative mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-surface shadow-elevated">
                <div className="absolute inset-0 rounded-3xl bg-gradient-brand opacity-20 blur-xl" />
                <Sparkles
                  className="relative h-9 w-9 text-gradient"
                  style={{ color: "oklch(0.78 0.15 200)" }}
                />
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                Tôi có thể hỗ trợ gì cho bạn hôm nay?
              </h1>
              <p className="mt-3 max-w-xl text-center text-[14px] leading-relaxed text-muted-foreground">
                Hỏi tôi bất cứ điều gì, tải lên tệp để phân tích, hoặc chọn một công cụ bên dưới để
                bắt đầu.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSend(s.prompt)}
                    className="group flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 text-[13px] text-foreground/90 backdrop-blur transition hover:border-primary/40 hover:bg-surface-elevated hover:shadow-glow"
                  >
                    <s.icon className="h-3.5 w-3.5 text-primary transition group-hover:scale-110" />
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="mt-10 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                <span>{currentLang.flag}</span>
                <span>Model · mimo-auto</span>
              </div>
            </div>
          ) : (
            <div className="relative flex-1 overflow-y-auto" role="log">
              <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "group flex w-full max-w-[95%] flex-col gap-2",
                      m.role === "user" ? "ml-auto justify-end" : ""
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {m.role === "assistant" && (
                        <div className="mr-1 mt-1 hidden h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-brand shadow-glow sm:grid">
                          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
                          m.role === "user"
                            ? "rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground"
                            : "text-foreground"
                        )}
                      >
                        {m.images && m.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {m.images.map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt={`Uploaded image ${i + 1}`}
                                className="max-w-[200px] max-h-[150px] rounded-lg border border-border object-cover"
                              />
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      </div>
                      {m.role === "user" && (
                        <div className="ml-1 mt-1 hidden h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-elevated sm:grid">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        m.role === "user" ? "justify-end mr-11" : "ml-11"
                      )}
                    >
                      <button
                        onClick={() => copyMessage(m.content, m.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                        title="Sao chép"
                      >
                        {copiedId === m.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {m.role === "assistant" && (
                        <button
                          onClick={() => handleDownloadResult(m)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                          title="Tải kết quả"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {m.role === "assistant" && m.content.includes("/output/") && (
                        <button
                          onClick={() => {
                            const outputMatch = m.content.match(/\/output\/[^\s]+/);
                            if (outputMatch) {
                              copyMessage(outputMatch[0], `path-${m.id}`);
                            }
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                          title="Copy đường dẫn file"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] text-muted-foreground/60 px-2",
                        m.role === "user" ? "text-right mr-11" : "ml-11"
                      )}
                    >
                      {m.timestamp.toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-start gap-3 pl-11 pt-2">
                    <div className="mr-1 mt-1 hidden h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-brand shadow-glow sm:grid">
                      <Sparkles className="h-3.5 w-3.5 text-primary-foreground animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        <span className="text-[13px] font-medium text-foreground">
                          {activeTools.includes("translate") || activeTools.includes("subtitle")
                            ? "Đang dịch..."
                            : activeTools.includes("code") || activeTools.includes("debug")
                              ? "Mimo đang code..."
                              : "Mimo đang làm việc..."}
                        </span>
                      </div>

                      {/* Task List */}
                      {mimoLogs.length > 0 && (
                        <div className="rounded-xl border border-border bg-surface/50 p-3 space-y-1">
                          {mimoLogs.slice(-8).map((log, i) => {
                            const isLast = i === mimoLogs.slice(-8).length - 1;
                            const isRead = log.message.includes("Read");
                            const isWrite = log.message.includes("Write");
                            const isError = log.type === "error";
                            const isDone = log.type === "success";

                            // Extract filename from message
                            const filename = log.message
                              .replace("→ Read ", "")
                              .replace("← Write ", "")
                              .replace("Wrote file successfully.", "")
                              .trim();

                            return (
                              <div key={i} className="flex items-center gap-2 text-[12px]">
                                {/* Status icon */}
                                {isDone ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                ) : isError ? (
                                  <X className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                ) : isLast ? (
                                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                                ) : (
                                  <div className="h-3.5 w-3.5 shrink-0" />
                                )}

                                {/* Task content */}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {isRead && (
                                    <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                                      READ
                                    </span>
                                  )}
                                  {isWrite && (
                                    <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                                      WRITE
                                    </span>
                                  )}
                                  {!isRead && !isWrite && !isDone && !isError && (
                                    <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                      RUN
                                    </span>
                                  )}
                                  {filename && filename.length > 0 && filename !== log.message ? (
                                    <span className="text-muted-foreground truncate font-mono text-[11px]">
                                      {filename}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground truncate text-[11px]">
                                      {log.message.slice(0, 50)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Simple loading when no logs yet */}
                      {mimoLogs.length === 0 && (
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse-dot" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse-dot" style={{ animationDelay: "200ms" }} />
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse-dot" style={{ animationDelay: "400ms" }} />
                          </div>
                          <span>Đang khởi động...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Composer */}
          <div className="relative mx-auto w-full max-w-3xl px-4 pb-6">
            {/* Language & Model Pills + Project + Imported Files */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div ref={translateBtnRef} className="relative">
                <button
                  onClick={() => setTranslatePickerOpen(!translatePickerOpen)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition cursor-pointer",
                    "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  <Globe className="h-3 w-3" />
                  {targetLang.flag} {targetLang.label}
                  <ChevronDown className="h-3 w-3" />
                </button>
                <LanguagePicker
                  open={translatePickerOpen}
                  onClose={() => setTranslatePickerOpen(false)}
                  anchorRef={translateBtnRef}
                />
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
                <Bot className="h-3 w-3" />
                {currentLang.flag} mimo-auto
              </div>
              {project && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11.5px] font-medium text-emerald-400">
                  <FolderOpen className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{project.name}</span>
                  {project.features.length > 0 && (
                    <span className="text-emerald-400/60">
                      ({project.features.slice(0, 2).join(", ")})
                    </span>
                  )}
                  <button
                    onClick={handleCloseProject}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-400/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
              {importedFiles.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {importedFiles
                    .filter((f) => f.type === "image")
                    .slice(0, 3)
                    .map((f, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={f.content}
                          alt={f.filename}
                          className="h-12 w-12 rounded-lg border border-border object-cover"
                        />
                        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              setImportedFiles((prev) =>
                                prev.filter((_, idx) => idx !== importedFiles.indexOf(f))
                              )
                            }
                            className="rounded-full bg-red-500 p-0.5"
                          >
                            <X className="h-2.5 w-2.5 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {importedFiles
                    .filter((f) => f.type !== "image")
                    .slice(0, 5)
                    .map((f, i) => {
                      const shortName =
                        f.filename.length > 10
                          ? f.filename.slice(0, 10) + "..."
                          : f.filename;
                      return (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary group"
                        >
                          <File className="h-3 w-3" />
                          <span title={f.filename}>{shortName}</span>
                          <button
                            onClick={() =>
                              setImportedFiles((prev) =>
                                prev.filter((_, idx) => idx !== importedFiles.indexOf(f))
                              )
                            }
                            className="ml-0.5 rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-primary/20 transition-opacity"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  {importedFiles.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{importedFiles.length - 5} file
                    </span>
                  )}
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11.5px] font-medium text-primary">
                    <File className="h-3 w-3" />
                    {importedFiles.length} file
                    <button
                      onClick={() => {
                        setImportedFiles([]);
                        setInput("");
                      }}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <SlashCommandMenu
                open={slashOpen}
                query={slashQuery}
                onSelect={handleSlashSelect}
                onClose={() => setSlashOpen(false)}
              />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated transition focus-within:border-primary/50 focus-within:shadow-glow"
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder={
                    activeTools.length > 0
                      ? `${activeTools
                          .map((t) => TOOL_SKILLS[t]?.label)
                          .filter(Boolean)
                          .join(" + ")}: Nhập tin nhắn...`
                      : "Nhắn tin... (gõ / để gọi skill)"
                  }
                  className="block max-h-48 w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                />

                <div className="flex items-center justify-between gap-2 px-2 pb-2">
                  <div className="flex flex-wrap items-center gap-0.5">
                    <ToolBtn
                      icon={FolderOpen}
                      label="Dự án"
                      tip={
                        activeTools.includes("project")
                          ? `${project?.name || "Đã chọn"} - Click để tắt`
                          : "Mở thư mục dự án"
                      }
                      onClick={() => {
                        if (activeTools.includes("project")) {
                          toggleTool("project");
                        } else {
                          handleOpenProject();
                          const newTools = [...activeTools, "project"];
                          setActiveTools(newTools);
                          const toolPrompts = newTools
                            .map((t) => TOOL_SKILLS[t]?.prompt || "")
                            .filter(Boolean)
                            .join("");
                          setInput(toolPrompts + input.replace(/^\/[a-z_]+\s*/g, "").trim());
                        }
                      }}
                      loading={openingProject}
                      active={activeTools.includes("project")}
                    />
                    <ToolBtn
                      icon={Paperclip}
                      label="Nhập tệp"
                      tip={
                        activeTools.includes("file")
                          ? `${importedFiles.length} file - Click để tắt`
                          : "Nhập file văn bản, code, phụ đề"
                      }
                      onClick={() => {
                        if (activeTools.includes("file")) {
                          toggleTool("file");
                        } else {
                          handleFileImport();
                        }
                      }}
                      loading={importing}
                      active={activeTools.includes("file")}
                    />
                    <ToolBtn
                      icon={FileCode}
                      label="Code"
                      tip="Viết / sửa code"
                      onClick={() => toggleTool("code")}
                      active={activeTools.includes("code")}
                    />
                    <ToolBtn
                      icon={Bug}
                      label="Debug"
                      tip="Tìm và sửa lỗi"
                      onClick={() => toggleTool("debug")}
                      active={activeTools.includes("debug")}
                    />
                    <ToolBtn
                      icon={Play}
                      label="Chạy"
                      tip="Giải thích code"
                      onClick={() => toggleTool("explain")}
                      active={activeTools.includes("explain")}
                    />
                    <ToolBtn
                      icon={Languages}
                      label="Dịch"
                      tip={`Dịch sang ${targetLang.label}`}
                      onClick={() => {
                        toggleTool("translate");
                        if (!translatePickerOpen) setTranslatePickerOpen(true);
                      }}
                      active={activeTools.includes("translate") || translatePickerOpen}
                    />
                    <ToolBtn
                      icon={Subtitles}
                      label="Phụ đề"
                      tip="Dịch file phụ đề"
                      onClick={() => toggleTool("subtitle")}
                      active={activeTools.includes("subtitle")}
                    />
                    {activeTools.length > 0 && (
                      <button
                        onClick={clearTools}
                        className="rounded-lg px-2 py-1.5 text-[11px] text-red-400 hover:bg-red-400/10 transition"
                        title="Xóa tất cả công cụ"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={(!input.trim() && !isTyping) || isTyping}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-40"
                  >
                    {isTyping ? (
                      <Square className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              </form>
            </div>

            <p className="mt-2.5 text-center text-[11px] text-muted-foreground/80">
              Mimo Desktop có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.{" "}
              <kbd className="rounded border border-border bg-surface px-1 font-mono">Shift</kbd>+
              <kbd className="rounded border border-border bg-surface px-1 font-mono">Enter</kbd> để
              xuống dòng.
            </p>
          </div>
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SubtitleTranslator
        open={subtitleOpen}
        onClose={() => setSubtitleOpen(false)}
        onSendToChat={(msg) => {
          handleSend(msg);
          setSubtitleOpen(false);
        }}
      />
      <SkillsManager
        open={skillsOpen}
        onClose={() => {
          setSkillsOpen(false);
          setActiveNav("bot");
        }}
        onSkillSelect={handleSkillSelect}
      />
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Bot;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition",
        active
          ? "bg-surface-elevated text-foreground shadow-elevated"
          : "text-muted-foreground hover:bg-surface hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4", active && "text-primary")} />
      {label}
    </button>
  );
}

function ToolBtn({
  icon: Icon,
  label,
  tip,
  onClick,
  active,
  loading,
}: {
  icon: typeof Bot;
  label: string;
  tip?: string;
  onClick?: () => void;
  active?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={tip || label}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
        loading && "opacity-50 cursor-wait"
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
