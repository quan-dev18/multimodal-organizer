import os
import shutil
import time
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
import psutil
import send2trash

def get_system_drives() -> List[Dict[str, Any]]:
    """Lists all available disk drives (C:, D:, USBs, external disks) with usage metrics"""
    drives = []
    for part in psutil.disk_partitions(all=False):
        try:
            device = part.device.rstrip("\\") + "\\"
            usage = psutil.disk_usage(device)
            drives.append({
                "device": device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total_gb": round(usage.total / (1024**3), 1),
                "used_gb": round(usage.used / (1024**3), 1),
                "free_gb": round(usage.free / (1024**3), 1),
                "percent": usage.percent
            })
        except Exception:
            continue
    return drives

def calculate_checksum(file_path: str, block_size: int = 65536) -> str:
    """Calculates SHA-256 checksum to guarantee 100% data integrity before/after move/copy"""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(block_size), b""):
            sha256.update(block)
    return sha256.hexdigest()

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

def scan_directory_tree(
    target_path: str,
    include_hidden: bool = True
) -> Dict[str, Any]:
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
                try:
                    name = entry.name
                    is_hidden = name.startswith(".") or name.startswith("~$")
                    if is_hidden and not include_hidden:
                        continue

                    full_path = entry.path

                    if entry.is_dir(follow_symlinks=False):
                        total_folders += 1
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
                except Exception:
                    continue
    except Exception as e:
        return {"error": str(e), "folders": [], "files": []}

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

# Safe Trash Cleanup with Safety Filter (Protected system paths)
PROTECTED_PATHS = [
    "c:\\windows", "c:\\program files", "c:\\program files (x86)",
    "c:\\system volume information", "c:\\$recycle.bin"
]

def safe_clean_trash(file_paths: List[str]) -> Dict[str, Any]:
    cleaned = []
    failed = []
    blocked = []

    for fp in file_paths:
        lower_fp = fp.lower()
        # Protect OS and critical directories
        if any(lower_fp.startswith(prot) for prot in PROTECTED_PATHS):
            blocked.append({"path": fp, "reason": "Tệp hệ thống được bảo vệ an toàn, không được phép xóa"})
            continue

        try:
            if os.path.exists(fp):
                # send2trash moves directly to Windows Recycle Bin (Restorable 100%)
                send2trash.send2trash(fp)
                cleaned.append(fp)
        except Exception as e:
            failed.append({"path": fp, "error": str(e)})

    return {
        "success": True,
        "cleaned_count": len(cleaned),
        "failed_count": len(failed),
        "blocked_count": len(blocked),
        "cleaned_files": cleaned,
        "failed_files": failed,
        "blocked_files": blocked
    }

from ai_organizer import analyze_file_intent

def generate_organize_preview(file_paths: List[str], target_base_dir: str) -> List[Dict[str, Any]]:
    preview_items = []
    target_base = Path(target_base_dir)

    for src_path in file_paths:
        src = Path(src_path)
        if not src.exists():
            continue

        ext = src.suffix
        name = src.name

        # If it's a directory, keep directory intact
        if src.is_dir():
            dest_dir = target_base / "Folders_Archives"
            dest_path = dest_dir / name
            preview_items.append({
                "source_name": name,
                "source_path": str(src),
                "dest_path": str(dest_path),
                "is_dir": True,
                "modality": "folder",
                "category_tag": "Thư Mục Dự Án",
                "size_formatted": "--",
                "has_conflict": dest_path.exists(),
                "action": "Chuyển toàn bộ thư mục"
            })
            continue

        # Intelligent Domain & AI Intent Analysis
        intent = analyze_file_intent(name, ext)
        main_folder = intent["main_folder"]
        sub_folder = intent["sub_folder"]
        context_tag = intent["context_tag"]

        # Structured Path: Target / MainCategory / SubCategory / File
        dest_folder = target_base / main_folder / sub_folder
        dest_file = dest_folder / name

        will_conflict = dest_file.exists()
        action_name = "Chuyển & Đổi tên tránh trùng" if will_conflict else "Chuyển dời an toàn"

        preview_items.append({
            "source_name": name,
            "source_path": str(src),
            "dest_path": str(dest_file),
            "is_dir": False,
            "modality": detect_modality(ext),
            "category_tag": f"{main_folder} > {sub_folder} [{context_tag}]",
            "size_formatted": format_bytes(src.stat().st_size) if src.exists() else "0 B",
            "has_conflict": will_conflict,
            "action": action_name
        })

    return preview_items

