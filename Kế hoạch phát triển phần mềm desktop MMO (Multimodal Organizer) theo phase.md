# Kế hoạch phát triển phần mềm desktop «MMO – Multimodal Organizer» theo phase

*Phiên bản 1.0 · 30/10/2026 · Căn cứ: tài liệu «Phương pháp và kiến trúc ứng dụng AI trong tổ chức, lưu trữ dữ liệu đa phương thức»*

## 1. Tóm tắt sản phẩm và giả định

**Sản phẩm đo lường được:** ứng dụng desktop chạy offline-first. Người dùng chọn thư mục nguồn, AI tự phân loại và gắn nhãn dữ liệu (văn bản, ảnh, âm thanh, video), phần mềm đề xuất rồi thực hiện sắp xếp theo luật và đường dẫn do người dùng tùy chỉnh, cho phép tìm kiếm theo ngữ nghĩa và gợi ý phân tầng nóng–ấm–lạnh kèm báo cáo chi phí. Tên «MMO» chỉ là tên tạm.

**Giả định cần xác nhận:**

- Thời lượng 12 tháng, khớp kế hoạch nghiên cứu; đội 6 người (mục 7).
- Nền tảng ưu tiên là Windows 10/11; macOS và Linux làm sau khi bản Windows ổn định.
- Máy chuẩn để đo hiệu năng: CPU 8 nhân, RAM 16 GB, SSD. GPU là tùy chọn, không bắt buộc.
- Hỗ trợ tiếng Việt và tiếng Anh. Dữ liệu người dùng không rời khỏi máy theo mặc định.
- Mọi con số mục tiêu là **đề xuất ban đầu**, sẽ được hiệu chỉnh ở Phase 0 bằng đo đạc thực tế.

## 2. Thu nhỏ kiến trúc 9 lớp xuống desktop

Kiến trúc gốc dành cho hệ thống phân tán. Bản desktop giữ nguyên **logic** từng lớp nhưng thay hạ tầng nặng bằng thành phần chạy cục bộ:

| Lớp | Bản server (tài liệu gốc) | Bản desktop | Phase |
| --- | --- | --- | --- |
| L1 Ingestion | FastAPI, Kafka, MinIO landing | Bộ quét thư mục + theo dõi thay đổi (watchdog), hàng đợi tác vụ lưu trong SQLite | P1 |
| L2 Tiền xử lý | FFmpeg, OpenCV, Tika, PySceneDetect | Giữ nguyên, đóng gói kèm ứng dụng | P1–P2 |
| L3 AI Understanding | Triton / Ray Serve | ONNX Runtime (CPU, GPU nếu có), faster-whisper, cascade | P2 |
| L4 Metadata | PostgreSQL, MongoDB | SQLite (JSON1) làm kho metadata duy nhất | P1 |
| L5 Policy Engine | Router, Tiering Optimizer, Scheduler | Rule engine + Storage Router, LightGBM, bộ lập lịch chạy lúc máy rảnh | P3, P5 |
| L6 Lưu trữ | MinIO hot/warm/cold | **Storage Location** do người dùng cấu hình (ổ SSD, HDD, USB, NAS/SMB, tùy chọn S3/MinIO) | P3 |
| L7 Retrieval | OpenSearch, Milvus, Redis | SQLite FTS5 + LanceDB (hoặc sqlite-vec/FAISS) + cache RAM | P4 |
| L8 Giám sát/MLOps | Prometheus, Grafana, MLflow | Dashboard Insights trong ứng dụng + log cục bộ; MLflow giữ ở phía nghiên cứu | P5–P6 |
| Bảo mật | Keycloak, Presidio | Mã hóa tùy chọn, phát hiện PII cục bộ, không telemetry mặc định | P6 |

**Công nghệ desktop đề xuất:**

- **Giao diện:** Tauri 2 + React + TypeScript (nhẹ hơn Electron). Phương án dự phòng: PySide6 nếu đội thiếu kỹ năng web.
- **Lõi xử lý:** Python 3.11 chạy dạng sidecar (FastAPI qua localhost/IPC), đóng gói bằng PyInstaller.
- **AI:** mô hình xuất ONNX và lượng tử hóa INT8; **Model Manager** tải mô hình theo nhu cầu để bộ cài không quá nặng.
- **Dữ liệu:** SQLite (metadata, hàng đợi, nhật ký thao tác), LanceDB (vector).
- **Chốt lựa chọn** bằng spike kỹ thuật ở Phase 0 và ghi lại thành ADR (Architecture Decision Record).

