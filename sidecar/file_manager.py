import os
import shutil
from pathlib import Path
from typing import List, Dict, Any
import send2trash

def detect_modality(ext: str) -> str:
    ext = ext.lower().lstrip(".")
    if ext in ["txt", "md", "pdf", "doc", "docx", "csv", "xlsx", "json", "log", "xml"]:
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
    junk_exts = {"tmp", "temp", "log", "bak", "dmp", "old", "cache", "crdownload", "part"}
    if ext_lower in junk_exts:
        return True
    if name_lower in ["thumbs.db", ".ds_store", "desktop.ini"] or name_lower.startswith("~$"):
        return True
    return False

def scan_files(directory: str, include_hidden: bool = True) -> List[Dict[str, Any]]:
    results = []
    p = Path(directory)
    if not p.exists() or not p.is_dir():
        return results

    try:
        for entry in p.rglob("*"):
            try:
                name = entry.name
                is_hidden = name.startswith(".") or (entry.is_file() and name.startswith("~$"))
                if is_hidden and not include_hidden:
                    continue

                is_dir = entry.is_dir()
                ext = entry.suffix.lower()
                modality = "folder" if is_dir else detect_modality(ext)
                is_junk = False if is_dir else is_junk_file(name, ext)

                stat = entry.stat()
                size_bytes = 0 if is_dir else stat.st_size
                modified = int(stat.st_mtime)

                results.append({
                    "name": name,
                    "path": str(entry.resolve()),
                    "is_dir": is_dir,
                    "size_bytes": size_bytes,
                    "size_formatted": format_bytes(size_bytes),
                    "extension": ext,
                    "is_hidden": is_hidden,
                    "is_junk": is_junk,
                    "modified_timestamp": modified,
                    "modality": modality
                })
            except Exception:
                continue
    except Exception:
        pass

    return results

def format_bytes(b: int) -> str:
    if b < 1024:
        return f"{b} B"
    elif b < 1024**2:
        return f"{b/1024:.1f} KB"
    elif b < 1024**3:
        return f"{b/(1024**2):.1f} MB"
    return f"{b/(1024**3):.2f} GB"

def safe_clean_trash(file_paths: List[str]) -> Dict[str, Any]:
    """Safe clean: Moves files to Windows Recycle Bin so user can undo / restore anytime"""
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
    """Organize safely according to Phase 3 Polyglot Storage Architecture"""
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
        # Conflict resolution: rename if exists
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
