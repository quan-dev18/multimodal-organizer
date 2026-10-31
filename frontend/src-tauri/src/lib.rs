use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub extension: String,
    pub is_hidden: bool,
    pub is_junk: bool,
    pub modified_timestamp: u64,
    pub modality: String, // text, image, audio, video, other
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizeRule {
    pub target_folder: String,
    pub template: String, // e.g. "{modality}/{year}/{month}"
    pub is_copy: bool,    // true = copy with verify, false = move
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizeResult {
    pub success_count: usize,
    pub failed_count: usize,
    pub moved_files: Vec<(String, String)>, // (old_path, new_path)
}

// Detect modality based on file extension
fn detect_modality(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "txt" | "md" | "pdf" | "doc" | "docx" | "csv" | "xlsx" | "json" | "log" => "text",
        "jpg" | "jpeg" | "png" | "webp" | "gif" | "svg" | "bmp" | "tiff" => "image",
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" => "audio",
        "mp4" | "mkv" | "avi" | "mov" | "webm" | "wmv" => "video",
        _ => "other",
    }
}

// Detect junk file extensions / patterns
fn is_junk_file(name: &str, ext: &str) -> bool {
    let lower_name = name.to_lowercase();
    let lower_ext = ext.to_lowercase();
    
    matches!(
        lower_ext.as_str(),
        "tmp" | "temp" | "log" | "bak" | "dmp" | "old" | "cache" | "crdownload" | "part"
    ) || lower_name == "thumbs.db"
      || lower_name == ".ds_store"
      || lower_name.starts_with("~$")
}

// 1. Scan folder including hidden & junk files
#[tauri::command]
pub fn scan_directory(dir_path: String, include_hidden: bool) -> Result<Vec<FileItem>, String> {
    let path = Path::new(&dir_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Thư mục không tồn tại: {}", dir_path));
    }

    let mut items = Vec::new();

    for entry in WalkDir::new(path).max_depth(2).into_iter().filter_map(|e| e.ok()) {
        let entry_path = entry.path();
        if entry_path == path {
            continue;
        }

        let file_name = entry_path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let is_hidden = file_name.starts_with('.');
        if is_hidden && !include_hidden {
            continue;
        }

        let is_dir = entry_path.is_dir();
        let ext = entry_path.extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
        let modality = if is_dir { "folder".to_string() } else { detect_modality(&ext).to_string() };
        let is_junk = if is_dir { false } else { is_junk_file(&file_name, &ext) };

        let metadata = entry_path.metadata().ok();
        let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified_timestamp = metadata
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        items.push(FileItem {
            name: file_name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            size_bytes,
            extension: ext,
            is_hidden,
            is_junk,
            modified_timestamp,
            modality,
        });
    }

    Ok(items)
}

// 2. Safe Trash Cleanup (Moves junk/trash files to Windows Recycle Bin)
#[tauri::command]
pub fn safe_delete_to_trash(file_paths: Vec<String>) -> Result<usize, String> {
    let mut deleted = 0;
    for file_path in file_paths {
        let p = Path::new(&file_path);
        if p.exists() {
            if let Err(e) = trash::delete(p) {
                return Err(format!("Lỗi khi dọn dẹp {}: {}", file_path, e));
            }
            deleted += 1;
        }
    }
    Ok(deleted)
}

// 3. Safe Organize (Move/Copy with directory structure according to modality)
#[tauri::command]
pub fn organize_files_safe(
    file_paths: Vec<String>,
    target_base: String,
    mode: String, // "copy" or "move"
) -> Result<OrganizeResult, String> {
    let base = Path::new(&target_base);
    if !base.exists() {
        fs::create_dir_all(base).map_err(|e| format!("Không tạo được thư mục đích: {}", e))?;
    }

    let mut success_count = 0;
    let mut failed_count = 0;
    let mut moved_files = Vec::new();

    for src_str in file_paths {
        let src = Path::new(&src_str);
        if !src.is_file() {
            continue;
        }

        let file_name = match src.file_name() {
            Some(n) => n,
            None => continue,
        };

        let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("");
        let modality = detect_modality(ext);

        // Subfolder based on modality (Architecture Polyglot Storage L6)
        let dest_dir = base.join(modality);
        if !dest_dir.exists() {
            let _ = fs::create_dir_all(&dest_dir);
        }

        let dest_file = dest_dir.join(file_name);

        if mode == "copy" {
            if fs::copy(src, &dest_file).is_ok() {
                success_count += 1;
                moved_files.push((src_str, dest_file.to_string_lossy().to_string()));
            } else {
                failed_count += 1;
            }
        } else {
            // Move file
            if fs::rename(src, &dest_file).is_ok() {
                success_count += 1;
                moved_files.push((src_str, dest_file.to_string_lossy().to_string()));
            } else {
                // If across drive, copy then remove
                if fs::copy(src, &dest_file).is_ok() {
                    let _ = fs::remove_file(src);
                    success_count += 1;
                    moved_files.push((src_str, dest_file.to_string_lossy().to_string()));
                } else {
                    failed_count += 1;
                }
            }
        }
    }

    Ok(OrganizeResult {
        success_count,
        failed_count,
        moved_files,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            safe_delete_to_trash,
            organize_files_safe
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