## 3. Phạm vi sản phẩm

### 3.1. Nhóm tính năng

| Nhóm | Tính năng | Mức ưu tiên |
| --- | --- | --- |
| A. Quét và nhập | Chọn nhiều thư mục nguồn, quét nền, theo dõi thay đổi, nhận diện loại tệp, phát hiện trùng lặp | Must |
| B. AI phân loại | Phân loại, gắn nhãn, OCR, ASR, trích xuất thực thể, độ tin cậy, hàng đợi duyệt | Must |
| C. Sắp xếp | Luật, template đường dẫn, xem trước (dry-run), thực thi, hoàn tác, ghi đè thủ công | Must |
| D. Tìm kiếm | Từ khóa, ngữ nghĩa, chéo modality, bộ lọc, bộ sưu tập thông minh | Must |
| E. Phân tầng và chi phí | Gợi ý nóng–ấm–lạnh, lịch di chuyển, dashboard chi phí/TCO | Should |
| F. An toàn | Nhật ký kiểm toán, mã hóa, cờ PII, chế độ chỉ-đọc | Should |
| G. Mở rộng | Kết nối S3/MinIO, plugin luật, macOS/Linux, tinh chỉnh mô hình theo phản hồi | Could |
| H. Ngoài phạm vi | Đồng bộ đa người dùng, huấn luyện mô hình nền, sao lưu thảm họa | Won't |

### 3.2. Tùy chỉnh đường dẫn, nơi lưu trữ và cách sắp xếp (yêu cầu cốt lõi)

- **Storage Location:** mỗi nơi lưu có tên, đường dẫn hoặc URI, loại (ổ nội bộ, ổ ngoài, NAS, S3), **vai trò tầng** (hot/warm/cold), hạn mức dung lượng, đơn giá trên GB, quyền đọc/ghi. Người dùng thêm, sửa, xóa tùy ý.
- **Template đường dẫn đích**, ví dụ `{modality}/{year}/{month}/{label}/{name}`. Hỗ trợ tối thiểu 12 biến: `modality, label, sublabel, year, month, day, source, ext, entity, language, resolution, tier`.
- **Chế độ thực thi:** di chuyển, sao chép, hoặc tạo liên kết (symlink/hardlink). Mặc định là **sao chép + xác minh checksum**.
- **Luật sắp xếp:** NẾU (loại, nhãn, độ tin cậy ≥ ngưỡng, kích thước, tuổi tệp, từ khóa, nguồn) THÌ (đặt vào Location nào, dùng template nào, gắn thẻ, bỏ qua, đưa vào hàng đợi duyệt). Luật có thứ tự ưu tiên, lưu và xuất/nhập được.
- **Chính sách xung đột tên:** đổi tên, bỏ qua, ghi đè, hỏi người dùng.
- **Sắp xếp và hiển thị:** nhóm theo modality, nhãn, thời gian, dung lượng, tầng; sắp xếp theo tên, ngày, độ tin cậy, độ nóng.
- **Học từ chỉnh sửa:** mỗi lần người dùng sửa nhãn hoặc nơi đặt, hệ thống ghi lại để cải thiện đề xuất.

### 3.3. Các màn hình chính

1. **Dashboard:** tổng quan dung lượng theo tầng, tiến độ quét, tiết kiệm ước tính.
2. **Thư viện:** dạng lưới/danh sách/cây thư mục, xem trước ảnh/văn bản/audio/video, bảng nhãn.
3. **Hàng đợi duyệt:** các mục AI chưa chắc chắn, duyệt nhanh bằng phím tắt.
4. **Sắp xếp:** soạn luật, chọn template, xem trước kết quả trước khi chạy, lịch sử và hoàn tác.
5. **Nơi lưu trữ:** quản lý Storage Location và vai trò tầng.
6. **Tìm kiếm:** ô tìm kiếm chung, bộ lọc, tìm bằng ảnh mẫu.
7. **Insights:** chi phí, độ nóng, gợi ý di chuyển, chi phí AI.
8. **Mô hình và Cài đặt:** quản lý mô hình, ngôn ngữ, quyền riêng tư, hiệu năng.

