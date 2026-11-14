pub mod server;

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
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
    pub modality: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizeRule {
    pub target_folder: String,
    pub template: String,
    pub is_copy: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizeResult {
    pub success_count: usize,
    pub failed_count: usize,
    pub moved_files: Vec<(String, String)>,
}

pub mod commands {
    use super::*;

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
            let modality = if is_dir { "folder".to_string() } else { server::detect_modality(&ext).to_string() };
            let is_junk = if is_dir { false } else { server::is_junk_file(&file_name, &ext) };

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

    #[tauri::command]
    pub fn organize_files_safe(
        file_paths: Vec<String>,
        target_base: String,
        mode: String,
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
            let modality = server::detect_modality(ext);

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
                if fs::rename(src, &dest_file).is_ok() {
                    success_count += 1;
                    moved_files.push((src_str, dest_file.to_string_lossy().to_string()));
                } else if fs::copy(src, &dest_file).is_ok() {
                    let _ = fs::remove_file(src);
                    success_count += 1;
                    moved_files.push((src_str, dest_file.to_string_lossy().to_string()));
                } else {
                    failed_count += 1;
                }
            }
        }

        Ok(OrganizeResult {
            success_count,
            failed_count,
            moved_files,
        })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 1. Start embedded Axum server on http://127.0.0.1:8001
    server::start_http_server();

    // 2. Launch Tauri Desktop UI
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::scan_directory,
            commands::safe_delete_to_trash,
            commands::organize_files_safe
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
