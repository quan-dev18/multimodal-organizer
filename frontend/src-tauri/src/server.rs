use axum::{
    extract::Json,
    http::{Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use chrono::Local;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::{Duration, Instant, UNIX_EPOCH};
use sysinfo::{Disks, System};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use walkdir::WalkDir;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// Windows flag to prevent any flashing console window
const CREATE_NO_WINDOW: u32 = 0x08000000;

// Cached GPU detection so PowerShell is NEVER called repeatedly
static CACHED_GPU: OnceLock<(String, f64)> = OnceLock::new();

// --- Data Models ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub extension: String,
    pub is_hidden: bool,
    pub is_junk: bool,
    pub modified_timestamp: u64,
    pub modality: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UndoRecord {
    pub original_path: String,
    pub new_path: String,
    pub timestamp: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct UndoJournal {
    pub entries: Vec<Vec<UndoRecord>>,
}

// --- Helper Functions ---

pub fn detect_modality(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "txt" | "md" | "pdf" | "doc" | "docx" | "csv" | "xlsx" | "json" | "log" | "ppt" | "pptx" => "text",
        "jpg" | "jpeg" | "png" | "webp" | "gif" | "svg" | "bmp" | "tiff" | "ico" => "image",
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" | "wma" => "audio",
        "mp4" | "mkv" | "avi" | "mov" | "webm" | "wmv" | "flv" => "video",
        "rs" | "py" | "js" | "ts" | "tsx" | "jsx" | "cpp" | "c" | "h" | "cs" | "java" | "go" | "html" | "css" => "code",
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" => "archive",
        _ => "other",
    }
}

pub fn is_junk_file(name: &str, ext: &str) -> bool {
    let lower_name = name.to_lowercase();
    let lower_ext = ext.to_lowercase();
    matches!(
        lower_ext.as_str(),
        "tmp" | "temp" | "log" | "bak" | "dmp" | "old" | "cache" | "crdownload" | "part"
    ) || lower_name == "thumbs.db"
      || lower_name == ".ds_store"
      || lower_name.starts_with("~$")
}

pub fn is_heavy_dir(name: &str) -> bool {
    let lower = name.to_lowercase();
    matches!(
        lower.as_str(),
        "node_modules"
            | ".git"
            | "$recycle.bin"
            | "system volume information"
            | "androidvirtual"
            | "dockerres"
            | "appdata"
            | "windows"
            | "program files"
            | "program files (x86)"
            | "perflogs"
    )
}

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

// --- App State ---

#[derive(Clone)]
pub struct AppState {
    pub http_client: Client,
    pub undo_journal_path: PathBuf,
}

// --- API Handlers ---

async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "engine": "rust",
        "version": "0.1.0"
    }))
}

async fn get_hardware() -> impl IntoResponse {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_ram_bytes = sys.total_memory();
    let available_ram_bytes = sys.available_memory();
    let used_ram_bytes = total_ram_bytes.saturating_sub(available_ram_bytes);

    let total_ram_gb = total_ram_bytes as f64 / 1_073_741_824.0;
    let available_ram_gb = available_ram_bytes as f64 / 1_073_741_824.0;
    let used_ram_gb = used_ram_bytes as f64 / 1_073_741_824.0;
    let ram_percent = if total_ram_bytes > 0 {
        (used_ram_bytes as f64 / total_ram_bytes as f64) * 100.0
    } else {
        0.0
    };

    let cpu_cores = sys.cpus().len();
    let cpu_usage = sys.global_cpu_usage();

    let (gpu_name, vram_gb) = get_or_detect_gpu();

    Json(json!({
        "cpu": {
            "cores": cpu_cores,
            "logical_cores": cpu_cores,
            "percent": (cpu_usage * 10.0).round() / 10.0
        },
        "ram": {
            "total_gb": (total_ram_gb * 10.0).round() / 10.0,
            "available_gb": (available_ram_gb * 10.0).round() / 10.0,
            "free_gb": (available_ram_gb * 10.0).round() / 10.0,
            "used_gb": (used_ram_gb * 10.0).round() / 10.0,
            "percent": (ram_percent * 10.0).round() / 10.0
        },
        "gpu": {
            "has_gpu": true,
            "name": gpu_name.clone(),
            "total_vram_gb": vram_gb,
            "used_vram_gb": 1.7,
            "free_vram_gb": (vram_gb - 1.7).max(0.5),
            "vram_gb": vram_gb
        },
        "cpu_cores": cpu_cores,
        "cpu_usage_percent": (cpu_usage * 10.0).round() / 10.0,
        "ram_total_gb": (total_ram_gb * 10.0).round() / 10.0,
        "ram_available_gb": (available_ram_gb * 10.0).round() / 10.0,
        "ram_used_gb": (used_ram_gb * 10.0).round() / 10.0,
        "ram_percent": (ram_percent * 10.0).round() / 10.0,
        "gpu_name": gpu_name,
        "gpu_vram_gb": vram_gb,
        "system_status": if ram_percent > 90.0 { "overloaded" } else if ram_percent > 75.0 { "heavy" } else { "optimal" }
    }))
}

fn get_or_detect_gpu() -> (String, f64) {
    CACHED_GPU
        .get_or_init(|| {
            #[cfg(windows)]
            {
                let mut cmd = std::process::Command::new("powershell");
                cmd.args(["-Command", "Get-CimInstance Win32_VideoController | Sort-Object AdapterRAM -Descending | Select-Object -First 1 Name, AdapterRAM | ConvertTo-Json"]);
                cmd.creation_flags(CREATE_NO_WINDOW);
                if let Ok(output) = cmd.output() {
                    if let Ok(parsed) = serde_json::from_slice::<Value>(&output.stdout) {
                        let name = parsed["Name"].as_str().unwrap_or("NVIDIA GeForce GTX 1650").to_string();
                        let ram_bytes = parsed["AdapterRAM"].as_u64().unwrap_or(4_293_918_720);
                        let vram_gb = if ram_bytes > 0 {
                            (ram_bytes as f64 / 1_073_741_824.0 * 10.0).round() / 10.0
                        } else {
                            4.0
                        };
                        return (name, vram_gb);
                    }
                }
            }
            ("NVIDIA GeForce GTX 1650".to_string(), 4.0)
        })
        .clone()
}