## 4. Lộ trình tổng thể

| Phase | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 | T11 | T12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 Khởi động, yêu cầu, prototype | ■ | ■ |  |  |  |  |  |  |  |  |  |  |
| P1 Nền tảng ứng dụng và Ingestion |  | ■ | ■ | ■ |  |  |  |  |  |  |  |  |
| P2 AI Understanding |  |  |  | ■ | ■ | ■ |  |  |  |  |  |  |
| P3 Sắp xếp, định tuyến, tùy chỉnh |  |  |  |  |  | ■ | ■ | ■ |  |  |  |  |
| P4 Tìm kiếm và truy xuất |  |  |  |  |  |  | ■ | ■ | ■ |  |  |  |
| P5 Phân tầng và phân tích chi phí |  |  |  |  |  |  |  | ■ | ■ | ■ |  |  |
| P6 Hoàn thiện, bảo mật, đóng gói |  |  |  |  |  |  |  |  |  | ■ | ■ |  |
| P7 Đánh giá, nghiệm thu, công bố |  |  |  |  |  |  |  |  |  |  | ■ | ■ |

| Bản phát hành | Thời điểm | Nội dung chính |
| --- | --- | --- |
| **v0.1 Alpha** | Cuối T4 | Quét, nhận diện, trùng lặp, thư viện (chỉ đọc) |
| **v0.2** | Cuối T6 | AI phân loại 4 modality, hàng đợi duyệt |
| **v0.3 Beta 1** | Cuối T8 | Luật, template, Storage Location, sắp xếp, hoàn tác |
| **v0.4** | Cuối T9 | Tìm kiếm hybrid, chéo modality |
| **v0.5 Beta 2** | Cuối T10 | Gợi ý phân tầng, dashboard chi phí |
| **RC** | Cuối T11 | Bộ cài, bảo mật, tối ưu |
| **v1.0** | Cuối T12 | Nghiệm thu theo scoreboard (mục 6) |

## 5. Chi tiết từng phase

### Phase 0 – Khởi động, yêu cầu và prototype kỹ thuật (Tháng 1–2)

**Mục tiêu:** chốt yêu cầu, đo đường cơ sở (baseline), chọn công nghệ bằng bằng chứng.

**Hoạt động:**

- Khảo sát người dùng, xây persona, viết SRS rút gọn và product backlog.
- Thiết kế taxonomy nhãn (≥ 20 nhãn), mô hình dữ liệu SQLite, lược đồ metadata thống nhất (theo mục 3.4 tài liệu kiến trúc).
- Wireframe 8 màn hình trên Figma, kiểm thử với người dùng thật.
- Spike kỹ thuật: Tauri so với PySide6; ONNX Runtime trên máy chuẩn; chạy thử PhoBERT, CLIP, Whisper.
- Xây **bộ benchmark vàng** có nhãn thủ công; đo baseline thao tác thủ công.

**Đầu ra:** SRS, backlog, wireframe, ADR (chọn UI framework, vector store), benchmark vàng v1, báo cáo baseline, đặc tả máy chuẩn.

**Tiêu chí nghiệm thu:**

- Benchmark vàng ≥ 1.000 văn bản, 1.000 ảnh, 300 audio, 100 video; độ đồng thuận gán nhãn κ ≥ 0,7 trên mẫu 10%.
- Đã đo: thời gian phân loại thủ công 500 tệp và chi phí lưu trữ hiện tại.
- Wireframe được ≥ 5 người dùng đánh giá; ≥ 80% nhiệm vụ thử hoàn thành không cần hướng dẫn.
- ADR được duyệt, mỗi lựa chọn kèm số liệu spike.

### Phase 1 – Nền tảng ứng dụng và Ingestion (Tháng 2–4) → v0.1 Alpha

**Mục tiêu:** có ứng dụng chạy được, quét dữ liệu thật, hiển thị an toàn (chỉ đọc).

**Hoạt động:**

