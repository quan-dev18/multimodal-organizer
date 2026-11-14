import os
import json
import requests
from pathlib import Path
from typing import Dict, Any, List

DOMAIN_RULES = {
    # 1. Game Development & 3D (Unity, Unreal, Blender, Godot)
    "game_dev": {
        "extensions": ["fbx", "obj", "blend", "dae", "gltf", "glb", "max", "c4d", "unity", "uasset", "umap", "tga", "dds", "psd"],
        "folder": "GameDev_3D_Assets",
        "subfolders": {
            "models": ["fbx", "obj", "blend", "dae", "gltf", "glb"],
            "textures": ["tga", "dds", "psd", "hdr", "exr"],
            "engine_files": ["unity", "uasset", "umap", "prefab"]
        }
    },
    # 2. Software Development & Source Code
    "code_dev": {
        "extensions": ["py", "rs", "cpp", "c", "h", "hpp", "java", "kt", "ts", "tsx", "js", "jsx", "html", "css", "sql", "sh", "bat", "ps1", "json", "yaml", "yml", "toml"],
        "folder": "Development_SourceCode",
        "subfolders": {
            "scripts": ["py", "sh", "bat", "ps1"],
            "frontend": ["ts", "tsx", "js", "jsx", "html", "css"],
            "backend_core": ["rs", "cpp", "c", "java", "sql"],
            "configs": ["json", "yaml", "yml", "toml"]
        }
    },
    # 3. Office & Workplace Documents (Nhân viên văn phòng, Kế toán, Quản lý)
    "office_work": {
        "extensions": ["pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt"],
        "folder": "Documents_Office",
        "subfolders": {
            "spreadsheets": ["xls", "xlsx", "csv"],
            "word_reports": ["doc", "docx", "pdf", "txt"],
            "presentations": ["ppt", "pptx"]
        }
    },
    # 4. Media, Graphics & Design (Designer, Video Editor, Audio Engineer)
    "creative_media": {
        "extensions": ["ai", "eps", "svg", "raw", "cr2", "nef", "prproj", "aep", "mp4", "mov", "mkv", "wav", "flac"],
        "folder": "Creative_Media_Production",
        "subfolders": {
            "raw_footage": ["raw", "cr2", "nef", "mov"],
            "project_files": ["ai", "eps", "prproj", "aep"],
            "final_renders": ["mp4", "mkv", "wav", "flac"]
        }
    },
    # 5. Software Installers & System Packages
    "installers_system": {
        "extensions": ["exe", "msi", "iso", "zip", "rar", "7z", "tar", "gz"],
        "folder": "Software_Installers_Archives",
        "subfolders": {
            "installers": ["exe", "msi", "iso"],
            "archives": ["zip", "rar", "7z", "tar", "gz"]
        }
    }
}

RULES_FILE = os.path.join(os.path.expanduser("~"), ".mmo_rules.json")

def load_custom_rules() -> List[Dict[str, Any]]:
    if os.path.exists(RULES_FILE):
        try:
            with open(RULES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return sorted(data, key=lambda x: x.get("priority", 999))
        except Exception:
            pass
    return []

def analyze_file_intent(file_name: str, ext: str) -> Dict[str, str]:
    """
    Blazing fast hybrid analyzer:
    1. First checks custom user-defined rules from ~/.mmo_rules.json (persisted across sessions).
    2. Falls back to instant domain heuristics (< 0.1ms per file) ensuring UI NEVER freezes,
    while accurately classifying GameDev, SourceCode, Office, and Media.
    """
    ext_clean = ext.lower().lstrip(".")
    name_lower = file_name.lower()

    # 1. Custom User Rules Check
    custom_rules = load_custom_rules()
    for rule in custom_rules:
        if not rule.get("enabled", True):
            continue
        rule_exts = [e.lower().lstrip(".") for e in rule.get("extensions", [])]
        if ext_clean in rule_exts:
            dest_folder = rule.get("dest_folder", "Custom_Folder")
            domain_name = rule.get("domain", dest_folder).replace("_", " ").title()
            return {
                "main_folder": dest_folder,
                "sub_folder": domain_name,
                "context_tag": rule.get("name", "Quy tắc người dùng")
            }

    # 2. Built-in Domain Heuristics
    for domain_key, info in DOMAIN_RULES.items():
        if ext_clean in info["extensions"]:
            main_folder = info["folder"]
            sub_folder = "General"
            for sub_name, ext_list in info["subfolders"].items():
                if ext_clean in ext_list:
                    sub_folder = sub_name.replace("_", " ").title()
                    break

            context_tag = "Tổng Hợp"
            if any(k in name_lower for k in ["report", "baocao", "báo cáo", "financial", "tai chinh", "doan", "đề án"]):
                context_tag = "Báo Cáo & Tài Liệu"
            elif any(k in name_lower for k in ["asset", "mesh", "character", "weapon", "map", "texture", "level"]):
                context_tag = "Game Assets"
            elif any(k in name_lower for k in ["invoice", "bill", "hoadon", "hóa đơn", "luong", "lương"]):
                context_tag = "Kế Toán & Chứng Từ"
            elif any(k in name_lower for k in ["setup", "install", "installer", "patch"]):
                context_tag = "Bộ Cài Đặt"
            elif any(k in name_lower for k in ["script", "test", "build", "core", "api"]):
                context_tag = "Mã Nguồn Chức Năng"

            return {
                "main_folder": main_folder,
                "sub_folder": sub_folder,
                "context_tag": context_tag
            }

    return {
        "main_folder": "General_Storage",
        "sub_folder": ext_clean.upper() if ext_clean else "Other",
        "context_tag": "Tệp Chung"
    }