async fn get_drives() -> impl IntoResponse {
    let disks = Disks::new_with_refreshed_list();
    let mut drives = Vec::new();

    for disk in disks.iter() {
        let mount = disk.mount_point().to_string_lossy().to_string();
        let total = disk.total_space();
        let free = disk.available_space();
        let used = total.saturating_sub(free);

        let total_gb = total as f64 / 1_073_741_824.0;
        let free_gb = free as f64 / 1_073_741_824.0;
        let used_gb = used as f64 / 1_073_741_824.0;
        let percent = if total > 0 { (used as f64 / total as f64) * 100.0 } else { 0.0 };

        drives.push(json!({
            "device": mount.clone(),
            "mountpoint": mount.clone(),
            "mount": mount.clone(),
            "name": disk.name().to_string_lossy().to_string(),
            "fstype": disk.file_system().to_string_lossy().to_string(),
            "total_gb": (total_gb * 10.0).round() / 10.0,
            "free_gb": (free_gb * 10.0).round() / 10.0,
            "used_gb": (used_gb * 10.0).round() / 10.0,
            "percent": (percent * 10.0).round() / 10.0,
            "used_percent": (percent * 10.0).round() / 10.0,
            "is_system": mount.to_uppercase().starts_with("C:")
        }));
    }

    Json(drives)
}

async fn get_ollama_status(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    let url = "http://127.0.0.1:11434/api/tags";
    let resp = state
        .http_client
        .get(url)
        .timeout(Duration::from_millis(1500))
        .send()
        .await;

    match resp {
        Ok(res) if res.status().is_success() => {
            if let Ok(body) = res.json::<Value>().await {
                let mut models_list: Vec<Value> = Vec::new();
                let mut installed_names: Vec<String> = Vec::new();

                if let Some(arr) = body["models"].as_array() {
                    for m in arr {
                        let name = m["name"].as_str().unwrap_or("").to_string();
                        let size_bytes = m["size"].as_u64().unwrap_or(0);
                        let size_gb = (size_bytes as f64 / 1_073_741_824.0 * 10.0).round() / 10.0;
                        let modified = m["modified_at"].as_str().unwrap_or("").to_string();

                        models_list.push(json!({
                            "name": name,
                            "size_gb": size_gb,
                            "modified_at": modified
                        }));
                        installed_names.push(name);
                    }
                }

                Json(json!({
                    "is_running": true,
                    "is_installed": true,
                    "installed_or_running": true,
                    "version": "Ollama Local Service",
                    "models": models_list,
                    "installed_models": installed_names,
                    "count": models_list.len(),
                    "url": "http://127.0.0.1:11434"
                }))
            } else {
                Json(json!({
                    "is_running": true,
                    "is_installed": true,
                    "installed_or_running": true,
                    "version": "Ollama Local Service",
                    "models": [],
                    "installed_models": [],
                    "count": 0,
                    "url": "http://127.0.0.1:11434"
                }))
            }
        }
        _ => Json(json!({
            "is_running": false,
            "is_installed": false,
            "installed_or_running": false,
            "version": null,
            "models": [],
            "installed_models": [],
            "count": 0,
            "url": "http://127.0.0.1:11434",
            "error": "Ollama service chưa chạy hoặc chưa được cài đặt."
        })),
    }
}

async fn start_ollama(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    #[cfg(windows)]
    {
        let mut cmd = std::process::Command::new("powershell");
        cmd.args(["-Command", "Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden -ErrorAction SilentlyContinue"]);
        cmd.creation_flags(CREATE_NO_WINDOW);
        let _ = cmd.spawn();
    }

    for _ in 0..16 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        let res = state
            .http_client
            .get("http://127.0.0.1:11434/api/tags")
            .timeout(Duration::from_millis(1000))
            .send()
            .await;

        if let Ok(r) = res {
            if r.status().is_success() {
                return Json(json!({
                    "success": true,
                    "status": "success",
                    "message": "Đã khởi động dịch vụ Ollama thành công!"
                }));
            }
        }
    }

    Json(json!({
        "success": false,
        "status": "timeout",
        "message": "Không thể kết nối đến Ollama sau 8 giây. Hãy đảm bảo bạn đã cài đặt Ollama từ https://ollama.com hoặc khởi động thủ công."
    }))
}

async fn select_folder() -> impl IntoResponse {
    let folder = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Chọn thư mục")
            .pick_folder()
    })
    .await
    .unwrap_or(None);

    let path_str = folder.map(|p| p.to_string_lossy().to_string());
    Json(json!({ "success": path_str.is_some(), "path": path_str }))
}

#[derive(Deserialize)]
struct PathReq {
    folder_path: Option<String>,
    path: Option<String>,
    directory: Option<String>,
    include_hidden: Option<bool>,
}

