#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::process::Command;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct MimoResponse {
    pub success: bool,
    pub message: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub log_type: String,
    pub message: String,
    pub detail: Option<String>,
}

pub struct MimoState {
    pub exe_path: std::path::PathBuf,
    pub logs: Vec<LogEntry>,
    pub project_path: Option<std::path::PathBuf>,
}

impl MimoState {
    pub fn new() -> Self {
        Self {
            exe_path: std::path::PathBuf::from("mimo.exe"),
            logs: Vec::new(),
            project_path: None,
        }
    }

    fn add_log(&mut self, log_type: &str, message: &str, detail: Option<String>) {
        self.logs.insert(
            0,
            LogEntry {
                id: uuid_simple(),
                timestamp: chrono_now(),
                log_type: log_type.to_string(),
                message: message.to_string(),
                detail,
            },
        );
        self.logs.truncate(200);
    }
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    format!("{:x}", t)
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let d = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    let secs = d.as_secs();
    let h = (secs / 3600) % 24;
    let m = (secs / 60) % 60;
    let s = secs % 60;
    format!("{:02}:{:02}:{:02}", h, m, s)
}

fn find_mimo_exe() -> Result<std::path::PathBuf, String> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let path = dir.join("brain").join("mimo.exe");
            if path.exists() { return Ok(path); }
            let path = dir.join("mimo.exe");
            if path.exists() { return Ok(path); }
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        let path = cwd.join("brain").join("mimo.exe");
        if path.exists() { return Ok(path); }
        let path = cwd.join("mimo.exe");
        if path.exists() { return Ok(path); }
    }
    if let Some(appdata) = std::env::var_os("LOCALAPPDATA") {
        let local_app = std::path::PathBuf::from(appdata);
        let path = local_app.join("MimoChat").join("brain").join("mimo.exe");
        if path.exists() { return Ok(path); }
        let path = local_app.join("com.nectvety.mimochat").join("brain").join("mimo.exe");
        if path.exists() { return Ok(path); }
    }
    let common_paths = vec![
        r"C:\Program Files\MimoChat\brain\mimo.exe",
        r"C:\Program Files (x86)\MimoChat\brain\mimo.exe",
    ];
    for p in common_paths {
        let path = std::path::PathBuf::from(p);
        if path.exists() { return Ok(path); }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let mut current = Some(dir.to_path_buf());
            for _ in 0..8 {
                if let Some(parent) = current {
                    let path = parent.join("brain").join("mimo.exe");
                    if path.exists() { return Ok(path); }
                    let path = parent.join("mimo.exe");
                    if path.exists() { return Ok(path); }
                    current = parent.parent().map(|p| p.to_path_buf());
                } else { break; }
            }
        }
    }
    if let Ok(output) = std::process::Command::new("where").arg("mimo.exe").output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let first_line = stdout.lines().next().unwrap_or("").trim();
            if !first_line.is_empty() {
                return Ok(std::path::PathBuf::from(first_line));
            }
        }
    }
    Err("Cannot find mimo.exe. Place it in brain/ folder next to MimoChat.exe.".to_string())
}

fn clean_ansi_codes(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            while let Some(&next) = chars.peek() {
                if next.is_ascii_alphabetic() {
                    chars.next();
                    break;
                }
                chars.next();
            }
        } else {
            result.push(c);
        }
    }
    result.trim().to_string()
}

fn truncate_str(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max])
    }
}

#[tauri::command]
async fn get_brain_path() -> Result<String, String> {
    // Strategy 1: Same directory as mimochat.exe
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let brain_path = dir.join("brain");
            std::fs::create_dir_all(&brain_path).ok();
            return Ok(brain_path.to_string_lossy().to_string());
        }
    }

    // Strategy 2: AppData\Local\MimoChat\brain
    if let Some(appdata) = std::env::var_os("LOCALAPPDATA") {
        let brain_path = std::path::PathBuf::from(appdata)
            .join("MimoChat")
            .join("brain");
        std::fs::create_dir_all(&brain_path).ok();
        return Ok(brain_path.to_string_lossy().to_string());
    }

    // Strategy 3: Current directory
    if let Ok(cwd) = std::env::current_dir() {
        let brain_path = cwd.join("brain");
        std::fs::create_dir_all(&brain_path).ok();
        return Ok(brain_path.to_string_lossy().to_string());
    }

    Err("Cannot determine brain folder path".to_string())
}

