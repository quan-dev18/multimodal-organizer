from typing import List, Dict, Any

# Curated catalog of models suitable for MMO tasks and various VRAM budgets
MODEL_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "qwen2.5:1.5b",
        "name": "Qwen 2.5 (1.5B)",
        "tag": "qwen2.5:1.5b",
        "params": "1.5B",
        "size_download_gb": 1.0,
        "est_vram_gb": 1.6,
        "category": "Text & Metadata",
        "badge": "Khuyên dùng (4GB VRAM)",
        "description": "Siêu nhanh, trích xuất metadata, phân loại file và sinh tên folder chuẩn. Tốc độ cao ~45 tok/s.",
        "recommended_for": ["classification", "metadata", "file_organize"]
    },
    {
        "id": "llama3.2:1b",
        "name": "Llama 3.2 (1B)",
        "tag": "llama3.2:1b",
        "params": "1.0B",
        "size_download_gb": 0.8,
        "est_vram_gb": 1.3,
        "category": "Text & Metadata",
        "badge": "Nhẹ nhất",
        "description": "Cực nhẹ, ngốn ít tài nguyên nhất, phù hợp khi chạy đa nhiệm tác vụ nặng.",
        "recommended_for": ["classification", "quick_tag"]
    },
    {
        "id": "llama3.2:3b",
        "name": "Llama 3.2 (3B)",
        "tag": "llama3.2:3b",
        "params": "3.2B",
        "size_download_gb": 2.0,
        "est_vram_gb": 2.8,
        "category": "Text & Reasoning",
        "badge": "Chính xác cao",
        "description": "Hiểu ngữ nghĩa sâu, suy luận trích xuất thông tin văn bản dài tốt hơn.",
        "recommended_for": ["document_summarization", "complex_rules"]
    },
    {
        "id": "moondream",
        "name": "Moondream 2 (Vision)",
        "tag": "moondream",
        "params": "1.8B",
        "size_download_gb": 1.7,
        "est_vram_gb": 2.2,
        "category": "Multimodal Image",
        "badge": "Phân tích Ảnh",
        "description": "Mô hình thị giác nhỏ gọn, mô tả chi tiết ảnh, đọc ảnh chụp hóa đơn, chụp tài liệu.",
        "recommended_for": ["image_tagging", "visual_caption"]
    },
    {
        "id": "bge-m3",
        "name": "BGE-M3 (Embedding)",
        "tag": "bge-m3",
        "params": "0.5B",
        "size_download_gb": 0.6,
        "est_vram_gb": 0.8,
        "category": "Vector Search",
        "badge": "Đa ngôn ngữ",
        "description": "Tạo vector embedding cho LanceDB, hỗ trợ tiếng Việt rất tốt để tìm kiếm ngữ nghĩa.",
        "recommended_for": ["semantic_search", "lancedb_vector"]
    },
    {
        "id": "qwen2.5:7b",
        "name": "Qwen 2.5 (7B)",
        "tag": "qwen2.5:7b",
        "params": "7.0B",
        "size_download_gb": 4.7,
        "est_vram_gb": 5.8,
        "category": "High Quality",
        "badge": "Tràn VRAM (Offload sang RAM)",
        "description": "Chất lượng cao nhất nhưng vượt quá 4GB VRAM của GTX 1650, sẽ offload sang RAM và chạy chậm hơn.",
        "recommended_for": ["heavy_reasoning"]
    }
]

def get_recommended_catalog() -> List[Dict[str, Any]]:
    return MODEL_CATALOG