- Dựng khung ứng dụng desktop, sidecar Python, giao tiếp IPC, hệ thống cài đặt.
- Bộ quét thư mục đa luồng, theo dõi thay đổi, nhận diện loại tệp (python-magic, Tika), SHA-256, khử trùng lặp chính xác và gần đúng (pHash, MinHash).
- Tiền xử lý theo modality (trích văn bản, thumbnail, keyframe, tách audio).
- Kho metadata SQLite, hàng đợi tác vụ có khả năng tiếp tục sau khi tắt máy.
- Màn hình Thư viện (lưới ảo hóa) và Dashboard cơ bản; quản lý nhiều thư mục nguồn.

**Đầu ra:** bản v0.1 cài đặt được trên Windows, bộ kiểm thử tự động, tài liệu API nội bộ.

**Tiêu chí nghiệm thu:**

- Lập chỉ mục metadata + SHA-256 cho 100.000 tệp (\~200 GB hỗn hợp) ≤ 30 phút trên SSD máy chuẩn.
- Phát hiện đủ 100% trong 1.000 cặp trùng chính xác được cài sẵn; nhận diện đúng loại tệp ≥ 99% trên 5.000 tệp có đuôi sai hoặc lẫn.
- Thư viện hiển thị 50.000 mục, cuộn ≥ 30 fps; khởi động ứng dụng ≤ 5 giây.
- Quét lại sau khi tắt đột ngột không mất tiến độ (kiểm thử 20 lần kill process).
- Crash-free ≥ 98% qua 50 phiên dogfooding nội bộ.

### Phase 2 – AI Understanding (Tháng 4–6) → v0.2

**Mục tiêu:** AI phân loại, gắn nhãn, trích xuất cho 4 modality với chi phí tính toán chấp nhận được trên máy cá nhân.

**Hoạt động:**

- **Văn bản:** PhoBERT/XLM-R fine-tune, embedding BGE-M3 hoặc multilingual-e5, NER tiếng Việt.
- **Ảnh:** CLIP/SigLIP (zero-shot và linear probe), OCR PaddleOCR, phát hiện vật thể (tùy chọn).
- **Âm thanh:** faster-whisper (ASR), mô hình gắn nhãn âm thanh (AST/PANNs).
- **Video:** keyframe + audio track + ASR, dùng lại mô hình ảnh và âm thanh.
- Cascade 4 cấp, hiệu chỉnh độ tin cậy (temperature scaling), ghi cấp suy luận để tính chi phí AI.
- Model Manager (tải, cập nhật, chọn CPU/GPU); hàng đợi duyệt; màn hình Nhãn.

**Đầu ra:** gói mô hình ONNX, module AI tích hợp vào ứng dụng, báo cáo đánh giá trên benchmark vàng, đường cong chi phí–chất lượng.

**Tiêu chí nghiệm thu:**

- Macro-F1 trên benchmark vàng: văn bản ≥ 0,85; ảnh ≥ 0,85; âm thanh ≥ 0,80; video ≥ 0,80.
- Sai số hiệu chỉnh ECE ≤ 0,08; ASR tiếng Việt: đo và báo cáo WER (mục tiêu khởi điểm ≤ 25%, hiệu chỉnh sau spike).
- Cascade giảm ≥ 40% thời gian suy luận so với luôn chạy mô hình lớn, F1 giảm ≤ 2 điểm.
- Thông lượng trên CPU máy chuẩn: ảnh ≥ 5 ảnh/giây; văn bản ≥ 20 tài liệu/giây; audio ≥ 2× thời gian thực; video xử lý ≤ 0,5× thời lượng.
- Chạy được hoàn toàn offline sau khi đã tải mô hình.

### Phase 3 – Sắp xếp, định tuyến lưu trữ và tùy chỉnh (Tháng 6–8) → v0.3 Beta 1

**Mục tiêu:** biến kết quả AI thành hành động sắp xếp an toàn, có kiểm soát, tùy chỉnh được.

**Hoạt động:**

- Quản lý Storage Location (thêm/sửa/xóa, kiểm tra quyền, dung lượng trống, vai trò tầng).
- Rule engine, trình soạn luật trực quan, template đường dẫn có biến, kiểm tra cú pháp.
- **Storage Router** bản desktop: quyết định thư mục đích, kiểu lưu, nén (theo mục 5a tài liệu kiến trúc).
- Dry-run hiển thị cây thư mục trước/sau; thực thi theo lô, **nhật ký giao dịch (journal)** để khôi phục khi lỗi; **Undo** theo lô.
- Chế độ sao chép-xác minh-rồi-xóa; xử lý xung đột tên; kéo thả ghi đè thủ công.
- Vòng học từ chỉnh sửa người dùng (lưu phản hồi, cập nhật ngưỡng và gợi ý).

