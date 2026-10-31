from typing import List, Dict, Any

# Curated catalog grouped by Clusters / Modalities in MMO Research Architecture
# L3 AI Understanding: Cascade Multi-model System
MODEL_CLUSTERS: List[Dict[str, Any]] = [
    {
        "cluster_id": "text_slm",
        "cluster_name": "Cụm 1: Text & Metadata Extraction (Văn bản & Trích xuất)",
        "role": "L3.1 Ingestion Classifier & NER",
        "description": "Chuyên đọc lướt nội dung, trích xuất thực thể, metadata ngày tháng, tiêu đề và phân loại nhãn tài liệu.",
        "models": [
            {
                "id": "qwen2.5:1.5b",
                "name": "Qwen 2.5 (1.5B)",
                "tag": "qwen2.5:1.5b",
                "params": "1.5B",
                "size_download_gb": 1.0,
                "est_vram_gb": 1.6,
                "category": "Text & Metadata",
                "badge": "Khuyên dùng (4GB VRAM)",
                "modality_support": ["text", "json", "code"],
                "description": "Siêu nhanh, trích xuất metadata JSON, nhận diện nhãn cực chuẩn. Đạt ~45 tok/s trên GTX 1650.",
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
                "badge": "Siêu nhẹ",
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
                "description": "Khả năng tóm tắt tài liệu học thuật và phân tích cấu trúc câu rất tốt.",
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
                "badge": "Chính xác cao",
                "modality_support": ["text"],
                "description": "Hiểu ngữ nghĩa sâu, suy luận trích xuất quy tắc phân loại tài liệu phức tạp.",
                "default_selected": False
            }
        ]
    },
    {
        "cluster_id": "vision_multimodal",
        "cluster_name": "Cụm 2: Multimodal Vision & OCR (Thị giác & Hình ảnh)",
        "role": "L3.2 Visual Content Understanding",
        "description": "Chuyên phân tích hình ảnh, đọc văn bản trong ảnh (OCR), nhận diện biểu đồ, ảnh chụp hóa đơn.",
        "models": [
            {
                "id": "moondream",
                "name": "Moondream 2 (Vision SLM)",
                "tag": "moondream",
                "params": "1.8B",
                "size_download_gb": 1.7,
                "est_vram_gb": 2.2,
                "category": "Multimodal Image",
                "badge": "Tối ưu Vision 4GB",
                "modality_support": ["image", "ocr"],
                "description": "Mô hình thị giác gọn nhẹ nhất, mô tả ảnh chi tiết và đọc chữ trong ảnh không bị tràn VRAM.",
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
                "badge": "Offload RAM",
                "modality_support": ["image", "chart", "diagram"],
                "description": "Mô hình thị giác mạnh mẽ nhưng vượt quá 4GB VRAM, sẽ chia sẻ tải sang 16GB RAM hệ thống.",
                "default_selected": False
            }
        ]
    },
    {
        "cluster_id": "embedding_search",
        "cluster_name": "Cụm 3: Cross-Modal & Vector Embeddings (Truy xuất & Nhúng)",
        "role": "L4 & L7 LanceDB Semantic Retrieval",
        "description": "Chuyên mã hoá nội dung văn bản và ảnh thành vector 1024-chiều để phục vụ tìm kiếm ngữ nghĩa.",
        "models": [
            {
                "id": "bge-m3",
                "name": "BGE-M3 (Multi-lingual & Multi-granularity)",
                "tag": "bge-m3",
                "params": "0.5B",
                "size_download_gb": 0.6,
                "est_vram_gb": 0.8,
                "category": "Vector Embedding",
                "badge": "Chuẩn Đề Tài L7",
                "modality_support": ["text", "code", "table"],
                "description": "Mô hình nhúng đa ngôn ngữ hỗ trợ tiếng Việt xuất sắc, dùng lưu trữ vector vào LanceDB.",
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
                "badge": "Siêu nhẹ (0.5GB)",
                "modality_support": ["text"],
                "description": "Context dài 8192 tokens, cực kỳ nhẹ nhàng cho việc đánh chỉ mục nhanh.",
                "default_selected": False
            }
        ]
    },
    {
        "cluster_id": "audio_speech",
        "cluster_name": "Cụm 4: Audio & Speech Understanding (Âm thanh & Lời nói)",
        "role": "L3.3 ASR Transcriber",
        "description": "Chuyên phân tích âm thanh, nhận diện tiếng nói thành văn bản (Speech-to-Text).",
        "models": [
            {
                "id": "whisper-tiny",
                "name": "Faster Whisper (Tiny / Base)",
                "tag": "whisper-tiny",
                "params": "0.1B",
                "size_download_gb": 0.15,
                "est_vram_gb": 0.4,
                "category": "Audio & Speech",
                "badge": "Nhúng Cục Bộ",
                "modality_support": ["audio", "speech"],
                "description": "Chuyển lời thoại trong file ghi âm/video thành text để lập chỉ mục tìm kiếm.",
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
