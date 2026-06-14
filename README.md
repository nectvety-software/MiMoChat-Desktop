# MimoChat - AI Desktop Assistant

<p align="center">
  <img src="src-tauri/icons/icon.ico" width="100" alt="MimoChat Logo">
</p>

<p align="center">
  <strong>Ứng dụng desktop AI Assistant được xây dựng với Tauri + React + TypeScript</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#development">Development</a>
</p>

---

## Overview

MimoChat là ứng dụng desktop AI chatbot sử dụng **mimocode (mimo.exe)** làm AI engine. Ứng dụng cung cấp giao diện đẹp mắt với nhiều công cụ hỗ trợ lập trình viên làm việc hiệu quả hơn.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS 4, Zustand |
| **Backend** | Rust (Tauri v1), Tokio |
| **AI Engine** | mimocode (mimo.exe) |
| **Build** | Vite 6, Cargo |

---

## Features

### Core Features

- **AI Chat** - Trò chuyện với AI để viết code, debug, giải thích code
- **Multi-language Support** - Hỗ trợ 70+ ngôn ngữ
- **Session Management** - Lưu và quản lý cuộc trò chuyện
- **Skills System** - Hệ thống skills linh hoạt
- **Task Progress** - Hiển thị tiến trình làm việc real-time

### Tool System (Cross-tool Interaction)

Các công cụ có thể kết hợp với nhau để tạo workflow phức tạp:

| Tool | Shortcut | Description |
|------|----------|-------------|
| **Dự án** | - | Mở thư mục project, AI phân tích code |
| **Nhập tệp** | - | Import file text, code, phụ đề, hình ảnh |
| **Code** | `/code_review` | Viết và review code |
| **Debug** | `/bug_hunter` | Tìm và sửa lỗi |
| **Chạy** | `/explain` | Giải thích code |
| **Dịch** | `/translate` | Dịch đa ngôn ngữ |
| **Phụ đề** | `/subtitle` | Dịch file phụ đề (.srt, .vtt, .ass) |

**Ví dụ workflow:**
```
Chọn Dự án + Code → Nhập "Viết function login" → AI viết code cho project
Chọn Nhập tệp + Dịch → Import file.srt → AI dịch phụ đề
Chọn Dự án + Debug → Nhập "Tìm lỗi" → AI tìm và sửa lỗi trong project
```

### Task Progress Display

Khi Mimo đang làm việc, chatbot hiển thị tasks real-time:

```
┌─────────────────────────────────────────────┐
│ ◌ Mimo đang code...                         │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ✓ READ main.py                          │ │
│ │ ✓ READ src/game.py                      │ │
│ │ ✓ WRITE src/editor.py                   │ │
│ │ ◌ WRITE src/game.py                     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- Badge `READ` (xanh) khi đọc file
- Badge `WRITE` (lục) khi ghi file
- Badge `RUN` (tím) khi thực thi lệnh
- Spinner cho task đang chạy
- Checkmark cho task hoàn thành

### Skills Mimo

10 skills mặc định:

| Skill | Command | Description |
|-------|---------|-------------|
| Code Review | `/code_review` | Đánh giá code chuyên nghiệp |
| Bug Hunter | `/bug_hunter` | Tìm và sửa lỗi code |
| Refactor | `/refactor` | Tái cấu trúc code |
| Code Explainer | `/explain` | Giải thích code đơn giản |
| Test Writer | `/write_test` | Tạo unit test |
| API Builder | `/api` | Thiết kế REST API |
| SQL Expert | `/sql` | Viết & tối ưu SQL |
| Security Audit | `/security` | Kiểm tra bảo mật |
| Doc Generator | `/doc` | Tạo documentation |
| Translator | `/translate` | Dịch đa ngôn ngữ |

### Slash Commands

Gõ `/` trong textbox để hiển thị menu commands:

```
/          → Hiển thị danh sách commands
/translate → Hiển thị language picker + danh sách ngôn ngữ
/code      → Code Review
/debug     → Bug Hunter
...
```

### File Import & Export

**Import file:**
- Hỗ trợ file text (.txt, .md, .json, .csv, .xml, .yaml)
- Hỗ trợ file code (.js, .ts, .py, .rs, .go, .java, etc.)
- Hỗ trợ file phụ đề (.srt, .vtt, .ass)
- Hỗ trợ hình ảnh (.jpg, .png, .webp, .gif)
- Hiển thị tên file rút gọn (10 ký tự + "...")

**Export results:**
- Nút Copy để sao chép kết quả
- Nút Download để tải file kết quả
- Nút Copy Path để copy đường dẫn file output

### Image Support

MimoChat hỗ trợ import và phân tích hình ảnh:

```
1. Click "Nhập tệp" → Chọn hình ảnh
2. Hình ảnh hiển thị thumbnail above textbox
3. Nhập yêu cầu phân tích
4. Gửi → AI phân tích và gợi ý
```

Ví dụ: Import ảnh sơ đồ mạch điện → "Vẽ sơ đồ nguyên lý KiCad"

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) >= 1.70
- [mimocode](https://github.com/nicepkg/mimocode) (mimo.exe)

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/mimochat.git
cd mimochat

# Install dependencies
npm install

# Place mimo.exe in brain/ folder
# brain/mimo.exe

# Run development
npm run tauri dev
```

