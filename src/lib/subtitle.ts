export interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  originalText?: string;
}

export function parseSRT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    const index = parseInt(lines[0].trim());
    if (isNaN(index)) continue;

    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) continue;

    const text = lines.slice(2).join("\n").trim();
    entries.push({
      index,
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text,
      originalText: text,
    });
  }

  return entries;
}

export function parseVTT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const lines = content.trim().split("\n");
  let i = 0;

  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes("-->")) {
    i++;
  }

  let index = 1;
  while (i < lines.length) {
    const timeMatch = lines[i].match(
      /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/
    );
    if (timeMatch) {
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && !lines[i].includes("-->")) {
        textLines.push(lines[i].trim());
        i++;
      }
      if (textLines.length > 0) {
        entries.push({
          index: index++,
          startTime: timeMatch[1].replace(".", ","),
          endTime: timeMatch[2].replace(".", ","),
          text: textLines.join("\n"),
          originalText: textLines.join("\n"),
        });
      }
    } else {
      i++;
    }
  }

  return entries;
}

export function parseASS(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const lines = content.split("\n");
  let index = 1;

  for (const line of lines) {
    if (!line.startsWith("Dialogue:")) continue;

    const match = line.match(
      /Dialogue:\s*\d+,(\d+:\d+:\d+\.\d+),(\d+:\d+:\d+\.\d+),[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,(.*)/
    );
    if (!match) continue;

    const startTime = match[1].replace(/\./, ",");
    const endTime = match[2].replace(/\./, ",");
    const text = match[3]
      .replace(/\{[^}]*\}/g, "")
      .replace(/\\N/g, "\n")
      .replace(/\\n/g, "\n")
      .trim();

    entries.push({
      index: index++,
      startTime,
      endTime,
      text,
      originalText: text,
    });
  }

  return entries;
}

export function entriesToSRT(entries: SubtitleEntry[]): string {
  return (
    entries.map((e) => `${e.index}\n${e.startTime} --> ${e.endTime}\n${e.text}`).join("\n\n") + "\n"
  );
}

export function entriesToVTT(entries: SubtitleEntry[]): string {
  const header = "WEBVTT\n\n";
  const body = entries
    .map(
      (e) =>
        `${e.index}\n${e.startTime.replace(",", ".")} --> ${e.endTime.replace(",", ".")}\n${e.text}`
    )
    .join("\n\n");
  return header + body + "\n";
}

export function detectFormat(filename: string): "srt" | "vtt" | "ass" | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "srt") return "srt";
  if (ext === "vtt") return "vtt";
  if (ext === "ass" || ext === "ssa") return "ass";
  return null;
}

export function buildTranslationPrompt(
  entries: SubtitleEntry[],
  targetLang: string,
  targetLangName: string
): string {
  const lines = entries.map((e) => `[${e.index}] ${e.text}`);
  return `Dịch các dòng phụ đề sau sang ${targetLangName}. QUAN TRỌNG: Giữ nguyên định dạng [số thứ tự] ở đầu mỗi dòng. Chỉ dịch nội dung văn bản, KHÔNG dịch số thứ tự. Trả về kết quả theo định dạng: [số] nội dung đã dịch.

Ví dụ đầu vào:
[1] Hello, how are you?
[2] I am fine, thank you.

Ví dụ đầu ra khi dịch sang tiếng Việt:
[1] Xin chào, bạn khỏe không?
[2] Tôi khỏe, cảm ơn bạn.

Danh sách cần dịch:
${lines.join("\n")}`;
}
