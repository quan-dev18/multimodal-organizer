export type Language = 'vi' | 'en';

export interface TranslationDictionary {
  [key: string]: {
    vi: string;
    en: string;
  };
}

export const i18nResources: TranslationDictionary = {
  // App Branding & Preflight
  app_title: { vi: "MMO Desktop", en: "MMO Desktop" },
  app_subtitle: { vi: "Quản lý tệp tin thông minh", en: "Intelligent File Organizer" },
  setup_title: { vi: "MMO — Thiết lập cấu hình AI", en: "MMO — AI Engine Setup" },
  setup_badge: { vi: "Chuẩn bị hệ thống", en: "System Ready" },
  setup_desc: { vi: "Chọn cụm mô hình AI phù hợp với phần cứng trước khi mở không gian quản lý tệp tin", en: "Select AI model clusters optimized for your hardware before entering workspace" },
  start_app: { vi: "Bắt đầu sử dụng", en: "Launch Workspace" },
  refresh: { vi: "Làm mới", en: "Refresh" },
  vram_usage: { vi: "Bộ nhớ đồ họa (VRAM):", en: "Graphics Memory (VRAM):" },
  recommended_limit: { vi: "Ngưỡng đề xuất:", en: "Recommended:" },
  active_models: { vi: "mô hình đang hoạt động", en: "models active" },
  configure_models: { vi: "Cấu hình mô hình", en: "Model Configuration" },

  // Navigation Tabs
  tab_explorer: { vi: "Quản lý tệp", en: "File Explorer" },
  tab_explorer_desc: { vi: "Duyệt và sắp xếp tệp trong thư mục hệ thống", en: "Browse and organize files in system folders" },
  tab_cleaner: { vi: "Dọn bộ nhớ tạm", en: "Temp Cleaner" },
  tab_cleaner_desc: { vi: "Giải phóng dung lượng từ tệp tạm Windows & Cache", en: "Free up storage from Windows temp files & app cache" },
  tab_chat: { vi: "Tổng quan & Chatbot", en: "Overview & Chatbot" },
  tab_chat_desc: { vi: "Thống kê tỷ lệ tệp tin thực tế và tương tác cùng Trợ lý AI", en: "File statistics and interactive local AI Assistant" },
  tab_rules: { vi: "Quy tắc sắp xếp", en: "Sorting Rules" },
  tab_rules_desc: { vi: "Tùy chỉnh thêm, sửa, xóa quy tắc phân loại tệp", en: "Customize and configure file organization rules" },
  tab_tiering: { vi: "Phân tầng lưu trữ", en: "Storage Tiering" },
  tab_tiering_desc: { vi: "Tối ưu hóa dữ liệu thực tế Hot / Warm / Cold", en: "Optimize storage tiers based on actual access history" },
  tab_semantic_search: { vi: "Tìm kiếm ngữ nghĩa", en: "Semantic Search" },
  tab_semantic_search_desc: { vi: "Truy xuất tệp tin thông minh qua mô hình AI Vector", en: "Intelligent file retrieval via neural vector embeddings" },

  // Storage Tiering View
  tiering_title: { vi: "Phân tầng dữ liệu thực tế (Hot / Warm / Cold Tiering)", en: "Actual Storage Tiering (Hot / Warm / Cold)" },
  tiering_desc: { vi: "Đo lường thời gian truy cập thực tế của tệp tin trên máy để tự động tối ưu hóa và gom nhóm lưu trữ", en: "Measure actual file access history to automatically optimize and group storage tiers" },
  analyzed_folder: { vi: "Thư mục phân tích:", en: "Target Folder:" },
  total_indexed: { vi: "Tổng cộng: {count} tệp đã được lập chỉ mục", en: "Total: {count} files indexed" },
  rescan_btn: { vi: "Quét lại", en: "Rescan" },
  run_optimizer_btn: { vi: "Chạy tối ưu chuyển tầng", en: "Run Tier Optimization" },
  moving_files: { vi: "Đang di chuyển tệp...", en: "Moving files..." },
  browse_btn: { vi: "Chọn thư mục", en: "Browse Folder" },

  // Tier Cards
  hot_tier_name: { vi: "Hot Tier (Truy xuất tức thời)", en: "Hot Tier (Instant Access)" },
  hot_tier_desc: { vi: "Dữ liệu công việc đang tích cực xử lý trong tuần này, mã nguồn dự án đang dev.", en: "Active workspace data accessed this week, source code currently under development." },
  hot_tier_infra: { vi: "NVMe SSD / RAM Cache", en: "NVMe SSD / RAM Cache" },
  hot_tier_criteria: { vi: "Mới sửa đổi hoặc truy cập (≤ 7 ngày)", en: "Recently modified or accessed (≤ 7 days)" },
  hot_tier_cost: { vi: "Tốc độ cao nhất", en: "Maximum Performance" },
  
  warm_tier_name: { vi: "Warm Tier (Truy xuất định kỳ)", en: "Warm Tier (Periodic Access)" },
  warm_tier_desc: { vi: "Hình ảnh, assets thiết kế, báo cáo các tháng trước, dữ liệu vector embedding.", en: "Media assets, graphic designs, past monthly reports, vector embeddings." },
  warm_tier_infra: { vi: "SSD / HDD Tốc độ cao", en: "Fast SSD / HDD" },
  warm_tier_criteria: { vi: "Truy cập từ 7 - 45 ngày trước", en: "Accessed between 7 - 45 days ago" },
  warm_tier_cost: { vi: "Cân bằng tối ưu", en: "Optimal Balance" },

  cold_tier_name: { vi: "Cold Tier (Lưu trữ dài hạn)", en: "Cold Tier (Long-term Archive)" },
  cold_tier_desc: { vi: "Tệp cũ, video thô đã xuất bản, bộ cài đặt phần mềm, bản sao lưu lưu trữ an toàn.", en: "Outdated files, raw footage, software installers, secure backup archives." },
  cold_tier_infra: { vi: "HDD / Khối nén Archive", en: "HDD / Compressed Archive" },
  cold_tier_criteria: { vi: "Không truy cập (> 45 ngày)", en: "Not accessed for over 45 days" },
  cold_tier_cost: { vi: "Tiết kiệm dung lượng", en: "Storage Saver" },

  infra_label: { vi: "Hạ tầng đề xuất:", en: "Recommended Tier:" },
  criteria_label: { vi: "Tiêu chí:", en: "Criteria:" },
  target_cost_label: { vi: "Mục tiêu chi phí:", en: "Target Benefit:" },
  avg_latency_label: { vi: "Độ trễ trung bình:", en: "Average Latency:" },
  files_count_unit: { vi: "tệp", en: "files" },

  // Semantic Search View
  search_title: { vi: "Tìm kiếm ngữ nghĩa (Semantic & Vector Search)", en: "Semantic & Vector Search" },
  search_desc: { vi: "Tìm kiếm tự nhiên dựa trên nội dung tệp tin thật và phân tích vector nhúng AI", en: "Natural language search indexing actual file contents via AI vector embeddings" },
  search_dir_label: { vi: "Thư mục tìm kiếm:", en: "Search Directory:" },
  search_placeholder: { vi: "Nhập nội dung cần tìm bằng ngôn ngữ tự nhiên (ví dụ: 'kế hoạch nghiên cứu', 'file code python', 'hóa đơn')...", en: "Enter natural search query (e.g., 'research plan', 'python script', 'invoice')..." },
  search_btn: { vi: "Tìm kiếm", en: "Search" },
  similarity_score: { vi: "Độ tương đồng", en: "Similarity" },
  model_used: { vi: "Mô hình nhúng:", en: "Embedding Model:" },
  scanned_files: { vi: "Đã quét", en: "Scanned" },
  files_unit: { vi: "tệp tin trong thư mục", en: "files in directory" },
  found_results: { vi: "Tìm thấy", en: "Found" },
  results_unit: { vi: "kết quả phù hợp", en: "matching results" },
  no_results: { vi: "Không tìm thấy tệp tin phù hợp với truy vấn hoặc nội dung.", en: "No matching files found for this query or file contents." },
  open_file: { vi: "Mở tệp", en: "Open File" },
  open_dir: { vi: "Mở thư mục", en: "Open Folder" },

  // Progress & Execution
  task_scanning: { vi: "Đang quét danh sách tệp tin...", en: "Scanning candidate files..." },
  task_sniffing: { vi: "Đang đọc lướt nội dung và trích xuất ngữ cảnh...", en: "Sniffing content snippets and file headers..." },
  task_embedding: { vi: "Đang tính toán vector nhúng embedding AI...", en: "Computing AI vector embeddings & cosine ranking..." },
  task_done: { vi: "Hoàn tất xếp hạng kết quả!", en: "Completed ranking results!" },
  elapsed_label: { vi: "Đã chạy:", en: "Elapsed:" },
  estimated_label: { vi: "Ước tính:", en: "Estimated:" }
};