#[tauri::command]
async fn send_message(
    message: String,
    _system_prompt: Option<String>,
    state: State<'_, Arc<Mutex<MimoState>>>,
) -> Result<MimoResponse, String> {
    let mut mimo_state = state.lock().await;

    // Re-check mimo.exe path if it doesn't exist
    let exe_path = if mimo_state.exe_path.exists() {
        mimo_state.exe_path.clone()
    } else {
        match find_mimo_exe() {
            Ok(path) => {
                mimo_state.exe_path = path.clone();
                path
            }
            Err(e) => {
                return Ok(MimoResponse {
                    success: false,
                    message: String::new(),
                    error: Some(e),
                });
            }
        }
    };

    let project_path = mimo_state.project_path.clone();

    mimo_state.add_log("info", &format!("Gửi tin nhắn: {}", truncate_str(&message, 50)), None);

    // Build command args for fast response
    let mut args = Vec::new();
    args.push("run".to_string());
    args.push(message.clone());

    if let Some(ref proj) = project_path {
        args.push("--dir".to_string());
        args.push(proj.to_string_lossy().to_string());
    }

    // Use fast model for quicker responses
    args.push("--model".to_string());
    args.push("xiaomi/mimo-v2.5-pro".to_string());

    // Use minimal variant for speed
    args.push("--variant".to_string());
    args.push("minimal".to_string());

    args.push("--dangerously-skip-permissions".to_string());

    mimo_state.add_log("info", &format!("Running: mimo {}", args.join(" ")), None);

    let output = Command::new(&exe_path)
        .args(&args)
        .output()
        .await;

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();

            for line in stdout.lines() {
                let cleaned = clean_ansi_codes(line.trim());
                if cleaned.is_empty() { continue; }
                if cleaned.contains("→") || cleaned.contains("←") || cleaned.contains("Write") || cleaned.contains("Read") || cleaned.contains("$") {
                    mimo_state.add_log("info", &truncate_str(&cleaned, 150), None);
                }
            }

            if !out.status.success() {
                let error_msg = if !stderr.is_empty() {
                    truncate_str(stderr.trim(), 500).to_string()
                } else {
                    format!("mimo.exe exited with code: {}", out.status.code().unwrap_or(-1))
                };
                mimo_state.add_log("error", "Gửi tin nhắn thất bại", Some(error_msg.clone()));
                return Ok(MimoResponse { success: false, message: String::new(), error: Some(error_msg) });
            }

            let response = parse_mimo_output(&stdout);
            mimo_state.add_log("success", "Nhận phản hồi thành công", Some(response.clone()));
            Ok(MimoResponse { success: true, message: response, error: None })
        }
        Err(e) => {
            let err_msg = format!("Failed to run mimo.exe: {}", e);
            mimo_state.add_log("error", "Không thể khởi chạy mimo.exe", Some(err_msg.clone()));
            Ok(MimoResponse { success: false, message: String::new(), error: Some(err_msg) })
        }
    }
}