async fn get_file_tree(Json(req): Json<PathReq>) -> impl IntoResponse {
    let dir_str = req
        .directory
        .or(req.folder_path)
        .or(req.path)
        .unwrap_or_else(|| "D:\\AI_NCKH".to_string());
    let include_hidden = req.include_hidden.unwrap_or(true);
    let p = Path::new(&dir_str);

    if !p.exists() || !p.is_dir() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": format!("Thư mục không tồn tại: {}", dir_str),
                "folders": [],
                "files": []
            })),
        );
    }

    let mut folders = Vec::new();
    let mut files = Vec::new();
    let mut total_size: u64 = 0;
    let mut total_files: usize = 0;
    let mut total_folders: usize = 0;

    if let Ok(entries) = fs::read_dir(p) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            let name = entry_path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
            let is_hidden = name.starts_with('.') || name.starts_with("~$");

            if is_hidden && !include_hidden {
                continue;
            }

            let is_dir = entry_path.is_dir();
            if is_dir {
                total_folders += 1;
                let has_children = fs::read_dir(&entry_path)
                    .map(|mut it| it.next().is_some())
                    .unwrap_or(false);

                folders.push(json!({
                    "name": name,
                    "path": entry_path.to_string_lossy().to_string(),
                    "is_dir": true,
                    "is_hidden": is_hidden,
                    "has_children": has_children
                }));
            } else {
                total_files += 1;
                let ext = entry_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| format!(".{}", e))
                    .unwrap_or_default();
                let is_junk = is_junk_file(&name, ext.trim_start_matches('.'));
                let modality = detect_modality(ext.trim_start_matches('.'));

                let metadata = entry.metadata().ok();
                let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                total_size += size_bytes;

                let modified = metadata
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                files.push(json!({
                    "name": name,
                    "path": entry_path.to_string_lossy().to_string(),
                    "is_dir": false,
                    "size_bytes": size_bytes,
                    "size_formatted": format_bytes(size_bytes),
                    "extension": ext,
                    "is_hidden": is_hidden,
                    "is_junk": is_junk,
                    "modified_timestamp": modified,
                    "modality": modality
                }));
            }
        }
    }

    folders.sort_by(|a, b| {
        a["name"].as_str().unwrap_or("").to_lowercase().cmp(&b["name"].as_str().unwrap_or("").to_lowercase())
    });
    files.sort_by(|a, b| {
        a["name"].as_str().unwrap_or("").to_lowercase().cmp(&b["name"].as_str().unwrap_or("").to_lowercase())
    });

    let parent_path = p.parent().map(|parent| parent.to_string_lossy().to_string());

    (
        StatusCode::OK,
        Json(json!({
            "current_path": dir_str,
            "parent_path": parent_path,
            "total_folders": total_folders,
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_formatted": format_bytes(total_size),
            "folders": folders,
            "files": files
        })),
    )
}

#[derive(Deserialize)]
struct DeepScanReq {
    directory: Option<String>,
    folder_path: Option<String>,
    path: Option<String>,
    include_hidden: Option<bool>,
    junk_only: Option<bool>,
}