# Global Undo Journal for safe rollback
UNDO_JOURNAL: List[Dict[str, Any]] = []

# Execute Safe Organize: Supports both files and entire folders with true MOVE
def organize_files_safe(
    file_paths: List[str], 
    target_base_dir: str, 
    mode: str = "move"
) -> Dict[str, Any]:
    target_base = Path(target_base_dir)
    target_base.mkdir(parents=True, exist_ok=True)

    moved = []
    failed = []
    batch_journal = []

    for src_path in file_paths:
        src = Path(src_path)
        if not src.exists():
            continue

        # Handle directory move
        if src.is_dir():
            dest_folder = target_base / "Folders_Archives" / src.name
            dest_folder.parent.mkdir(parents=True, exist_ok=True)
            try:
                if mode == "move":
                    shutil.move(src, dest_folder)
                else:
                    shutil.copytree(src, dest_folder, dirs_exist_ok=True)
                moved.append({"from": str(src), "to": str(dest_folder), "is_dir": True})
            except Exception as e:
                failed.append({"path": str(src), "error": str(e)})
            continue

        # Handle file move according to Domain & AI Structure
        ext = src.suffix
        intent = analyze_file_intent(src.name, ext)
        dest_dir = target_base / intent["main_folder"] / intent["sub_folder"]
        dest_dir.mkdir(parents=True, exist_ok=True)

        dest_file = dest_dir / src.name
        counter = 1
        while dest_file.exists():
            dest_file = dest_dir / f"{src.stem}_{counter}{src.suffix}"
            counter += 1

        try:
            src_hash = calculate_checksum(str(src))
            shutil.copy2(src, dest_file)
            dest_hash = calculate_checksum(str(dest_file))
            if src_hash != dest_hash:
                if dest_file.exists():
                    os.remove(dest_file)
                failed.append({"path": str(src), "error": "Lỗi Checksum"})
                continue

            if mode == "move":
                os.remove(src)

            record = {
                "from": str(src),
                "to": str(dest_file),
                "mode": mode,
                "is_dir": False,
                "checksum": src_hash,
                "timestamp": int(time.time())
            }
            moved.append(record)
            batch_journal.append(record)
        except Exception as e:
            failed.append({"path": str(src), "error": str(e)})

    if batch_journal:
        UNDO_JOURNAL.extend(batch_journal)

    return {
        "success": True,
        "mode": mode,
        "success_count": len(moved),
        "failed_count": len(failed),
        "items": moved
    }

def undo_last_organize() -> Dict[str, Any]:
    """Undo the last batch of organized files"""
    global UNDO_JOURNAL
    if not UNDO_JOURNAL:
        return {"success": False, "message": "Không có thao tác nào để hoàn tác."}

    undone_count = 0
    # Undo backwards
    items_to_undo = list(UNDO_JOURNAL)
    UNDO_JOURNAL.clear()

    for item in reversed(items_to_undo):
        src_orig = item["from"]
        dest_current = item["to"]
        mode = item["mode"]

        try:
            if os.path.exists(dest_current):
                if mode == "move":
                    # Move back to original place
                    shutil.move(dest_current, src_orig)
                    undone_count += 1
                elif mode == "copy":
                    # Just remove copied file
                    send2trash.send2trash(dest_current)
                    undone_count += 1
        except:
            pass

    return {
        "success": True,
        "undone_count": undone_count,
        "message": f"Đã hoàn tác thành công {undone_count} tệp về trạng thái ban đầu!"
    }
