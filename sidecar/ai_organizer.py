import os
import json
import requests
import datetime
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

def analyze_file_intent_rule_based(file_name: str, ext: str) -> Dict[str, str]:
    ext_clean = ext.lower().lstrip(".")
    name_lower = file_name.lower()

    # Domain Match
    for domain_key, info in DOMAIN_RULES.items():
        if ext_clean in info["extensions"]:
            main_folder = info["folder"]
            sub_folder = "General"
            for sub_name, ext_list in info["subfolders"].items():
                if ext_clean in ext_list:
                    sub_folder = sub_name.replace("_", " ").title()
                    break

            # Smart tag based on file name keywords
            context_tag = "General"
            if any(k in name_lower for k in ["report", "baocao", "báo cáo", "quy", "quý", "financial", "tai chinh"]):
                context_tag = "Báo Cáo & Tài Chính"
            elif any(k in name_lower for k in ["asset", "mesh", "character", "weapon", "map", "texture"]):
                context_tag = "Game Assets"
            elif any(k in name_lower for k in ["invoice", "bill", "hoadon", "hóa đơn"]):
                context_tag = "Hóa Đơn & Chứng Từ"
            elif any(k in name_lower for k in ["setup", "install", "installer", "patch"]):
                context_tag = "Bộ Cài Đặt"

            return {
                "domain": domain_key,
                "main_folder": main_folder,
                "sub_folder": sub_folder,
                "context_tag": context_tag
            }

    return {
        "domain": "general_storage",
        "main_folder": "Miscellaneous",
        "sub_folder": ext_clean.upper() if ext_clean else "Other",
        "context_tag": "Tài Liệu Chung"
    }

def analyze_with_ai_llm(file_name: str, ext: str, active_model: str = "llama3.2:1b") -> Dict[str, str]:
    """Uses Ollama SLM to analyze intent & contextual category when available"""
    ollama_url = "http://localhost:11434/api/generate"
    prompt = f"""Bạn là AI phân loại tệp tin máy tính chuyên nghiệp.
Phân tích tệp tin sau và trả về DUY NHẤT một chuỗi JSON hợp lệ không có giải thích thêm:
Tên tệp: "{file_name}"
Định dạng: "{ext}"

Mục tiêu người dùng có thể là: Game Developer, Lập trình viên, Nhân viên văn phòng, Designer đồ họa, hoặc Cá nhân.
Định dạng JSON yêu cầu:
{{"main_category": "Tên thư mục chính (VD: GameDev_Assets, Office_Financial, Software_Code, Media_Design)", "sub_category": "Thư mục con (VD: Textures, Spreadsheets, Scripts, Renders)", "tag": "Nhãn ngữ nghĩa"}}"""

    try:
        res = requests.post(
            ollama_url,
            json={"model": active_model, "prompt": prompt, "format": "json", "stream": False},
            timeout=4
        )
        if res.status_code == 200:
            data = res.json()
            response_json = json.loads(data.get("response", "{}"))
            if response_json.get("main_category"):
                return {
                    "main_folder": response_json.get("main_category"),
                    "sub_folder": response_json.get("sub_category", "General"),
                    "context_tag": response_json.get("tag", "AI Tagged")
                }
    except:
        pass

    # Fallback to rich rule-based domain analyzer if Ollama times out or busy
    return analyze_file_intent_rule_based(file_name, ext)
