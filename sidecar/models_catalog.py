from typing import List, Dict, Any

from typing import List, Dict, Any

# Curated catalog grouped by Clusters / Modalities in MMO Desktop Architecture
# AI Model Clusters for Desktop Intelligent Organization
MODEL_CLUSTERS: List[Dict[str, Any]] = [
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
                "default_selected": True
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
                "default_selected": False
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
                "default_selected": False
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
                "default_selected": False
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
                "default_selected": True
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
                "default_selected": False
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
                "default_selected": True
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
                "default_selected": False
            }
        ]
    }
]

def get_all_model_clusters() -> List[Dict[str, Any]]:
    return MODEL_CLUSTERS

def get_flat_catalog() -> List[Dict[str, Any]]:
    items = []
    for c in MODEL_CLUSTERS:
        for m in c["models"]:
            item = m.copy()
            item["cluster_name"] = c["cluster_name"]
            items.append(item)
    return items