**Đầu ra:** bản v0.3, bộ luật mẫu (theo loại, theo thời gian, theo dự án), hướng dẫn sử dụng, báo cáo kiểm thử an toàn dữ liệu.

**Tiêu chí nghiệm thu:**

- **0 mất hoặc hỏng dữ liệu** qua 10.000 thao tác di chuyển/sao chép (so checksum trước và sau).
- Undo thành công 100% trong 1.000 kịch bản, gồm cả khi tắt đột ngột giữa chừng.
- Kết quả dry-run khớp 100% với thực thi; hỗ trợ ≥ 12 biến template và ≥ 3 loại Storage Location (nội bộ, ổ ngoài, NAS).
- Người dùng mới tạo luật và sắp xếp 1.000 tệp ≤ 10 phút (kiểm thử khả dụng, n ≥ 8).
- Tỷ lệ chấp nhận gợi ý top-1 của AI ≥ 85% trong hàng đợi duyệt.

### Phase 4 – Tìm kiếm và truy xuất (Tháng 7–9) → v0.4

**Mục tiêu:** tìm đúng dữ liệu nhanh bằng ngôn ngữ tự nhiên, kể cả chéo modality.

**Hoạt động:**

- Chỉ mục từ khóa SQLite FTS5 (tiếng Việt có dấu và không dấu).
- Chỉ mục vector (LanceDB/sqlite-vec), embedding chung cho chéo modality (CLIP/SigLIP/ImageBind).
- Hybrid search (BM25 + vector, hợp nhất bằng RRF), rerank tùy chọn, bộ lọc metadata.
- Tìm bằng ảnh mẫu, bộ sưu tập thông minh (lưu truy vấn), xem trước trong kết quả.
- Truy xuất nhận biết tầng: trả metadata/thumbnail trước, báo rõ tệp đang ở tầng chậm.

**Đầu ra:** module tìm kiếm tích hợp, bộ truy vấn kiểm thử có nhãn liên quan, báo cáo đánh giá truy xuất.

**Tiêu chí nghiệm thu:**

- Recall@10 ≥ 0,80 cho truy vấn văn bản → ảnh trên tập kiểm thử (Flickr30k tập con hoặc bộ nội bộ).
- nDCG@10 của hybrid cao hơn BM25 đơn thuần ≥ 10% (tương đối).
- Độ trễ p95 ≤ 300 ms với 100.000 mục (chỉ mục trên SSD).
- Tìm đúng khi gõ có dấu và không dấu ≥ 95% trên 200 truy vấn kiểm thử.

### Phase 5 – Phân tầng và phân tích chi phí (Tháng 8–10) → v0.5 Beta 2

**Mục tiêu:** gợi ý và thực hiện phân tầng nóng–ấm–lạnh, chứng minh được lợi ích chi phí.

**Hoạt động:**

- Ghi nhận truy cập ở mức ứng dụng (có theo dõi tùy chọn); không dựa riêng vào thời gian truy cập của hệ điều hành vì không đáng tin.
- Bộ **mô phỏng log truy cập** (Zipf, suy giảm theo tuổi, chu kỳ ngày/tuần, bùng nổ, tương quan ngữ nghĩa).
- Mô hình tiering: baseline (luật theo tuổi, LRU/LFU) so với LightGBM; thêm đặc trưng ngữ nghĩa và xử lý cold start; chọn tầng bằng hàm chi phí kỳ vọng.
- Bộ lập lịch di chuyển chạy lúc máy rảnh, chống thrashing (hysteresis, thời gian lưu tối thiểu).
- Dashboard Insights: chi phí theo đơn giá người dùng nhập, gợi ý di chuyển, **chi phí suy luận AI** tính vào TCO.

**Đầu ra:** bản v0.5, mô hình tiering và bộ mô phỏng, báo cáo so sánh B0–B3 với P1–P3, dashboard chi phí.

**Tiêu chí nghiệm thu (trên log mô phỏng, nêu rõ tham số):**