fn parse_mimo_output(output: &str) -> String {
    let lines: Vec<&str> = output.lines().collect();
    let mut result_lines = Vec::new();
    let mut in_system_block = false;

    for line in &lines {
        let trimmed = line.trim();

        // Skip system-reminder blocks
        if trimmed.contains("<system-reminder>") || trimmed.contains("<<system-reminder>>") {
            in_system_block = true;
            continue;
        }
        if trimmed.contains("</system-reminder>") || trimmed.contains("<</system-reminder>>") {
            in_system_block = false;
            continue;
        }
        if in_system_block {
            continue;
        }

        // Skip empty lines at start
        if trimmed.is_empty() && result_lines.is_empty() {
            continue;
        }

        // Skip ANSI escape codes
        if trimmed.starts_with('\x1b') {
            continue;
        }

        // Skip progress/status lines
        if trimmed.contains("build ·")
            || trimmed.contains("Thinking...")
            || trimmed.contains("思考中")
            || trimmed.starts_with("[")
            || trimmed.contains("Blocking")
        {
            continue;
        }

        result_lines.push(trimmed);
    }

    let result = result_lines.join("\n").trim().to_string();

    if result.is_empty() {
        "(No response from Mimo)".to_string()
    } else {
        result
    }
}

#[tauri::command]
async fn check_mimo_exists(state: State<'_, Arc<Mutex<MimoState>>>) -> Result<bool, String> {
    let exists = find_mimo_exe().is_ok();
    let mut mimo_state = state.lock().await;
    if exists {
        if let Ok(path) = find_mimo_exe() {
            let path_str = format!("Path: {:?}", path);
            mimo_state.exe_path = path;
            mimo_state.add_log("success", "Tìm thấy mimo.exe", Some(path_str));
        }
    } else {
        mimo_state.add_log("error", "Không tìm thấy mimo.exe", Some("Place mimo.exe next to mimochat.exe or in PATH.".to_string()));
    }
    Ok(exists)
}

#[tauri::command]
async fn get_logs(state: State<'_, Arc<Mutex<MimoState>>>) -> Result<Vec<LogEntry>, String> {
    let mimo_state = state.lock().await;
    Ok(mimo_state.logs.clone())
}

#[tauri::command]
async fn clear_logs(state: State<'_, Arc<Mutex<MimoState>>>) -> Result<(), String> {
    let mut mimo_state = state.lock().await;
    mimo_state.logs.clear();
    Ok(())
}

#[tauri::command]
async fn read_subtitle_file() -> Result<serde_json::Value, String> {
    use rfd::FileDialog;

    let file = FileDialog::new()
        .add_filter("Subtitle Files", &["srt", "vtt", "ass", "ssa"])
        .add_filter("All Files", &["*"])
        .pick_file()
        .ok_or("No file selected")?;

    let content = std::fs::read_to_string(&file)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let filename = file.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let path = file.to_string_lossy().to_string();

    Ok(serde_json::json!({
        "path": path,
        "content": content,
        "filename": filename
    }))
}

#[tauri::command]
async fn write_subtitle_file(content: String, filename: String) -> Result<String, String> {
    use rfd::FileDialog;

    let file = FileDialog::new()
        .add_filter("SRT File", &["srt"])
        .add_filter("VTT File", &["vtt"])
        .set_file_name(&filename)
        .save_file()
        .ok_or("No file selected")?;

    std::fs::write(&file, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(file.to_string_lossy().to_string())
}

// Blocked extensions that mimo.exe cannot process
const BLOCKED_EXTENSIONS: &[&str] = &[
    "exe", "dll", "so", "dylib", "bin", "msi", "app", "deb", "rpm",
    "zip", "rar", "7z", "tar", "gz", "bz2", "xz", "zst",
    "mp3", "mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4a", "wav", "ogg", "flac",
    "doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf",
    "db", "sqlite", "mdb", "accdb",
    "iso", "img", "vmdk", "vdi",
    "ttf", "otf", "woff", "woff2", "eot",
    "o", "obj", "lib", "a", "pdb",
];

const IMAGE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "bmp", "ico", "webp", "svg", "tiff",
];

fn is_image_file(filename: &str) -> bool {
    let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();
    IMAGE_EXTENSIONS.contains(&ext.as_str())
}

fn is_text_file(filename: &str) -> bool {
    let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();
    if BLOCKED_EXTENSIONS.contains(&ext.as_str()) || is_image_file(filename) {
        return false;
    }
    // Check if file size < 10MB
    return true;
}