### Build

```bash
# Build for production
npm run tauri build
```

---

## Usage

### Bắt đầu

1. Chạy `npm run tauri dev`
2. Click **"Dự án"** để chọn thư mục project (optional)
3. Nhập tin nhắn và gửi

### Sử dụng Tools

```
1. Click tool button → Tool sẽ active (sáng màu)
2. Có thể chọn nhiều tools cùng lúc
3. Tool prompt sẽ hiển thị trong textbox
4. Nhập thêm nội dung → Gửi
5. AI sẽ nhận tất cả ngữ cảnh từ các tools đã chọn
```

### Dịch file phụ đề

```
1. Click "Nhập tệp" → Chọn file .srt, .vtt, .ass
2. Click "Dịch" → Chọn ngôn ngữ đích
3. Gửi → AI dịch và hiển thị kết quả trong chat
4. Click Copy hoặc Download để lưu kết quả
```

### Viết code cho project

```
1. Click "Dự án" → Chọn thư mục project
2. Click "Code" → Tool code được activate
3. Nhập yêu cầu: "Viết function login"
4. Gửi → AI phân tích project và viết code
5. Xem tasks realtime khi AI đang làm việc
```

---

## Project Structure

```
mimochat/
├── brain/
│   └── mimo.exe              # AI Engine
├── app/
│   └── skills/               # Custom skills (.md files)
├── src/
│   ├── components/
│   │   ├── ChatApp.tsx        # Main chat interface + Task display
│   │   ├── SettingsDialog.tsx # Settings modal
│   │   ├── SkillsManager.tsx  # Skills management (Mimo + Custom tabs)
│   │   ├── SlashCommandMenu.tsx # Slash commands + Language picker
│   │   ├── SubtitleTranslator.tsx # Subtitle translation
│   │   └── LanguagePicker.tsx # Language selection dropdown
│   ├── lib/
│   │   ├── subtitle.ts        # Subtitle parsers (SRT, VTT, ASS)
│   │   └── utils.ts          # Utilities (cn helper)
│   ├── store/
│   │   └── settingsStore.ts   # Zustand store (language, logs)
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── src-tauri/
│   ├── src/
│   │   └── main.rs           # Rust backend (mimo.exe integration)
│   ├── Cargo.toml
│   ├── icons/
│   └── tauri.conf.json
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
└── vite.config.ts
```

---

## Configuration

### Port (optional)

Default port: `1420`

```bash
# Change port in vite.config.ts
server: {
  port: 3000,
  strictPort: true,
}
```

### mimo.exe Location

mimo.exe should be in `brain/` folder next to the app executable.

Search order:
1. `brain/mimo.exe`
2. Same directory as mimochat.exe
3. Parent directories (up to 5 levels)
4. Windows PATH

### Custom Skills

Add custom skills in `app/skills/` folder:

```markdown
# Skill Name

icon: extension

> Description of the skill

## Usage

Instructions for using this skill.

## Prompt

The prompt to send to AI.
```

---

## Development

### Commands

```bash
npm run dev          # Start Vite dev server
npm run tauri dev    # Start Tauri development
npm run tauri build  # Build for production
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Tech Details

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS 4 for styling
- Zustand for state management
- Lucide React for icons

**Backend:**
- Tauri v1 for desktop app
- Rust for system operations
- Tokio for async runtime
- rfd for file dialogs
- base64 for image encoding

**AI Integration:**
- mimocode CLI for AI inference
- Command: `mimo run "message" --dir <project> --dangerously-skip-permissions`
- ANSI code cleaning for clean output
- Log parsing and display

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Tauri](https://tauri.app/) - Desktop app framework
- [mimocode](https://github.com/nicepkg/mimocode) - AI coding assistant
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Lucide](https://lucide.dev/) - Icon library
