import os
import shutil
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
import send2trash

def detect_modality(ext: str) -> str:
    ext = ext.lower().lstrip(".")
    if ext in ["txt", "md", "pdf", "doc", "docx", "csv", "xlsx", "json", "log", "xml", "pptx"]:
        return "text"
    elif ext in ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "tiff", "ico"]:
        return "image"
    elif ext in ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"]:
        return "audio"
    elif ext in ["mp4", "mkv", "avi", "mov", "webm", "wmv", "flv"]:
        return "video"
    return "other"

def is_junk_file(name: str, ext: str) -> bool:
    name_lower = name.lower()
    ext_lower = ext.lower().lstrip(".")
    junk_exts = {"tmp", "temp", "log", "bak", "dmp", "old", "cache", "crdownload", "part", "chk"}
    if ext_lower in junk_exts:
        return True
    if name_lower in ["thumbs.db", ".ds_store", "desktop.ini"] or name_lower.startswith("~$"):
        return True
    return False

def format_bytes(b: int) -> str:
    if b < 1024:
        return f"{b} B"
    elif b < 1024**2:
        return f"{b/1024:.1f} KB"
    elif b < 1024**3:
        return f"{b/(1024**2):.1f} MB"
    return f"{b/(1024**3):.2f} GB"

# Tree Node Data Structure (Explorer Tree without flattening everything)
def scan_directory_tree(
    target_path: str,
    include_hidden: bool = True,
    max_depth: int = 1
) -> Dict[str, Any]:
    """
    Scans a single folder level for Explorer Tree navigation.
    Returns directories and files inside target_path cleanly.
    """
    p = Path(target_path)
    if not p.exists() or not p.is_dir():
        return {"error": "Thư mục không tồn tại", "folders": [], "files": []}

    folders = []
    files = []
    total_size = 0
    total_files = 0
    total_folders = 0

    try:
        with os.scandir(target_path) as it:
            for entry in it:
                name = entry.name
                is_hidden = name.startswith(".") or name.startswith("~$")
                if is_hidden and not include_hidden:
                    continue

                full_path = entry.path

                if entry.is_dir(follow_symlinks=False):
                    total_folders += 1
                    # Quick check if it has children
                    has_children = False
                    try:
                        with os.scandir(full_path) as sub_it:
                            has_children = any(True for _ in sub_it)
                    except:
                        pass

                    folders.append({
                        "name": name,
                        "path": full_path,
                        "is_dir": True,
                        "is_hidden": is_hidden,
                        "has_children": has_children
                    })
                elif entry.is_file(follow_symlinks=False):
                    total_files += 1
                    try:
                        stat = entry.stat()
                        size = stat.st_size
                        modified = int(stat.st_mtime)
                    except:
                        size = 0
                        modified = 0

                    total_size += size
                    ext = Path(name).suffix.lower()
                    modality = detect_modality(ext)
                    is_junk = is_junk_file(name, ext)

                    files.append({
                        "name": name,
                        "path": full_path,
                        "is_dir": False,
                        "size_bytes": size,
                        "size_formatted": format_bytes(size),
                        "extension": ext,
                        "is_hidden": is_hidden,
                        "is_junk": is_junk,
                        "modified_timestamp": modified,
                        "modality": modality
                    })
    except Exception as e:
        return {"error": str(e), "folders": [], "files": []}

    # Sort: folders first, then files by name
    folders.sort(key=lambda x: x["name"].lower())
    files.sort(key=lambda x: x["name"].lower())

    return {
        "current_path": str(p.resolve()),
        "parent_path": str(p.parent.resolve()) if p.parent != p else None,
        "total_folders": total_folders,
        "total_files": total_files,
        "total_size_bytes": total_size,
        "total_size_formatted": format_bytes(total_size),
        "folders": folders,
        "files": files
    }

def safe_clean_trash(file_paths: List[str]) -> Dict[str, Any]:
    cleaned = []
    failed = []
    for fp in file_paths:
        try:
            if os.path.exists(fp):
                send2trash.send2trash(fp)
                cleaned.append(fp)
        except Exception as e:
            failed.append({"path": fp, "error": str(e)})

    return {
        "success": True,
        "cleaned_count": len(cleaned),
        "failed_count": len(failed),
        "cleaned_files": cleaned,
        "failed_files": failed
    }

def organize_files_safe(file_paths: List[str], target_base_dir: str, mode: str = "copy") -> Dict[str, Any]:
    target_base = Path(target_base_dir)
    target_base.mkdir(parents=True, exist_ok=True)

    moved = []
    failed = []

    for src_path in file_paths:
        src = Path(src_path)
        if not src.is_file():
            continue

        modality = detect_modality(src.suffix)
        dest_folder = target_base / modality
        dest_folder.mkdir(parents=True, exist_ok=True)

        dest_file = dest_folder / src.name
        counter = 1
        while dest_file.exists():
            dest_file = dest_folder / f"{src.stem}_{counter}{src.suffix}"
            counter += 1

        try:
            if mode == "copy":
                shutil.copy2(src, dest_file)
            else:
                shutil.move(src, dest_file)
            moved.append({
                "from": str(src),
                "to": str(dest_file),
                "modality": modality
            })
        except Exception as e:
            failed.append({"path": str(src), "error": str(e)})

    return {
        "success": True,
        "mode": mode,
        "success_count": len(moved),
        "failed_count": len(failed),
        "items": moved
    }