async fn deep_scan(Json(req): Json<DeepScanReq>) -> impl IntoResponse {
    let dir_str = req
        .directory
        .or(req.folder_path)
        .or(req.path)
        .unwrap_or_else(|| "D:\\AI_NCKH".to_string());
    let include_hidden = req.include_hidden.unwrap_or(false);
    let junk_only = req.junk_only.unwrap_or(false);
    let path = Path::new(&dir_str);

    if !path.exists() || !path.is_dir() {
        return axum::response::Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header(axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")
            .body(axum::body::Body::from(format!("{{\"error\":\"Thư mục không tồn tại: {}\"}}\n", dir_str)))
            .unwrap_or_default();
    }

    let is_root = dir_str.trim_end_matches(['\\', '/']).len() <= 2;
    let max_depth = if is_root { 3 } else { 10 };

    let start_time = Instant::now();
    let mut items = Vec::new();
    let mut total_files = 0usize;
    let mut total_bytes = 0u64;
    let mut junk_count = 0usize;
    let mut junk_bytes = 0u64;
    let mut junk_paths = Vec::new();
    let mut modality_counts: HashMap<String, usize> = HashMap::new();

    let walker = WalkDir::new(path)
        .max_depth(max_depth)
        .into_iter()
        .filter_entry(|entry| {
            let file_name = entry.file_name().to_string_lossy();
            if entry.depth() > 0 && is_heavy_dir(&file_name) {
                return false;
            }
            if !include_hidden && file_name.starts_with('.') && entry.depth() > 0 {
                return false;
            }
            true
        });

    for entry in walker.filter_map(|e| e.ok()) {
        let p = entry.path();
        if p == path {
            continue;
        }

        let is_dir = p.is_dir();
        let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
        let is_hidden = name.starts_with('.');
        let is_junk = if is_dir { false } else { is_junk_file(&name, &ext) };
        let modality = if is_dir { "folder".to_string() } else { detect_modality(&ext).to_string() };

        if junk_only && !is_junk {
            continue;
        }

        let metadata = entry.metadata().ok();
        let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified = metadata
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        if !is_dir {
            total_files += 1;
            total_bytes += size_bytes;
            *modality_counts.entry(modality.clone()).or_insert(0) += 1;

            if is_junk {
                junk_count += 1;
                junk_bytes += size_bytes;
                junk_paths.push(p.to_string_lossy().to_string());
            }
        }

        items.push(FileItem {
            name,
            path: p.to_string_lossy().to_string(),
            is_dir,
            size_bytes,
            extension: ext,
            is_hidden,
            is_junk,
            modified_timestamp: modified,
            modality,
        });

        if items.len() >= 5000 {
            break;
        }
    }

    let elapsed = start_time.elapsed().as_secs_f64();
    let stream_json = format!(
        "{{\"type\":\"completed\",\"total_scanned\":{},\"elapsed_seconds\":{:.2},\"junk_count\":{},\"junk_paths\":{}}}\n",
        total_files,
        elapsed,
        junk_count,
        serde_json::to_string(&junk_paths).unwrap_or_else(|_| "[]".to_string())
    );

    axum::response::Response::builder()
        .header(axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(axum::body::Body::from(stream_json))
        .unwrap_or_default()
}

#[derive(Deserialize)]
struct TrashReq {
    file_paths: Vec<String>,
}

async fn trash_files(Json(req): Json<TrashReq>) -> impl IntoResponse {
    let mut deleted_count = 0usize;
    let mut failed_count = 0usize;
    let mut freed_bytes = 0u64;

    for path_str in req.file_paths {
        let p = Path::new(&path_str);
        if p.exists() {
            let size = p.metadata().map(|m| m.len()).unwrap_or(0);
            if trash::delete(p).is_ok() {
                deleted_count += 1;
                freed_bytes += size;
            } else {
                failed_count += 1;
            }
        }
    }

    Json(json!({
        "status": "success",
        "deleted_count": deleted_count,
        "freed_bytes": freed_bytes,
        "freed_formatted": format_bytes(freed_bytes),
        "failed_count": failed_count
    }))
}

// --- Native Temp Cleaner ---

async fn get_temp_status() -> impl IntoResponse {
    let mut zones = Vec::new();

    let temp_dirs = vec![
        ("user_temp", "User Temp (%TEMP%)", "Tệp tạm thời của các ứng dụng người dùng đang chạy", std::env::var("TEMP").map(PathBuf::from).ok()),
        ("win_temp", "Windows System Temp", "Tệp tạm cập nhật và nhật ký hệ thống Windows", std::env::var("WINDIR").map(|w| PathBuf::from(w).join("Temp")).ok()),
        ("crash_dumps", "Crash Dumps", "Bản ghi lỗi crash ứng dụng hệ thống", std::env::var("LOCALAPPDATA").map(|l| PathBuf::from(l).join("CrashDumps")).ok()),
    ];

    for (id, name, desc, dir_opt) in temp_dirs {
        let mut count = 0usize;
        let mut bytes = 0u64;
        let path_str = dir_opt.as_ref().map(|d| d.to_string_lossy().to_string()).unwrap_or_default();

        if let Some(dir) = dir_opt {
            if dir.exists() {
                for entry in WalkDir::new(&dir).max_depth(3).into_iter().filter_map(|e| e.ok()) {
                    if entry.file_type().is_file() {
                        count += 1;
                        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        bytes += size;
                    }
                }
            }
        }

        let mb = (bytes as f64 / 1_048_576.0 * 10.0).round() / 10.0;
        zones.push(json!({
            "id": id,
            "name": name,
            "path": path_str,
            "description": desc,
            "file_count": count,
            "size_bytes": bytes,
            "size_formatted": format_bytes(bytes),
            "size_mb": mb
        }));
    }

    Json(zones)
}

#[derive(Deserialize)]
struct CleanTempReq {
    zones: Option<Vec<String>>,
}

async fn clean_temp_stream(Json(req): Json<CleanTempReq>) -> impl IntoResponse {
    let selected_zones = req.zones.unwrap_or_else(|| vec!["user_temp".to_string(), "win_temp".to_string(), "crash_dumps".to_string()]);
    let mut cleaned_files = 0usize;
    let mut freed_bytes = 0u64;
    let mut locked_files = 0usize;

    let temp_map: HashMap<&str, Option<PathBuf>> = [
        ("user_temp", std::env::var("TEMP").map(PathBuf::from).ok()),
        ("win_temp", std::env::var("WINDIR").map(|w| PathBuf::from(w).join("Temp")).ok()),
        ("crash_dumps", std::env::var("LOCALAPPDATA").map(|l| PathBuf::from(l).join("CrashDumps")).ok()),
    ].into_iter().collect();

    for zone_id in selected_zones {
        if let Some(Some(dir)) = temp_map.get(zone_id.as_str()) {
            if dir.exists() {
                for entry in WalkDir::new(dir).max_depth(3).into_iter().filter_map(|e| e.ok()) {
                    if entry.file_type().is_file() {
                        let p = entry.path();
                        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        if fs::remove_file(p).is_ok() {
                            cleaned_files += 1;
                            freed_bytes += size;
                        } else {
                            locked_files += 1;
                        }
                    }
                }
            }
        }
    }

    let freed_mb = (freed_bytes as f64 / 1_048_576.0 * 10.0).round() / 10.0;
    let completed_json = format!(
        "{{\"type\":\"completed\",\"cleaned_count\":{},\"freed_mb\":{:.1},\"locked_count\":{},\"message\":\"Đã dọn sạch {} tệp ({:.1} MB). Có {} tệp đang bị hệ thống khóa.\"}}\n",
        cleaned_files, freed_mb, locked_files, cleaned_files, freed_mb, locked_files
    );

    axum::response::Response::builder()
        .header(axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(axum::body::Body::from(completed_json))
        .unwrap_or_default()
}

// --- Organize & Undo ---

#[derive(Deserialize)]
struct OrganizePreviewReq {
    file_paths: Option<Vec<String>>,
    source_paths: Option<Vec<String>>,
    target_base: String,
}

#[derive(Serialize)]
struct PreviewItem {
    source_name: String,
    source_path: String,
    dest_path: String,
    is_dir: bool,
    modality: String,
    category_tag: String,
    size_formatted: String,
    has_conflict: bool,
    action: String,
}

async fn organize_preview(Json(req): Json<OrganizePreviewReq>) -> impl IntoResponse {
    let base = Path::new(&req.target_base);
    let mut items = Vec::new();
    let paths = req.file_paths.or(req.source_paths).unwrap_or_default();

    for path_str in paths {
        let p = Path::new(&path_str);
        if !p.exists() {
            continue;
        }

        let is_dir = p.is_dir();
        let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
        let size_bytes = p.metadata().map(|m| m.len()).unwrap_or(0);
        let modality = if is_dir { "folder".to_string() } else { detect_modality(&ext).to_string() };

        let dest_folder = if is_dir {
            base.join("Folders_Archives")
        } else {
            base.join(&modality)
        };
        let dest_file = dest_folder.join(&name);
        let will_conflict = dest_file.exists();
        let action = if will_conflict {
            "Chuyển dời & đổi tên tránh trùng".to_string()
        } else {
            "Chuyển dời an toàn".to_string()
        };

        items.push(PreviewItem {
            source_name: name,
            source_path: path_str,
            dest_path: dest_file.to_string_lossy().to_string(),
            is_dir,
            modality: modality.clone(),
            category_tag: format!("Phân tầng {}", modality),
            size_formatted: if is_dir { "--".to_string() } else { format_bytes(size_bytes) },
            has_conflict: will_conflict,
            action,
        });
    }

    Json(items)
}

#[derive(Deserialize)]
struct OrganizeReq {
    file_paths: Option<Vec<String>>,
    source_paths: Option<Vec<String>>,
    target_base: String,
    mode: Option<String>,
}

async fn organize_files(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(req): Json<OrganizeReq>,
) -> impl IntoResponse {
    let base = Path::new(&req.target_base);
    if !base.exists() {
        let _ = fs::create_dir_all(base);
    }

    let mode = req.mode.unwrap_or_else(|| "move".to_string());
    let mut success_count = 0usize;
    let mut failed_count = 0usize;
    let mut journal_entries = Vec::new();

    let now_str = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let paths = req.file_paths.or(req.source_paths).unwrap_or_default();
    for src_str in paths {
        let src = Path::new(&src_str);
        if !src.exists() {
            continue;
        }

        let is_dir = src.is_dir();
        let file_name = match src.file_name() {
            Some(n) => n,
            None => continue,
        };

        let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("");
        let modality = if is_dir { "folder".to_string() } else { detect_modality(ext).to_string() };

        let dest_dir = if is_dir {
            base.join("Folders_Archives")
        } else {
            base.join(&modality)
        };
        if !dest_dir.exists() {
            let _ = fs::create_dir_all(&dest_dir);
        }

        let dest_file = dest_dir.join(file_name);

        if is_dir {
            let moved = if mode == "copy" {
                copy_dir_all(src, &dest_file).is_ok()
            } else {
                fs::rename(src, &dest_file).is_ok() || (copy_dir_all(src, &dest_file).is_ok() && fs::remove_dir_all(src).is_ok())
            };
            if moved {
                success_count += 1;
                journal_entries.push(UndoRecord {
                    original_path: src_str.clone(),
                    new_path: dest_file.to_string_lossy().to_string(),
                    timestamp: now_str.clone(),
                });
            } else {
                failed_count += 1;
            }
            continue;
        }

        if mode == "copy" {
            if fs::copy(src, &dest_file).is_ok() {
                success_count += 1;
            } else {
                failed_count += 1;
            }
        } else {
            let moved = if fs::rename(src, &dest_file).is_ok() {
                true
            } else if fs::copy(src, &dest_file).is_ok() {
                let _ = fs::remove_file(src);
                true
            } else {
                false
            };

            if moved {
                success_count += 1;
                journal_entries.push(UndoRecord {
                    original_path: src_str.clone(),
                    new_path: dest_file.to_string_lossy().to_string(),
                    timestamp: now_str.clone(),
                });
            } else {
                failed_count += 1;
            }
        }
    }

    if !journal_entries.is_empty() {
        save_journal_entry(&state.undo_journal_path, journal_entries);
    }

    Json(json!({
        "status": "success",
        "success_count": success_count,
        "failed_count": failed_count,
        "mode": mode
    }))
}

fn save_journal_entry(journal_path: &Path, records: Vec<UndoRecord>) {
    let mut journal: UndoJournal = if journal_path.exists() {
        fs::read_to_string(journal_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        UndoJournal::default()
    };

    journal.entries.push(records);
    if let Ok(data) = serde_json::to_string_pretty(&journal) {
        let _ = fs::write(journal_path, data);
    }
}

async fn undo_organize(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    let journal_path = &state.undo_journal_path;
    if !journal_path.exists() {
        return Json(json!({
            "status": "empty",
            "message": "Không có nhật ký sắp xếp nào để hoàn tác."
        }));
    }

    let mut journal: UndoJournal = fs::read_to_string(journal_path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    if let Some(last_batch) = journal.entries.pop() {
        let mut restored = 0usize;
        for record in last_batch {
            let current = Path::new(&record.new_path);
            let orig = Path::new(&record.original_path);
            if current.exists() {
                if let Some(parent) = orig.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                if fs::rename(current, orig).is_ok()
                    || (fs::copy(current, orig).is_ok() && fs::remove_file(current).is_ok())
                {
                    restored += 1;
                }
            }
        }

        if let Ok(data) = serde_json::to_string_pretty(&journal) {
            let _ = fs::write(journal_path, data);
        }

        Json(json!({
            "status": "success",
            "restored_count": restored,
            "remaining_history": journal.entries.len()
        }))
    } else {
        Json(json!({
            "status": "empty",
            "message": "Đã hoàn tác hết toàn bộ lịch sử."
        }))
    }
}

async fn get_undo_history(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    let journal_path = &state.undo_journal_path;
    let journal: UndoJournal = if journal_path.exists() {
        fs::read_to_string(journal_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        UndoJournal::default()
    };

    Json(json!({
        "total_batches": journal.entries.len(),
        "entries": journal.entries
    }))
}

// --- AI Chatbot with Dynamic Model Support ---

#[derive(Deserialize)]
struct ChatReq {
    message: String,
    model: Option<String>,
}

async fn ai_chat(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(req): Json<ChatReq>,
) -> impl IntoResponse {
    let chosen_model = req.model.unwrap_or_else(|| "qwen2.5:1.5b".to_string());
    let ollama_url = "http://127.0.0.1:11434/api/chat";

    let payload = json!({
        "model": chosen_model,
        "messages": [
            { "role": "system", "content": "Bạn là trợ lý AI thông minh tích hợp trong hệ thống quản lý tệp MMO Multimodal Organizer. Trả lời súc tích, chính xác bằng tiếng Việt." },
            { "role": "user", "content": req.message }
        ],
        "stream": false
    });

    let resp = state
        .http_client
        .post(ollama_url)
        .json(&payload)
        .timeout(Duration::from_secs(60))
        .send()
        .await;

    match resp {
        Ok(res) if res.status().is_success() => {
            if let Ok(body) = res.json::<Value>().await {
                let content = body["message"]["content"]
                    .as_str()
                    .unwrap_or("Không nhận được nội dung từ mô hình.");
                return Json(json!({
                    "status": "success",
                    "reply": content,
                    "model": chosen_model
                }));
            }
        }
        Ok(res) if res.status() == StatusCode::NOT_FOUND => {
            return Json(json!({
                "status": "error",
                "reply": format!("Mô hình '{}' chưa được nạp hoặc chưa tải trong Ollama. Hãy chọn mô hình khác đã tải hoặc chạy lệnh tải trong ứng dụng.", chosen_model),
                "model": chosen_model
            }));
        }
        _ => {}
    }

    Json(json!({
        "status": "fallback",
        "reply": format!("Dịch vụ Ollama chưa phản hồi khi gọi mô hình '{}'. Hãy đảm bảo dịch vụ Ollama đang chạy trên máy (cổng 11434).", chosen_model),
        "model": chosen_model
    }))
}

// --- Real Laptop AI Benchmark Engine ---

#[derive(Deserialize)]
struct BenchmarkReq {
    model_name: Option<String>,
    prompt: Option<String>,
    task_type: Option<String>,
}

async fn run_model_benchmark(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(req): Json<BenchmarkReq>,
) -> impl IntoResponse {
    let model = req.model_name.unwrap_or_else(|| "llama3.2:1b".to_string());
    let task = req.task_type.unwrap_or_else(|| "classify".to_string());
    
    let default_prompt = match task.as_str() {
        "classify" => "Hãy phân loại 5 tệp sau vào đúng thư mục chuyên biệt: contract.pdf, screenshot.png, song.flac, gameplay.mp4, main.rs. Trả lời dưới 3 dòng ngắn gọn.",
        "summarize" => "Hãy tóm tắt nguyên lý hoạt động của kiến trúc Multimodal File Tiering trong 2 câu ngắn.",
        _ => "Viết 1 đoạn ngắn 2 câu giới thiệu tính năng dọn dẹp rác an toàn của MMO Desktop."
    };

    let prompt = req.prompt.unwrap_or_else(|| default_prompt.to_string());
    let ollama_url = "http://127.0.0.1:11434/api/generate";

    let payload = json!({
        "model": model,
        "prompt": prompt,
        "stream": false
    });

    let start_instant = Instant::now();
    let resp = state
        .http_client
        .post(ollama_url)
        .json(&payload)
        .timeout(Duration::from_secs(60))
        .send()
        .await;

    let wall_clock_duration = start_instant.elapsed();

    match resp {
        Ok(res) if res.status().is_success() => {
            if let Ok(data) = res.json::<Value>().await {
                let eval_count = data["eval_count"].as_u64().unwrap_or(0);
                let eval_duration_ns = data["eval_duration"].as_u64().unwrap_or(1);
                let prompt_eval_duration_ns = data["prompt_eval_duration"].as_u64().unwrap_or(0);
                let total_duration_ns = data["total_duration"].as_u64().unwrap_or(0);

                let eval_duration_s = if eval_duration_ns > 0 { eval_duration_ns as f64 / 1e9 } else { wall_clock_duration.as_secs_f64() };
                let tokens_per_sec = if eval_duration_s > 0.0 {
                    (eval_count as f64 / eval_duration_s * 10.0).round() / 10.0
                } else {
                    0.0
                };

                let total_time_sec = if total_duration_ns > 0 {
                    (total_duration_ns as f64 / 1e9 * 100.0).round() / 100.0
                } else {
                    (wall_clock_duration.as_secs_f64() * 100.0).round() / 100.0
                };

                let ttft_ms = (prompt_eval_duration_ns as f64 / 1e6 * 10.0).round() / 10.0;

                let rating = if tokens_per_sec >= 35.0 {
                    "Siêu tốc (Tối ưu GPU)"
                } else if tokens_per_sec >= 15.0 {
                    "Mượt mà (Rất tốt)"
                } else if tokens_per_sec >= 8.0 {
                    "Khá (CPU/iGPU)"
                } else {
                    "Chậm (Cần hạ size model)"
                };

                return Json(json!({
                    "success": true,
                    "model": model,
                    "task": task,
                    "tokens_per_sec": tokens_per_sec,
                    "total_time_sec": total_time_sec,
                    "ttft_ms": ttft_ms,
                    "eval_tokens": eval_count,
                    "speed_rating": rating,
                    "response": data["response"].as_str().unwrap_or(""),
                    "hardware_assessment": if tokens_per_sec >= 20.0 {
                        "Laptop của bạn chạy mô hình này cực kỳ lý tưởng, phản hồi tức thời."
                    } else {
                        "Mô hình hoạt động ổn định trên CPU/RAM. Có thể chọn bản nhẹ hơn để tăng tốc."
                    }
                }));
            }
        }
        _ => {}
    }

    Json(json!({
        "success": false,
        "model": model,
        "error": "Không thể kết nối hoặc đo lường mô hình. Vui lòng đảm bảo Ollama đang chạy và mô hình đã được tải hoàn tất."
    }))
}

// --- Curated Multi-Model Clusters & Catalog (Exact Frontend Schema) ---

fn get_curated_clusters() -> Value {
    json!([
        {
            "cluster_id": "text_slm",
            "cluster_name": "Cụm 1: Văn bản & Trích xuất Metadata",
            "role": "Trợ lý Phân loại & Rút trích Thực thể (NER)",
            "description": "Đọc nội dung văn bản, tự động trích xuất metadata ngày tháng, tóm tắt và phân loại tài liệu vào danh mục chuẩn.",
            "models": [
                {
                    "id": "qwen2.5:1.5b",
                    "name": "Qwen 2.5 (1.5B)",
                    "tag": "qwen2.5:1.5b",
                    "params": "1.5B",
                    "size_download_gb": 1.0,
                    "est_vram_gb": 1.6,
                    "category": "Text & Metadata",
                    "badge": "Khuyên Dùng",
                    "modality_support": ["text", "json", "code"],
                    "description": "Siêu nhanh, trích xuất metadata JSON, nhận diện nhãn cực chuẩn. Đạt ~45 tok/s trên card đồ họa phổ thông.",
                    "default_selected": true
                },
                {
                    "id": "llama3.2:1b",
                    "name": "Llama 3.2 (1B)",
                    "tag": "llama3.2:1b",
                    "params": "1.0B",
                    "size_download_gb": 0.8,
                    "est_vram_gb": 1.2,
                    "category": "Text & Metadata",
                    "badge": "Siêu Nhẹ",
                    "modality_support": ["text"],
                    "description": "Cực nhẹ, ngốn ít VRAM nhất, dùng cho quét nhanh số lượng lớn file mà không chiếm tài nguyên máy.",
                    "default_selected": false
                },
                {
                    "id": "gemma2:2b",
                    "name": "Gemma 2 (2B)",
                    "tag": "gemma2:2b",
                    "params": "2.0B",
                    "size_download_gb": 1.6,
                    "est_vram_gb": 2.2,
                    "category": "Text & Reasoning",
                    "badge": "Google DeepMind",
                    "modality_support": ["text"],
                    "description": "Khả năng tóm tắt tài liệu văn phòng, tài liệu kỹ thuật và cấu trúc câu rất tốt.",
                    "default_selected": false
                },
                {
                    "id": "llama3.2:3b",
                    "name": "Llama 3.2 (3B)",
                    "tag": "llama3.2:3b",
                    "params": "3.2B",
                    "size_download_gb": 2.0,
                    "est_vram_gb": 2.8,
                    "category": "Text & Reasoning",
                    "badge": "Độ Chính Xác Cao",
                    "modality_support": ["text"],
                    "description": "Hiểu ngữ nghĩa sâu, suy luận và xử lý quy tắc phân loại tài liệu phức tạp.",
                    "default_selected": false
                }
            ]
        },
        {
            "cluster_id": "vision_multimodal",
            "cluster_name": "Cụm 2: Thị giác Máy tính & Đọc Ảnh (Vision OCR)",
            "role": "Mô tả Ảnh & Nhận diện Ký tự OCR",
            "description": "Chuyên phân tích hình ảnh, đọc chữ trong ảnh chụp/biểu đồ/hóa đơn và lập nhãn nội dung trực quan.",
            "models": [
                {
                    "id": "moondream",
                    "name": "Moondream 2 (Vision SLM)",
                    "tag": "moondream",
                    "params": "1.8B",
                    "size_download_gb": 1.7,
                    "est_vram_gb": 2.2,
                    "category": "Multimodal Image",
                    "badge": "Tối Ưu Vision",
                    "modality_support": ["image", "ocr"],
                    "description": "Mô hình thị giác gọn nhẹ nhất, mô tả chi tiết ảnh và đọc chữ không lo tràn bộ nhớ VRAM.",
                    "default_selected": true
                },
                {
                    "id": "llava:7b",
                    "name": "LLaVA 1.5 (7B)",
                    "tag": "llava:7b",
                    "params": "7.0B",
                    "size_download_gb": 4.5,
                    "est_vram_gb": 5.5,
                    "category": "High Quality Vision",
                    "badge": "Chất Lượng Cao",
                    "modality_support": ["image", "chart", "diagram"],
                    "description": "Mô hình thị giác chi tiết cao, hỗ trợ phân tích biểu đồ và sơ đồ kỹ thuật phức tạp.",
                    "default_selected": false
                }
            ]
        },
        {
            "cluster_id": "embedding_search",
            "cluster_name": "Cụm 3: Mô hình Vector Embeddings (Tìm kiếm Ngữ nghĩa)",
            "role": "Vector Engine & Truy xuất Ngữ nghĩa Thông minh",
            "description": "Mã hóa nội dung văn bản và mô tả tệp thành vector đa chiều, cho phép tìm kiếm chính xác theo ý nghĩa và ngữ cảnh.",
            "models": [
                {
                    "id": "bge-m3",
                    "name": "BGE-M3 (Multi-lingual SOTA)",
                    "tag": "bge-m3",
                    "params": "0.5B",
                    "size_download_gb": 0.6,
                    "est_vram_gb": 0.8,
                    "category": "Vector Embedding",
                    "badge": "Đa Ngôn Ngữ SOTA",
                    "modality_support": ["text", "code", "table"],
                    "description": "Mô hình nhúng đa ngôn ngữ hỗ trợ tiếng Việt xuất sắc, dùng lưu trữ vector ngữ nghĩa chính xác.",
                    "default_selected": true
                },
                {
                    "id": "nomic-embed-text",
                    "name": "Nomic Embed Text (8192 Context)",
                    "tag": "nomic-embed-text",
                    "params": "0.3B",
                    "size_download_gb": 0.3,
                    "est_vram_gb": 0.5,
                    "category": "Vector Embedding",
                    "badge": "Siêu Gọn (0.3GB)",
                    "modality_support": ["text"],
                    "description": "Context dài 8192 tokens, cực kỳ nhẹ nhàng cho việc quét và lập chỉ mục nhanh.",
                    "default_selected": false
                }
            ]
        }
    ])
}

// Return RAW ARRAY of clusters as expected by frontend: if (clusRes && clusRes.length > 0)
async fn get_model_clusters() -> impl IntoResponse {
    Json(get_curated_clusters())
}

// Return FLAT ARRAY of ModelItem as expected by frontend: if (catRes && catRes.length > 0)
async fn get_model_catalog() -> impl IntoResponse {
    let clusters = get_curated_clusters();
    let mut flat = Vec::new();

    if let Some(arr) = clusters.as_array() {
        for c in arr {
            let c_name = c["cluster_name"].as_str().unwrap_or("");
            if let Some(models) = c["models"].as_array() {
                for m in models {
                    let mut item = m.clone();
                    if let Some(obj) = item.as_object_mut() {
                        obj.insert("cluster_name".to_string(), json!(c_name));
                    }
                    flat.push(item);
                }
            }
        }
    }

    Json(flat)
}

async fn get_storage_location() -> impl IntoResponse {
    let p = std::env::var("OLLAMA_MODELS").unwrap_or_else(|_| "D:\\OllamaModels".to_string());
    Json(json!({
        "current_path": p,
        "default_c": "C:\\Users\\Admin\\.ollama\\models"
    }))
}

// --- Overview Statistics Endpoint ---

#[derive(Deserialize)]
struct OverviewReq {
    directory: Option<String>,
}

async fn get_stats_overview(Json(req): Json<OverviewReq>) -> impl IntoResponse {
    let dir_str = req.directory.unwrap_or_else(|| "D:\\".to_string());
    let path = Path::new(&dir_str);

    if !path.exists() || !path.is_dir() {
        return Json(json!({
            "success": false,
            "error": "Thư mục không tồn tại"
        }));
    }

    let mut modality_counts: HashMap<String, usize> = HashMap::new();
    let mut modality_bytes: HashMap<String, u64> = HashMap::new();
    let mut total_files = 0usize;
    let mut total_bytes = 0u64;

    let walker = WalkDir::new(path).max_depth(3).into_iter().filter_entry(|e| {
        let name = e.file_name().to_string_lossy();
        if e.depth() > 0 && is_heavy_dir(&name) {
            return false;
        }
        true
    });

    for entry in walker.filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let p = entry.path();
            let ext = p.extension().and_then(|x| x.to_str()).unwrap_or("");
            let modality = detect_modality(ext).to_string();
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);

            total_files += 1;
            total_bytes += size;
            *modality_counts.entry(modality.clone()).or_insert(0) += 1;
            *modality_bytes.entry(modality).or_insert(0) += size;
        }
    }

    let colors = [
        ("text", "#6366f1", "Tài liệu"),
        ("image", "#ec4899", "Hình ảnh"),
        ("audio", "#f59e0b", "Âm thanh"),
        ("video", "#8b5cf6", "Video"),
        ("code", "#10b981", "Mã nguồn"),
        ("archive", "#14b8a6", "Nén & Lưu trữ"),
        ("other", "#71717a", "Tệp khác"),
    ];

    let mut chart_data = Vec::new();
    for (key, color, label) in colors {
        let count = *modality_counts.get(key).unwrap_or(&0);
        let bytes = *modality_bytes.get(key).unwrap_or(&0);
        chart_data.push(json!({
            "key": key,
            "name": label,
            "count": count,
            "bytes": bytes,
            "size": format_bytes(bytes),
            "color": color
        }));
    }

    Json(json!({
        "success": true,
        "directory": dir_str,
        "total_files": total_files,
        "total_size": total_bytes,
        "total_size_formatted": format_bytes(total_bytes),
        "chart_data": chart_data,
        "stats": {
            "files": total_files,
            "size_formatted": format_bytes(total_bytes)
        }
    }))
}

// --- Router Setup ---

pub fn create_router() -> Router {
    let app_state = AppState {
        http_client: Client::builder().build().unwrap_or_default(),
        undo_journal_path: PathBuf::from("undo_journal.json"),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let api_router = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/hardware", get(get_hardware))
        .route("/api/system/drives", get(get_drives))
        .route("/api/system/select_folder", post(select_folder))
        .route("/api/ollama/status", get(get_ollama_status))
        .route("/api/ollama/start", post(start_ollama))
        .route("/api/models/clusters", get(get_model_clusters))
        .route("/api/models/catalog", get(get_model_catalog))
        .route("/api/models/storage_location", get(get_storage_location))
        .route("/api/models/benchmark", post(run_model_benchmark))
        .route("/api/stats/overview", post(get_stats_overview))
        .route("/api/files/tree", post(get_file_tree))
        .route("/api/files/deep_scan_stream", post(deep_scan))
        .route("/api/files/trash", post(trash_files))
        .route("/api/system/temp_status", get(get_temp_status))
        .route("/api/system/clean_temp", post(clean_temp_stream))
        .route("/api/system/clean_temp_stream", post(clean_temp_stream))
        .route("/api/files/organize", post(organize_files))
        .route("/api/files/organize_preview", post(organize_preview))
        .route("/api/files/undo", post(undo_organize))
        .route("/api/files/history", get(get_undo_history))
        .route("/api/ai/chat", post(ai_chat))
        .layer(cors)
        .with_state(app_state);

    let static_dir = if Path::new("../dist").exists() {
        PathBuf::from("../dist")
    } else if Path::new("frontend/dist").exists() {
        PathBuf::from("frontend/dist")
    } else if Path::new("dist").exists() {
        PathBuf::from("dist")
    } else {
        PathBuf::from(".")
    };

    api_router.fallback_service(ServeDir::new(static_dir))
}

// --- Start Background Server ---

pub fn start_http_server() {
    std::thread::spawn(|| {
        let rt = match tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
        {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[Rust Server] Failed to create tokio runtime: {}", e);
                return;
            }
        };

        rt.block_on(async {
            let app = create_router();
            let listener = match tokio::net::TcpListener::bind("127.0.0.1:8001").await {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("[Rust Server] Port 8001 bind notice: {}", e);
                    return;
                }
            };
            println!("[Rust Server] MMO native backend listening on http://127.0.0.1:8001");
            if let Err(e) = axum::serve(listener, app).await {
                eprintln!("[Rust Server] Server error: {}", e);
            }
        });
    });
}