fn read_image_as_base64(path: &std::path::Path) -> Result<String, String> {
    let data = std::fs::read(path).map_err(|e| format!("Failed to read image: {}", e))?;
    use base64::{Engine as _, engine::general_purpose};
    Ok(general_purpose::STANDARD.encode(&data))
}

#[tauri::command]
async fn read_any_file() -> Result<serde_json::Value, String> {
    use rfd::FileDialog;

    let files = FileDialog::new()
        .add_filter("All Files", &["*"])
        .pick_files()
        .ok_or("No file selected")?;

    let mut text_results = Vec::new();
    let mut image_results = Vec::new();

    for file in &files {
        let filename = file.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let metadata = std::fs::metadata(file).ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);

        // Skip files larger than 10MB
        if size > 10 * 1024 * 1024 {
            continue;
        }

        // Handle image files
        if is_image_file(&filename) {
            match read_image_as_base64(file) {
                Ok(base64_data) => {
                    let path = file.to_string_lossy().to_string();
                    let mime = match filename.rsplit('.').next().unwrap_or("").to_lowercase().as_str() {
                        "jpg" | "jpeg" => "image/jpeg",
                        "png" => "image/png",
                        "gif" => "image/gif",
                        "bmp" => "image/bmp",
                        "webp" => "image/webp",
                        "svg" => "image/svg+xml",
                        _ => "image/png",
                    };
                    image_results.push(serde_json::json!({
                        "path": path,
                        "content": format!("data:{};base64,{}", mime, base64_data),
                        "filename": filename,
                        "size": size,
                        "type": "image",
                        "mime": mime,
                    }));
                }
                Err(_) => continue,
            }
            continue;
        }

        // Handle text files
        if !is_text_file(&filename) {
            continue;
        }

        match std::fs::read_to_string(file) {
            Ok(content) => {
                let path = file.to_string_lossy().to_string();
                text_results.push(serde_json::json!({
                    "path": path,
                    "content": content,
                    "filename": filename,
                    "size": size,
                    "type": "text",
                }));
            }
            Err(_) => continue,
        }
    }

    if text_results.is_empty() && image_results.is_empty() {
        return Err("Không có file nào phù hợp được chọn".to_string());
    }

    let mut all_results = text_results;
    all_results.extend(image_results);

    Ok(serde_json::json!({
        "files": all_results,
        "count": all_results.len(),
    }))
}