- Giảm chi phí lưu trữ ≥ 30% so với B0 (tất cả ở tầng nóng) và ≥ 10% so với B2 (luật theo tuổi), độ trễ truy xuất trung bình tăng ≤ 10%.
- PR-AUC dự đoán truy cập cao hơn baseline ≥ 0,05; đặc trưng ngữ nghĩa cải thiện dự đoán cold start (báo cáo kèm ablation).
- Tỷ lệ di chuyển vô ích ≤ 5%.
- TCO gồm cả chi phí AI vẫn thấp hơn baseline.
- Người dùng thay đổi được đơn giá/GB và thấy dashboard cập nhật ≤ 2 giây.

### Phase 6 – Hoàn thiện, bảo mật và đóng gói (Tháng 10–11) → Release Candidate

**Mục tiêu:** bản cài đặt ổn định, an toàn, dễ dùng cho người dùng không chuyên.

**Hoạt động:**

- Trình cài đặt (MSI/NSIS), ký số, tự cập nhật; kiểm tra cảnh báo diệt virus với bản đóng gói PyInstaller.
- Mã hóa tùy chọn cho thư mục đích, phát hiện PII cục bộ (Presidio hoặc NER tùy chỉnh), nhật ký kiểm toán, chế độ chỉ-đọc.
- Tối ưu hiệu năng và bộ nhớ, giới hạn CPU khi chạy nền, tiếp tục sau khi ngủ/tắt máy.
- Giao diện song ngữ Việt/Anh, khả năng truy cập, tài liệu hướng dẫn, onboarding lần đầu.
- Beta kín với người dùng thật, sửa lỗi theo mức độ nghiêm trọng.

**Đầu ra:** bộ cài RC, tài liệu người dùng, báo cáo kiểm thử hiệu năng/bảo mật/khả dụng.

**Tiêu chí nghiệm thu:**

- Cài sạch trên Windows 10/11 ≤ 3 phút; bộ cài ≤ 300 MB (chưa gồm mô hình).
- RAM nhàn rỗi ≤ 500 MB; khi xử lý ≤ 4 GB; CPU nền ≤ 50% khi bật chế độ giới hạn.
- Crash-free ≥ 99% qua 200 phiên beta; 0 lỗi mức nghiêm trọng (S1/S2) còn mở.
- SUS (System Usability Scale) ≥ 70 với n ≥ 10; tỷ lệ hoàn thành nhiệm vụ chính ≥ 90%.
- Recall phát hiện PII ≥ 0,85 trên mẫu kiểm thử; 0 dữ liệu gửi ra ngoài khi tắt tính năng mạng (xác minh bằng giám sát lưu lượng).

### Phase 7 – Đánh giá, nghiệm thu và công bố (Tháng 11–12) → v1.0

**Mục tiêu:** có kết quả thực nghiệm tái lập được và bản phát hành nghiệm thu.

**Hoạt động:**

- Chạy các kịch bản thực nghiệm B0–B3 và P1–P3, ablation, độ nhạy tham số, drift, quy mô 1×/10×/100× (theo mục 7 tài liệu kiến trúc); lặp ≥ 5 seed.
- Nghiên cứu người dùng so sánh **thủ công và có phần mềm** trên cùng khối lượng tệp.
- Viết báo cáo tổng kết, bài báo, phát hành mã nguồn, video demo, sổ tay vận hành.
- Họp nghiệm thu đối chiếu scoreboard.

**Đầu ra:** v1.0, báo cáo tổng kết, bài báo, kho mã nguồn, bộ dữ liệu benchmark và bộ mô phỏng, video demo.

**Tiêu chí nghiệm thu:** đạt ≥ 90% chỉ số **Must** trong scoreboard (mục 6) và không còn lỗi S1/S2.

## 6. Scoreboard nghiệm thu sản phẩm v1.0