fn get_output_dir() -> std::path::PathBuf {
    let dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("output")
        .join("logs");
    std::fs::create_dir_all(&dir).ok();
    dir
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionData {
    pub id: String,
    pub title: String,
    pub messages: Vec<SessionMessage>,
    pub created_at: String,
    pub updated_at: String,
    pub active_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: String,
    pub images: Option<Vec<String>>,
}

fn get_sessions_file() -> std::path::PathBuf {
    let dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("output");
    std::fs::create_dir_all(&dir).ok();
    dir.join("sessions.json")
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionsData {
    pub threads: Vec<SessionData>,
    pub active_id: Option<String>,
}

#[tauri::command]
async fn save_all_sessions(threads: Vec<SessionData>, active_id: Option<String>) -> Result<String, String> {
    let path = get_sessions_file();
    let data = SessionsData { threads, active_id };
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Serialize error: {}", e))?;
    std::fs::write(&path, json)
        .map_err(|e| format!("Write error: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn load_all_sessions() -> Result<SessionsData, String> {
    let path = get_sessions_file();
    if path.exists() {
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Read error: {}", e))?;
        let data: SessionsData = serde_json::from_str(&content)
            .map_err(|e| format!("Parse error: {}", e))?;
        Ok(data)
    } else {
        Ok(SessionsData {
            threads: Vec::new(),
            active_id: None,
        })
    }
}

#[tauri::command]
async fn delete_session(id: String) -> Result<(), String> {
    let dir = get_output_dir();
    let filename = format!("session_{}.json", id);
    let path = dir.join(&filename);
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Delete error: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn mimo_command(args: Vec<String>) -> Result<MimoResponse, String> {
    let exe_path = find_mimo_exe()?;
    let output = Command::new(&exe_path)
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run mimo.exe: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Ok(MimoResponse {
            success: false,
            message: String::new(),
            error: Some(if !stderr.is_empty() { stderr.trim().to_string() } else { format!("Exit code: {}", output.status.code().unwrap_or(-1)) }),
        });
    }

    Ok(MimoResponse {
        success: true,
        message: parse_mimo_output(&stdout),
        error: None,
    })
}

#[tauri::command]
async fn select_project_folder(state: State<'_, Arc<Mutex<MimoState>>>) -> Result<serde_json::Value, String> {
    use rfd::FileDialog;

    let folder = FileDialog::new()
        .set_title("Chọn thư mục dự án")
        .pick_folder()
        .ok_or("No folder selected")?;

    let folder_str = folder.to_string_lossy().to_string();

    // Try to read project info
    let mut project_info = serde_json::json!({
        "path": folder_str,
        "name": folder.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(),
    });

    // Check for common project files
    let mut features = Vec::new();
    if folder.join("package.json").exists() { features.push("Node.js".to_string()); }
    if folder.join("Cargo.toml").exists() { features.push("Rust".to_string()); }
    if folder.join("go.mod").exists() { features.push("Go".to_string()); }
    if folder.join("requirements.txt").exists() || folder.join("pyproject.toml").exists() || folder.join("setup.py").exists() { features.push("Python".to_string()); }
    if folder.join("pom.xml").exists() || folder.join("build.gradle").exists() { features.push("Java".to_string()); }
    if folder.join("tsconfig.json").exists() { features.push("TypeScript".to_string()); }
    if folder.join("docker-compose.yml").exists() || folder.join("Dockerfile").exists() { features.push("Docker".to_string()); }
    if folder.join(".git").exists() { features.push("Git".to_string()); }
    if folder.join("README.md").exists() || folder.join("README.txt").exists() { features.push("Has README".to_string()); }

    project_info["features"] = serde_json::json!(features);

    let mut mimo_state = state.lock().await;
    mimo_state.project_path = Some(folder.clone());
    mimo_state.add_log("success", &format!("Đã mở dự án: {}", project_info["name"]), Some(format!("Path: {}\nFeatures: {}", folder_str, features.join(", "))));

    Ok(project_info)
}

#[tauri::command]
async fn get_project_info(state: State<'_, Arc<Mutex<MimoState>>>) -> Result<serde_json::Value, String> {
    let mimo_state = state.lock().await;
    match &mimo_state.project_path {
        Some(path) => {
            let mut features = Vec::new();
            if path.join("package.json").exists() { features.push("Node.js".to_string()); }
            if path.join("Cargo.toml").exists() { features.push("Rust".to_string()); }
            if path.join("go.mod").exists() { features.push("Go".to_string()); }
            if path.join("requirements.txt").exists() || path.join("pyproject.toml").exists() { features.push("Python".to_string()); }
            if path.join("tsconfig.json").exists() { features.push("TypeScript".to_string()); }
            if path.join(".git").exists() { features.push("Git".to_string()); }

            Ok(serde_json::json!({
                "path": path.to_string_lossy(),
                "name": path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(),
                "features": features,
                "active": true,
            }))
        }
        None => Ok(serde_json::json!({ "active": false })),
    }
}

#[tauri::command]
async fn close_project(state: State<'_, Arc<Mutex<MimoState>>>) -> Result<(), String> {
    let mut mimo_state = state.lock().await;
    mimo_state.project_path = None;
    mimo_state.add_log("info", "Đã đóng dự án", None);
    Ok(())
}

fn get_skills_dir() -> std::path::PathBuf {
    let dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("app")
        .join("skills");
    std::fs::create_dir_all(&dir).ok();
    dir
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillInfo {
    pub id: String,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub filename: String,
    pub installed: bool,
    pub content: Option<String>,
}

fn parse_skill_md(content: &str, filename: &str) -> SkillInfo {
    let mut title = String::new();
    let mut description = String::new();
    let mut icon = String::from("extension");

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("# ") {
            title = trimmed[2..].trim().to_string();
        } else if trimmed.starts_with("icon:") {
            icon = trimmed[5..].trim().to_string();
        } else if trimmed.starts_with("description:") {
            description = trimmed[12..].trim().to_string();
        } else if trimmed.starts_with("> ") && description.is_empty() {
            description = trimmed[2..].trim().to_string();
        }
    }

    let id = filename.replace(".md", "");

    SkillInfo {
        id,
        title: if title.is_empty() { filename.replace(".md", "") } else { title },
        description: if description.is_empty() { "Skill không có mô tả".to_string() } else { description },
        icon,
        filename: filename.to_string(),
        installed: true,
        content: Some(content.to_string()),
    }
}

#[tauri::command]
async fn scan_skills() -> Result<Vec<SkillInfo>, String> {
    let dir = get_skills_dir();
    let mut skills = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("md") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    let filename = path.file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();
                    let mut skill = parse_skill_md(&content, &filename);
                    skill.content = Some(content);
                    skills.push(skill);
                }
            }
        }
    }

    skills.sort_by(|a, b| a.title.cmp(&b.title));
    Ok(skills)
}