| Nhóm | Chỉ số | Mục tiêu | Phase đo |
| --- | --- | --- | --- |
| Chất lượng AI | Macro-F1 văn bản / ảnh | ≥ 0,85 / ≥ 0,85 | P2 |
| Chất lượng AI | Macro-F1 âm thanh / video | ≥ 0,80 / ≥ 0,80 | P2 |
| Hiệu quả AI | Giảm thời gian suy luận nhờ cascade | ≥ 40%, F1 giảm ≤ 2 điểm | P2 |
| An toàn dữ liệu | Mất/hỏng dữ liệu qua 10.000 thao tác | 0 | P3 |
| An toàn dữ liệu | Tỷ lệ hoàn tác thành công | 100% | P3 |
| Tùy chỉnh | Biến template / loại Storage Location | ≥ 12 / ≥ 3 | P3 |
| Truy xuất | Recall@10 chéo modality | ≥ 0,80 | P4 |
| Truy xuất | Độ trễ p95 (100.000 mục) | ≤ 300 ms | P4 |
| Chi phí | Giảm chi phí lưu trữ so với B0 / B2 | ≥ 30% / ≥ 10% | P5 |
| Chi phí | TCO có tính chi phí AI thấp hơn baseline | Đạt | P5 |
| Hiệu năng | Quét 100.000 tệp (metadata + hash) | ≤ 30 phút | P1 |
| Ổn định | Crash-free sessions | ≥ 99% | P6 |
| Trải nghiệm | SUS / hoàn thành nhiệm vụ chính | ≥ 70 / ≥ 90% | P6 |
| Hiệu quả vận hành | Giảm thời gian sắp xếp so với thủ công (baseline đo ở P0) | ≥ 60% | P7 |
| Quyền riêng tư | Dữ liệu rời máy khi tắt tính năng mạng | 0 | P6 |

## 7. Đội ngũ và nguồn lực

| Vai trò | Số lượng | Trách nhiệm chính |
| --- | --- | --- |
| PM/BA | 1 | Yêu cầu, backlog, nghiệm thu, quản lý rủi ro |
| Kỹ sư AI/ML | 2 | Mô hình, cascade, tiering, mô phỏng, đánh giá |
| Lập trình desktop/full-stack | 2 | Ứng dụng, sidecar, rule engine, đóng gói |
| Kỹ sư dữ liệu/tìm kiếm | 0,5–1 | Kho metadata, FTS, vector, di chuyển dữ liệu |
| UX/UI | 0,5 | Wireframe, thiết kế, kiểm thử khả dụng |
| QA | 0,5 | Kiểm thử tự động, an toàn dữ liệu, hiệu năng |

Ước tính khoảng 60–70 người-tháng. Hạ tầng: 1 máy chủ có GPU 16–24 GB cho huấn luyện, 2–3 máy chuẩn (không GPU) để đo hiệu năng, kho lưu trữ tối thiểu 1 TB SSD và 4 TB HDD cho benchmark.

## 8. Rủi ro chính và biện pháp

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| Mô hình AI quá nặng cho máy cá nhân | Cao | ONNX + INT8, cascade, tải mô hình theo nhu cầu, chế độ chạy nền có giới hạn |
| Mất hoặc hỏng dữ liệu khi sắp xếp | Cao | Mặc định sao chép + checksum, dry-run, journal, undo, chế độ chỉ-đọc |
| Thiếu log truy cập thực cho tiering | Cao | Mô phỏng có kiểm soát + trace công khai + dogfooding có đồng ý; nêu rõ giới hạn trong báo cáo |
| Thời gian truy cập của hệ điều hành không đáng tin | Trung bình | Ghi nhận ở mức ứng dụng, kết hợp watcher |
| Chất lượng tiếng Việt chưa đạt | Trung bình | PhoBERT, BGE-M3, fine-tune thêm, đánh giá riêng tiếng Việt |
| Phạm vi phình to | Cao | MoSCoW, đóng băng phạm vi sau v0.3, backlog tách riêng cho mục Could |
| Bộ cài bị diệt virus chặn | Trung bình | Ký số, kiểm tra sớm từ v0.1, tránh mã tự giải nén |
| Chênh lệch giữa môi trường nghiên cứu và desktop | Trung bình | Giữ chung giao diện module Python, kiểm thử hồi quy trên cả hai |

## 9. Bước tiếp theo

1. Xác nhận giả định ở mục 1: nền tảng ưu tiên, quy mô đội, thời lượng, có cần kết nối NAS/S3 ngay từ v1.0 hay không.
2. Thu thập một mẫu dữ liệu thật (đã ẩn danh) để thiết kế taxonomy nhãn và benchmark vàng.
3. Bắt đầu Phase 0: wireframe và spike kỹ thuật song song trong 2 tuần đầu.