#[tauri::command]
async fn install_skill(title: String, description: String, icon: String) -> Result<String, String> {
    let dir = get_skills_dir();
    let id = title.to_lowercase().replace(" ", "_").replace(|c: char| !c.is_alphanumeric() && c != '_', "");
    let filename = format!("{}.md", id);
    let path = dir.join(&filename);

    let content = format!(
        "# {}\n\nicon: {}\n\n> {}\n\n## Usage\n\nMô tả cách sử dụng skill này.\n",
        title, icon, description
    );

    std::fs::write(&path, content)
        .map_err(|e| format!("Lỗi ghi file: {}", e))?;

    Ok(id)
}

#[tauri::command]
async fn uninstall_skill(filename: String) -> Result<(), String> {
    let dir = get_skills_dir();
    let path = dir.join(&filename);
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Lỗi xóa file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn import_skill_files() -> Result<serde_json::Value, String> {
    use rfd::FileDialog;

    let files = FileDialog::new()
        .add_filter("Markdown Files", &["md"])
        .add_filter("All Files", &["*"])
        .pick_files()
        .ok_or("No file selected")?;

    let dir = get_skills_dir();
    let mut imported = Vec::new();

    for file in &files {
        let filename = file.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        if !filename.ends_with(".md") {
            continue;
        }

        let content = std::fs::read_to_string(file)
            .map_err(|e| format!("Lỗi đọc file {}: {}", filename, e))?;

        let dest = dir.join(&filename);
        std::fs::write(&dest, content)
            .map_err(|e| format!("Lỗi ghi file {}: {}", filename, e))?;

        imported.push(serde_json::json!({
            "filename": filename,
            "status": "imported"
        }));
    }

    Ok(serde_json::json!({
        "files": imported,
        "count": imported.len(),
    }))
}

fn main() {
    let mimo_state = match find_mimo_exe() {
        Ok(path) => {
            println!("Found mimo.exe at: {:?}", path);
            let mut state = MimoState::new();
            state.exe_path = path;
            state.add_log("success", "Khởi động MimoChat", Some(format!("mimo.exe tại: {:?}", state.exe_path)));
            state
        }
        Err(e) => {
            eprintln!("{}", e);
            let mut state = MimoState::new();
            state.add_log("error", "Không tìm thấy mimo.exe khi khởi động", Some(e));
            state
        }
    };

    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(mimo_state)))
        .invoke_handler(tauri::generate_handler![
            send_message,
            check_mimo_exists,
            get_logs,
            clear_logs,
            read_subtitle_file,
            write_subtitle_file,
            read_any_file,
            save_all_sessions,
            load_all_sessions,
            delete_session,
            mimo_command,
            select_project_folder,
            get_project_info,
            close_project,
            scan_skills,
            install_skill,
            uninstall_skill,
            import_skill_files,
            get_brain_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
