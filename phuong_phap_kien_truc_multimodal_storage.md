# Phương pháp và kiến trúc ứng dụng AI trong tổ chức, lưu trữ dữ liệu đa phương thức (Multimodal)

> Tài liệu đề xuất phương pháp thực hiện chi tiết, kiến trúc hệ thống và công nghệ sử dụng cho đề tài.
> Các con số (chi phí, ngưỡng, kích thước mẫu) là **giá trị khởi điểm để tham số hoá**, cần hiệu chỉnh bằng thực nghiệm sơ bộ.

---

## 0. Quy ước thuật ngữ

| Thuật ngữ | Nghĩa trong đề tài |
|---|---|
| **Multimodal data** | Dữ liệu nhiều dạng: văn bản, ảnh, âm thanh, video (và bán cấu trúc như JSON, log, cảm biến). Đây là nghĩa được dùng xuyên suốt. |
| **Multi-model database** | Một hệ CSDL hỗ trợ nhiều mô hình dữ liệu (ArangoDB, Cosmos DB). **Không** phải đối tượng của đề tài. |
| **Polyglot persistence** | Dùng nhiều hệ lưu trữ khác nhau, mỗi hệ cho loại dữ liệu phù hợp. Đây là cách tổ chức lưu trữ của đề tài. |
| **Hot / Warm / Cold** | Ba tầng lưu trữ theo tần suất truy cập: nhanh và đắt, trung bình, chậm và rẻ. |

---

## 1. Hình thức hoá bài toán

**Đầu vào:** luồng đối tượng dữ liệu `o_i = (bytes, modality, size, timestamp, source, [access_log])`.

**Đầu ra:**
1. Thông tin hiểu được từ nội dung: nhãn, metadata, thực thể, embedding.
2. Quyết định lưu trữ: backend `b` (quan hệ, NoSQL, vector DB, object storage), tầng `t ∈ {hot, warm, cold}`, kiểu nén.

**Hàm mục tiêu (tối thiểu hoá tổng chi phí vận hành):**

```
min  Σ_i [ S_i · c(t_i)  +  λ · E[N_i] · ℓ(t_i)  +  c_mig(t_i_prev → t_i) ]  +  C_AI

ràng buộc:
  - Σ S_i trên mỗi tầng ≤ dung lượng tầng
  - Độ trễ p95 truy xuất tầng hot ≤ X ms
  - Recall@k của truy xuất ≥ R
  - Độ chính xác phân loại (F1) ≥ F
```

| Ký hiệu | Ý nghĩa |
|---|---|
| `S_i` | Kích thước đối tượng i (GB) |
| `c(t)` | Chi phí lưu trữ mỗi GB mỗi tháng của tầng t |
| `E[N_i]` | Số lần truy cập kỳ vọng của đối tượng i trong chân trời dự báo H |
| `ℓ(t)` | Độ trễ hoặc phí truy xuất của tầng t |
| `λ` | Hệ số đổi độ trễ ra chi phí, thể hiện mức ưu tiên hiệu năng so với chi phí |
| `c_mig` | Chi phí di chuyển dữ liệu giữa các tầng |
| `C_AI` | Chi phí suy luận AI (GPU/CPU), **bắt buộc tính vào** để kết luận có sức thuyết phục |

Đây là bài toán tối ưu đa mục tiêu có ràng buộc. Đề tài giải bằng cách chia thành hai bài toán con: **(A) hiểu nội dung** và **(B) quyết định đặt dữ liệu ở đâu**, trong đó (A) cung cấp đặc trưng cho (B).

---

## 2. Kiến trúc tổng thể

```
 L0  NGUỒN DỮ LIỆU
 │   upload API · crawler · IoT/cảm biến · log hệ thống · bộ dữ liệu công khai
 ▼
 L1  INGESTION & LANDING ZONE
 │   FastAPI · Kafka · MinIO (bucket landing)
 │   nhận diện định dạng · checksum · khử trùng lặp · kiểm tra hợp lệ
 ▼
 L2  TIỀN XỬ LÝ THEO MODALITY
 │   Văn bản: trích xuất, chuẩn hoá, chia đoạn
 │   Ảnh: resize, đọc EXIF       Âm thanh: resample, VAD
 │   Video: tách cảnh, lấy keyframe, tách audio track
 ▼
 L3  AI UNDERSTANDING (suy luận theo tầng, cascade)
 │   Phân loại · gắn nhãn · NER/OCR/ASR · embedding · fusion đa phương thức
 │   Serving: Triton / Ray Serve / ONNX Runtime
 ▼
 L4  UNIFIED METADATA & EMBEDDING
 │   Lược đồ metadata chung cho mọi modality + vector embedding
 ▼
 L5  POLICY ENGINE (lõi đóng góp của đề tài)
 │   5a. Storage Router : chọn backend theo loại và đặc tính dữ liệu
 │   5b. Tiering Optimizer : dự đoán truy cập, chọn tầng hot/warm/cold
 │   5c. Migration Scheduler : lập lịch di chuyển, tránh thrashing
 ▼
 L6  HYBRID STORAGE LAYER
 │   PostgreSQL · MongoDB · OpenSearch · Milvus/pgvector · MinIO (hot/warm/cold) · Redis
 ▼
 L7  RETRIEVAL LAYER
 │   Query API · hybrid search (BM25 + vector) · cross-modal · rerank · cache · prefetch
 ▼
 L8  OBSERVABILITY & MLOps (bao trùm mọi tầng)
     Prometheus · Grafana · MLflow · Evidently · DVC · log truy cập (nguồn huấn luyện cho 5b)
```

**Vòng phản hồi:** log truy cập ở L7 → L8 → huấn luyện lại mô hình ở 5b → cập nhật chính sách → ảnh hưởng quyết định ở L6.

---

## 3. Chi tiết từng tầng

### 3.1. L1 – Ingestion và Landing Zone

**Mục đích:** nhận dữ liệu thô, xác định nhanh loại dữ liệu, loại bỏ trùng lặp, chưa xử lý nặng.

| Bước | Kỹ thuật | Công cụ |
|---|---|---|
| Nhận dữ liệu | REST/multipart upload, batch import, stream | FastAPI, Kafka (hoặc Redpanda) |
| Nhận diện loại tệp | Magic bytes + phần mở rộng + MIME | `python-magic`, Apache Tika |
| Kiểm tra toàn vẹn | SHA-256 | `hashlib` |
| Khử trùng lặp chính xác | So khớp SHA-256 | Redis / PostgreSQL |
| Khử trùng lặp gần đúng | pHash/dHash (ảnh), MinHash/SimHash (văn bản), audio fingerprint | `imagehash`, `datasketch`, `chromaprint` |
| Điều phối | DAG xử lý theo lô và theo sự kiện | Apache Airflow hoặc Prefect |
| Lưu thô | Ghi vào bucket `landing` | MinIO |

Khử trùng lặp là cách tiết kiệm chi phí đầu tiên, cần đo riêng (tỷ lệ dung lượng tiết kiệm được) để tách đóng góp của nó khỏi đóng góp của AI.

### 3.2. L2 – Tiền xử lý theo modality

| Modality | Các bước | Công cụ |
|---|---|---|
| **Văn bản** | Trích xuất từ PDF/DOCX/HTML, chuẩn hoá Unicode (NFC), tách từ tiếng Việt, nhận diện ngôn ngữ, chia đoạn (chunk 256–512 token, chồng lấn 10–20%) | Apache Tika, `underthesea`/VnCoreNLP, `langdetect`, LangChain text splitters |
| **Ảnh** | Giải mã, resize (224/384), đọc EXIF (thời gian, GPS), chuẩn hoá màu | Pillow, OpenCV |
| **Âm thanh** | Chuyển mono 16 kHz, cắt khoảng lặng bằng VAD, chia đoạn 30 s | FFmpeg, `librosa`, Silero VAD |
| **Video** | Phát hiện ranh giới cảnh, lấy keyframe (1 khung mỗi cảnh hoặc mỗi N giây), tách audio track, đọc metadata (codec, độ dài, fps) | FFmpeg, PySceneDetect, `decord` |
| **Bán cấu trúc** (JSON, log, cảm biến) | Suy luận schema, làm phẳng, thống kê trường | `pandas`, `jsonschema`, GenSON |

Mẹo thiết kế: **video được phân rã thành ảnh + âm thanh + văn bản (ASR)** rồi dùng lại các mô hình của modality con. Cách này tránh phải triển khai riêng một mô hình video nặng cho mọi đối tượng.

### 3.3. L3 – AI Understanding

#### 3.3.1. Mô hình theo tác vụ

| Modality | Phân loại / gắn nhãn | Trích xuất thông tin | Embedding |
|---|---|---|---|
| **Văn bản** | PhoBERT (tiếng Việt) hoặc XLM-R/mDeBERTa (đa ngữ) fine-tune; baseline TF-IDF + Logistic Regression | NER (underthesea / PhoBERT-NER), keyphrase (KeyBERT), tóm tắt (tuỳ chọn) | BGE-M3 hoặc multilingual-e5 |
| **Ảnh** | CLIP/SigLIP zero-shot và linear probe; ViT/ConvNeXt fine-tune | Phát hiện vật thể (YOLO), OCR (PaddleOCR), caption (BLIP-2, tuỳ chọn) | CLIP/SigLIP image encoder |
| **Âm thanh** | AST hoặc PANNs (sự kiện âm thanh), phân loại giọng nói/nhạc/tiếng ồn | ASR (Whisper, faster-whisper) → văn bản; nhận diện người nói (pyannote, tuỳ chọn) | CLAP, hoặc embedding của transcript |
| **Video** | Phân loại trên keyframe + audio; X-CLIP/VideoMAE (tuỳ chọn, chỉ khi cần) | Transcript từ audio track, OCR trên keyframe, nhãn vật thể theo cảnh | Trung bình/attention-pooling embedding keyframe + embedding transcript |
| **Đa phương thức** | ImageBind hoặc CLIP-style để đưa các modality vào không gian chung | VLM (Qwen2-VL, LLaVA) cho chú thích giàu ngữ nghĩa, chỉ chạy khi cần | Không gian embedding chung cho truy xuất chéo modality |

#### 3.3.2. Suy luận theo tầng (cascade) để kiểm soát chi phí AI

Không nên chạy mô hình nặng trên mọi đối tượng. Dùng chiến lược **từ rẻ đến đắt**, dừng khi đủ tự tin:

```
Cấp 1 (rất rẻ)   : luật theo định dạng/kích thước/metadata tệp
Cấp 2 (rẻ)       : mô hình nhỏ (TF-IDF+LR, MobileNet, Whisper-tiny/base, embedding nhẹ)
Cấp 3 (trung bình): mô hình lớn (PhoBERT, CLIP ViT-L, Whisper-small/medium)
Cấp 4 (đắt)      : VLM / mô hình video, chỉ cho đối tượng độ tự tin thấp hoặc giá trị cao

Dừng ở cấp k nếu  max_prob ≥ τ_k  (τ_k hiệu chỉnh bằng validation set)
```

Pseudo-code:

```python
def understand(obj):
    feats = cheap_rules(obj)                      # cấp 1
    for level, model, tau in CASCADE[obj.modality]:
        pred, conf = model.predict(obj, feats)
        if conf >= tau:
            return pred, conf, level              # ghi lại level để tính C_AI
    return pred, conf, "max_level"
```

Cần ghi lại **cấp suy luận đã dùng** cho từng đối tượng để tính `C_AI` chính xác (GPU-giây hoặc đô la quy đổi).

#### 3.3.3. Hiệu chỉnh độ tự tin

Dùng temperature scaling hoặc isotonic regression để `conf` phản ánh xác suất đúng thực sự. Đánh giá bằng ECE (Expected Calibration Error). Nếu không hiệu chỉnh, ngưỡng τ của cascade sẽ không đáng tin.

#### 3.3.4. Hạ tầng phục vụ mô hình

- Xuất mô hình sang ONNX/TensorRT khi có thể; lượng tử hoá INT8 cho mô hình lớn.
- Triton Inference Server hoặc Ray Serve; **dynamic batching** để tăng throughput GPU.
- Xử lý bất đồng bộ qua hàng đợi (Kafka consumer), không chặn đường upload.

### 3.4. L4 – Lược đồ metadata thống nhất

Mọi đối tượng, bất kể modality, được mô tả bằng một lược đồ chung. Ví dụ:

```json
{
  "object_id": "obj_01HZX...",
  "sha256": "9f86d0...",
  "modality": "video",
  "mime": "video/mp4",
  "size_bytes": 184223011,
  "created_at": "2026-10-01T08:30:00Z",
  "source": "upload_api",
  "technical": { "duration_s": 312.4, "fps": 30, "codec": "h264", "resolution": "1920x1080" },
  "semantic": {
    "labels": [{"name": "giáo dục", "score": 0.91}, {"name": "bài giảng", "score": 0.84}],
    "entities": [{"text": "Thái Nguyên", "type": "LOC"}],
    "transcript_ref": "doc_7731",
    "language": "vi",
    "inference_level": 3
  },
  "embedding": { "model": "siglip-base+bge-m3", "dim": 1024, "vector_ref": "vec_55120" },
  "storage": {
    "primary_backend": "minio",
    "tier": "warm",
    "uri": "s3://warm/video/2026/10/obj_01HZX.mp4",
    "last_tier_change": "2026-10-20T00:00:00Z"
  },
  "access": { "count_1d": 0, "count_7d": 3, "count_30d": 11, "last_access": "2026-10-28T14:02:00Z" },
  "predicted": { "p_access_7d": 0.18, "model_version": "tier-lgbm-v3" },
  "security": { "contains_pii": false, "retention_days": 365 }
}
```

Quan trọng: `storage` và `access` nằm trong cùng lược đồ để Policy Engine truy vấn một nơi duy nhất.

### 3.5. L5 – Policy Engine (phần lõi của đề tài)

#### 5a. Storage Router – chọn backend

Mức đầu dùng bảng luật có thể giải thích được, sau đó so sánh với bộ định tuyến học máy (tuỳ chọn):

| Thành phần dữ liệu | Backend | Lý do |
|---|---|---|
| Metadata có cấu trúc, quan hệ (đối tượng, người dùng, nhãn, chính sách) | **PostgreSQL** | Toàn vẹn quan hệ, truy vấn SQL, JOIN |
| Tài liệu JSON linh hoạt, kết quả OCR/NER theo từng đối tượng | **MongoDB** | Schema linh hoạt, ghi nhanh |
| Văn bản/transcript cần tìm kiếm từ khoá | **OpenSearch/Elasticsearch** | Inverted index, BM25 |
| Vector embedding | **Milvus** (hoặc Qdrant; `pgvector` cho quy mô nhỏ) | ANN index (HNSW/IVF) |
| Tệp nhị phân lớn (ảnh, video, âm thanh, PDF gốc) | **MinIO (object storage)** | Rẻ, mở rộng ngang, phân tầng |
| Kết quả truy vấn nóng, phiên | **Redis** | Độ trễ thấp |

Nguyên tắc: **tệp lớn nằm ở object storage, các hệ khác chỉ giữ con trỏ (`uri`) và biểu diễn nhỏ** (metadata, embedding, văn bản trích xuất). Cách này tránh nhồi blob vào CSDL.

#### 5b. Tiering Optimizer – chọn tầng hot/warm/cold

**Đặc trưng đầu vào (feature engineering):**

| Nhóm | Đặc trưng |
|---|---|
| Thuộc tính tĩnh | modality, kích thước, định dạng, tuổi đối tượng, nguồn |
| Lịch sử truy cập | số lần truy cập cửa sổ 1h/1d/7d/30d, thời gian từ lần truy cập cuối, độ đều, xu hướng tăng/giảm |
| Thời gian | giờ trong ngày, thứ trong tuần, cuối tuần/lễ |
| **Ngữ nghĩa (từ AI)** | nhãn chủ đề, cụm embedding (cluster id), mức phổ biến trung bình của các đối tượng tương tự, điểm "quan trọng/thời sự" |

Nhóm ngữ nghĩa là điểm khác biệt của đề tài so với tiering truyền thống chỉ nhìn vào tuổi và tần suất. Nó đặc biệt hữu ích cho **cold start**: đối tượng mới chưa có lịch sử truy cập vẫn được dự đoán dựa vào các đối tượng tương tự.

**Ba cấp mô hình, triển khai và so sánh tăng dần:**

| Cấp | Phương pháp | Vai trò |
|---|---|---|
| T0 | Luật theo tuổi/ngưỡng (kiểu S3 Lifecycle), LRU, LFU | Baseline |
| T1 | **LightGBM/XGBoost** dự đoán `P(truy cập trong H ngày)`; sau đó chọn tầng bằng ngưỡng tối ưu theo chi phí | Mô hình chính, dễ giải thích |
| T2 | LSTM/Temporal Fusion Transformer dự báo chuỗi thời gian truy cập | So sánh, khi có chuỗi dài |
| T3 | **Học tăng cường** (DQN/PPO, Stable-Baselines3): trạng thái = đặc trưng + mức đầy các tầng; hành động = {giữ, lên tầng, xuống tầng}; phần thưởng = −(chi phí lưu trữ + phạt độ trễ + chi phí di chuyển) | Hướng mở rộng, chạy trên mô phỏng |

**Chọn tầng từ xác suất (T1):** với mỗi đối tượng, so sánh chi phí kỳ vọng ở từng tầng:

```
cost(t) = S · c(t) · H  +  λ · p · ℓ(t)  +  c_mig(t_hiện_tại → t)
tầng chọn = argmin_t cost(t)
```

Điều này nối trực tiếp dự đoán với hàm mục tiêu ở mục 1, thay vì chọn ngưỡng tuỳ ý.

**Chống thrashing (di chuyển qua lại liên tục):**
- Hysteresis: ngưỡng lên tầng cao hơn ngưỡng xuống tầng.
- Thời gian lưu tối thiểu tại tầng (minimum residency).
- Chỉ di chuyển nếu lợi ích kỳ vọng > chi phí di chuyển × hệ số an toàn.

#### 5c. Migration Scheduler

- Chạy theo lô vào giờ thấp điểm; giới hạn băng thông di chuyển.
- Hàng đợi ưu tiên: đối tượng có lợi ích kỳ vọng lớn nhất xử lý trước.
- Thực thi bằng **MinIO ILM / tiering tới remote tier** hoặc script copy giữa các bucket (hot SSD → warm HDD → cold nén/erasure coding), cập nhật `storage.uri` và `tier` trong metadata theo kiểu giao dịch (copy xong, kiểm tra checksum, rồi mới xoá bản cũ).
- Cold: có thể nén mạnh hơn (zstd mức cao cho văn bản/log; giữ nguyên với ảnh/video đã nén sẵn) và gộp tệp nhỏ thành archive để giảm overhead metadata.

### 3.6. L6 – Lớp lưu trữ lai

**Cấu hình tầng (tham số hoá, thay bằng bảng giá/thông số thực tế):**

| Tầng | Phương tiện | Chi phí tương đối `c(t)` | Độ trễ `ℓ(t)` | Dùng cho |
|---|---|---|---|---|
| Hot | NVMe/SSD | 1.0 | ~ms | Dữ liệu truy cập thường xuyên, mới |
| Warm | HDD / object storage chuẩn | 0.4 | ~10–100 ms | Truy cập thỉnh thoảng |
| Cold | Archive, erasure coding, nén cao | 0.1 | giây tới phút (kèm phí/độ trễ rehydrate) | Dữ liệu hiếm khi dùng, lưu trữ dài hạn |

Các hệ chỉ mục (PostgreSQL, OpenSearch, Milvus) đặt trên SSD vì cần độ trễ thấp; **chỉ tệp nhị phân gốc** mới được phân tầng. Với vector DB, kích thước embedding nhỏ nên thường giữ ở hot; có thể áp dụng quantization (PQ/SQ) để giảm bộ nhớ.

### 3.7. L7 – Lớp truy xuất

**Các kiểu truy vấn hỗ trợ:**

| Kiểu | Ví dụ | Cơ chế |
|---|---|---|
| Theo metadata | "video dài > 5 phút, nguồn X, tháng 10" | SQL/Mongo filter |
| Từ khoá | "học phí 2026" | BM25 (OpenSearch) |
| Ngữ nghĩa cùng modality | Ảnh tương tự một ảnh mẫu | Vector ANN |
| **Chéo modality** | Nhập văn bản, trả về ảnh/video/audio liên quan | Không gian embedding chung (CLIP/SigLIP/ImageBind) |
| **Hybrid** | Từ khoá + ngữ nghĩa + bộ lọc metadata | Reciprocal Rank Fusion (RRF) hoặc trọng số, rồi rerank (cross-encoder, bge-reranker) |

**Tối ưu theo tầng lưu trữ (tier-aware retrieval):**
- Tìm kiếm trên chỉ mục (luôn ở hot), chỉ chạm vào object storage khi cần trả về nội dung.
- Nếu kết quả nằm ở cold: trả về metadata, thumbnail, transcript trước, rehydrate bất đồng bộ.
- **Prefetch dựa trên ngữ nghĩa:** khi một đối tượng được truy cập, nâng tạm các đối tượng cùng cụm embedding lên warm/hot.
- Cache kết quả truy vấn phổ biến bằng Redis; TTL theo độ nóng của truy vấn.

### 3.8. L8 – Giám sát và MLOps

| Hạng mục | Công cụ | Dùng để |
|---|---|---|
| Số liệu hệ thống | Prometheus + Grafana | Latency p50/p95/p99, throughput, mức đầy tầng, chi phí |
| Theo dõi thí nghiệm | MLflow | Tham số, chỉ số, phiên bản mô hình |
| Phiên bản dữ liệu | DVC | Tái lập thí nghiệm |
| **Phát hiện concept drift** | Evidently AI | Mẫu truy cập hoặc phân phối nội dung thay đổi → kích hoạt huấn luyện lại |
| Log tập trung | OpenTelemetry, Loki/ELK | Truy vết yêu cầu qua các tầng |
| Triển khai | Docker Compose (thử nghiệm), Kubernetes (mở rộng) | Đóng gói, tái lập |

### 3.9. Bảo mật và quyền riêng tư (xuyên suốt)

- Mã hoá khi lưu (SSE của MinIO) và khi truyền (TLS).
- Phân quyền: Keycloak (OIDC) + RBAC; ghi audit log mọi lần truy cập.
- Phát hiện PII bằng Microsoft Presidio hoặc NER tuỳ chỉnh; đối tượng chứa PII có thể bị cấm hạ xuống tầng ngoài vùng kiểm soát hoặc áp chính sách lưu giữ riêng.
- Chính sách retention/xoá theo thời hạn.

---

## 4. Tổng hợp công nghệ

| Lớp | Công nghệ đề xuất | Lựa chọn thay thế |
|---|---|---|
| Ngôn ngữ chính | Python 3.11+ | |
| API | FastAPI | Flask, gRPC |
| Hàng đợi/stream | Kafka | Redpanda, RabbitMQ |
| Điều phối | Apache Airflow | Prefect, Dagster |
| Tiền xử lý | FFmpeg, OpenCV, Pillow, librosa, PySceneDetect, Apache Tika, underthesea | VnCoreNLP |
| Mô hình văn bản | PhoBERT, XLM-R, BGE-M3, multilingual-e5 | |
| Mô hình ảnh | CLIP, SigLIP, ViT, YOLO, PaddleOCR | EasyOCR |
| Mô hình âm thanh | Whisper/faster-whisper, AST/PANNs, CLAP | wav2vec 2.0 |
| Mô hình video | Pipeline keyframe + audio; X-CLIP/VideoMAE (tuỳ chọn) | |
| VLM (tuỳ chọn) | Qwen2-VL, LLaVA | |
| ML cho tiering | LightGBM, XGBoost, PyTorch, Stable-Baselines3 | scikit-learn, Optuna (tinh chỉnh) |
| Serving | Triton, Ray Serve, ONNX Runtime | TorchServe, vLLM (cho VLM) |
| CSDL quan hệ | PostgreSQL (+ pgvector) | MySQL |
| NoSQL tài liệu | MongoDB | |
| Tìm kiếm văn bản | OpenSearch / Elasticsearch | |
| Vector DB | Milvus | Qdrant, Weaviate, FAISS (thư viện) |
| Object storage | MinIO | Ceph, AWS S3 (nếu dùng cloud) |
| Cache | Redis | |
| Giám sát | Prometheus, Grafana, OpenTelemetry | |
| MLOps | MLflow, DVC, Evidently | Weights & Biases |
| Danh tính/bảo mật | Keycloak, Presidio | |
| Hạ tầng | Docker Compose → Kubernetes | |

Khung khởi động nhanh (rút gọn) cho môi trường thử nghiệm:

```yaml
# docker-compose.yml (rút gọn, chỉ minh hoạ các dịch vụ chính)
services:
  postgres:    { image: pgvector/pgvector:pg16, environment: { POSTGRES_PASSWORD: change_me } }
  mongo:       { image: mongo:7 }
  opensearch:  { image: opensearchproject/opensearch:2, environment: { discovery.type: single-node } }
  milvus:      { image: milvusdb/milvus:latest }   # cần etcd + minio đi kèm theo tài liệu Milvus
  minio-hot:   { image: minio/minio, command: server /data --console-address ":9001", volumes: ["./ssd:/data"] }
  minio-warm:  { image: minio/minio, command: server /data, volumes: ["./hdd:/data"] }
  redis:       { image: redis:7 }
  kafka:       { image: bitnami/kafka:latest }
  api:         { build: ./services/api }
  worker-ai:   { build: ./services/ai_worker, deploy: { resources: { reservations: { devices: [{ capabilities: [gpu] }] } } } }
  prometheus:  { image: prom/prometheus }
  grafana:     { image: grafana/grafana }
```

---

## 5. Dữ liệu thử nghiệm

### 5.1. Bộ dữ liệu nội dung (công khai)

| Modality | Gợi ý bộ dữ liệu | Dùng cho |
|---|---|---|
| Văn bản | Tin tức tiếng Việt (tự thu thập hợp pháp hoặc bộ UIT), 20 Newsgroups, AG News, Wikipedia (vi/en) | Phân loại chủ đề, NER, truy xuất |
| Ảnh | COCO, Open Images (tập con), Flickr30k | Phân loại, phát hiện vật thể, cross-modal |
| Âm thanh | Common Voice (tiếng Việt), VIVOS, LibriSpeech, ESC-50 / AudioSet (tập con) | ASR, phân loại âm thanh |
| Video | MSR-VTT, ActivityNet, UCF101, Kinetics (tập con) | Phân loại, truy xuất video–văn bản |
| Bán cấu trúc | Log công khai, dữ liệu cảm biến (UCI), JSON từ API công khai | Suy luận schema, định tuyến |

Cần kiểm tra giấy phép của từng bộ dữ liệu trước khi dùng và ghi rõ trong báo cáo.

### 5.2. Dữ liệu log truy cập (yếu tố quyết định cho phần tiering)

Dữ liệu nội dung công khai **không đi kèm log truy cập thực**, nên cần kết hợp:

1. **Trace thực có sẵn:** MSR Cambridge block I/O traces (SNIA IOTTA), Wikimedia pageview dumps (độ phổ biến theo thời gian), các trace object storage công bố trong tài liệu nghiên cứu. Dùng để hiệu chuẩn mô phỏng và kiểm tra tính hợp lý.
2. **Mô phỏng có kiểm soát:** sinh log truy cập với
   - phân phối độ phổ biến **Zipf** (tham số α thay đổi 0.6–1.2),
   - **suy giảm theo tuổi** (nội dung mới được truy cập nhiều rồi giảm dần),
   - **chu kỳ ngày/tuần**,
   - **bùng nổ ngẫu nhiên** (burst) mô phỏng nội dung lan truyền,
   - **tương quan ngữ nghĩa**: đối tượng cùng chủ đề có xu hướng nóng đồng thời (để kiểm chứng giả thuyết dùng đặc trưng ngữ nghĩa).
3. **Dữ liệu từ hệ thống thực (nếu đơn vị cho phép):** log của hệ thống nội bộ, đã ẩn danh.

Báo cáo cần nói rõ phần kết quả nào dựa trên mô phỏng, phần nào dựa trên trace thực.

---

## 6. Quy trình thực hiện theo giai đoạn

> Giả định thời lượng 12 tháng, điều chỉnh theo đề cương được duyệt.

| Giai đoạn | Thời gian | Nội dung | Sản phẩm |
|---|---|---|---|
| **GĐ1. Khảo sát & thiết kế** | Tháng 1–2 | Tổng quan, xác định research gap, chốt phạm vi modality, đặc tả hàm chi phí, thiết kế lược đồ metadata | Báo cáo tổng quan, đặc tả hệ thống |
| **GĐ2. Hạ tầng & ingestion** | Tháng 2–4 | Dựng stack lưu trữ lai, pipeline ingestion, khử trùng lặp, tiền xử lý | Môi trường chạy được, dữ liệu mẫu đã nạp |
| **GĐ3. Module AI Understanding** | Tháng 4–6 | Fine-tune/đánh giá mô hình từng modality, cascade, hiệu chỉnh độ tự tin, đo `C_AI` | Mô hình, bảng đánh giá F1/độ chính xác, đường cong chi phí–chất lượng |
| **GĐ4. Storage Router & Retrieval** | Tháng 6–8 | Bộ định tuyến backend, chỉ mục vector/văn bản, hybrid & cross-modal search | API truy xuất, đo Recall@k, latency |
| **GĐ5. Tiering Optimizer** | Tháng 7–10 | Sinh log mô phỏng, huấn luyện T1 (LightGBM), so sánh T0/T2/T3, scheduler | Mô hình tiering, kết quả so sánh baseline |
| **GĐ6. Tích hợp, thực nghiệm toàn hệ thống** | Tháng 10–11 | Chạy end-to-end, ablation, kiểm thử quy mô, kiểm thử drift | Bộ kết quả thực nghiệm đầy đủ |
| **GĐ7. Tổng kết** | Tháng 11–12 | Viết báo cáo, bài báo, đóng gói mã nguồn | Báo cáo tổng kết, bài báo, repo mở |

---

## 7. Thiết kế thực nghiệm và đánh giá

### 7.1. Các cấu hình so sánh

| Mã | Mô tả |
|---|---|
| **B0** | Tất cả đối tượng ở một tầng (hot) |
| **B1** | Tất cả đối tượng ở object storage chuẩn, không phân tầng |
| **B2** | Phân tầng theo tuổi (lifecycle rule), không AI |
| **B3** | LRU/LFU theo dung lượng tầng hot |
| **P1** | Hệ đề xuất: AI understanding + định tuyến + tiering LightGBM (đặc trưng truy cập + tĩnh) |
| **P2** | P1 + **đặc trưng ngữ nghĩa** + prefetch theo cụm embedding |
| **P3** | P2 + cascade suy luận để giảm `C_AI` |
| **P4** (mở rộng) | Tiering bằng học tăng cường |

### 7.2. Chỉ số đánh giá

| Nhóm | Chỉ số |
|---|---|
| Hiểu nội dung | Accuracy, macro-F1, WER (ASR), mAP (phát hiện vật thể), ECE (hiệu chỉnh) |
| Truy xuất | Recall@k, MRR, nDCG@k; latency p50/p95/p99; throughput (QPS) |
| Tiering | Tỷ lệ trúng tầng hot (hot hit ratio), số lần di chuyển, tỷ lệ di chuyển vô ích (đưa xuống rồi phải kéo lên trong thời gian ngắn), AUC/PR-AUC của dự đoán truy cập |
| Chi phí | Chi phí lưu trữ/TB/tháng, chi phí di chuyển, **`C_AI`**, **tổng chi phí sở hữu (TCO)** |
| Khả năng mở rộng | Độ trễ và throughput khi tăng dữ liệu 1×, 10×, 100× (có thể bằng mô phỏng) |
| Độ ổn định | Hiệu năng theo thời gian khi có drift; thời gian phục hồi sau huấn luyện lại |

### 7.3. Kịch bản thực nghiệm

1. **So sánh chính:** B0–B3 với P1–P3 trên cùng log truy cập → báo cáo giảm chi phí (%) và thay đổi độ trễ (%).
2. **Ablation:** bỏ đặc trưng ngữ nghĩa, bỏ prefetch, bỏ cascade, bỏ khử trùng lặp → đo đóng góp từng thành phần.
3. **Độ nhạy:** thay đổi `λ`, `H`, tham số Zipf, tỷ lệ dung lượng hot → vẽ đường Pareto (chi phí so với độ trễ).
4. **Cold start:** đo chất lượng dự đoán cho đối tượng mới (chưa có lịch sử) với và không có đặc trưng ngữ nghĩa.
5. **Drift:** đổi mẫu truy cập giữa chừng, so sánh mô hình tĩnh với mô hình huấn luyện lại định kỳ.
6. **Quy mô:** lặp lại ở 1×, 10×, 100× để kiểm tra khả năng mở rộng.

### 7.4. Độ tin cậy thống kê

- Chạy lặp tối thiểu 5 seed cho mô phỏng và huấn luyện; báo cáo trung bình ± độ lệch chuẩn hoặc khoảng tin cậy 95%.
- Chia dữ liệu theo **thời gian** (train quá khứ, test tương lai), không xáo trộn ngẫu nhiên, để tránh rò rỉ dữ liệu.
- Kiểm định ý nghĩa thống kê (Wilcoxon signed-rank hoặc bootstrap) khi so sánh các cấu hình.

---

## 8. Hạ tầng thử nghiệm tối thiểu

| Thành phần | Cấu hình gợi ý |
|---|---|
| Máy chủ chính | 16+ core CPU, 64–128 GB RAM |
| GPU | 1 GPU 16–24 GB VRAM trở lên (ví dụ RTX 3090/4090 hoặc A10/A100 thuê theo giờ) cho fine-tune và suy luận |
| Lưu trữ | SSD NVMe (hot, ≥ 1 TB), HDD (warm/cold, ≥ 4 TB) |
| Môi trường | Docker Compose; có thể dùng Colab/Kaggle cho huấn luyện nhẹ |

Với bộ dữ liệu quy mô lớn, nên **mô phỏng** chi phí và độ trễ cho tầng cold thay vì mua dịch vụ thật, miễn là ghi rõ tham số mô phỏng.

---

## 9. Điểm mới (novelty) có thể khẳng định

1. **Tiering nhận biết ngữ nghĩa (semantic-aware tiering):** dùng embedding và nhãn do AI sinh ra làm đặc trưng dự đoán truy cập, giải quyết cold start.
2. **Tối ưu chi phí gộp lưu trữ và suy luận:** đưa `C_AI` vào hàm mục tiêu, dùng cascade để cân bằng độ chính xác và chi phí tính toán.
3. **Khung thống nhất cho nhiều modality:** một lược đồ metadata và một không gian embedding phục vụ định tuyến, tiering và truy xuất chéo modality.
4. **Truy xuất nhận biết tầng (tier-aware retrieval)** kèm prefetch theo cụm ngữ nghĩa.
5. **Đánh giá đa mục tiêu có tái lập:** bộ mô phỏng log truy cập có tương quan ngữ nghĩa, phát hành cùng mã nguồn.

Cần đối chiếu với tài liệu hiện có để xác nhận từng điểm là **chưa được làm theo cách này** trước khi đưa vào đề cương.

---

## 10. Rủi ro và biện pháp giảm thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|---|---|---|
| Không có log truy cập thực | Cao | Kết hợp trace công khai và mô phỏng; nêu rõ giới hạn |
| Mô hình AI tốn tài nguyên, triệt tiêu lợi ích tiết kiệm | Cao | Cascade, lượng tử hoá, batching; đo TCO thay vì chỉ chi phí lưu trữ |
| Phạm vi quá rộng | Cao | Làm sâu 2 modality chính (văn bản, ảnh) trước, âm thanh/video dùng pipeline phân rã |
| Concept drift | Trung bình | Evidently, huấn luyện lại định kỳ, cửa sổ trượt |
| Thrashing giữa các tầng | Trung bình | Hysteresis, thời gian lưu tối thiểu, so lợi ích với chi phí di chuyển |
| Chất lượng tiếng Việt kém ở mô hình đa ngữ | Trung bình | PhoBERT/BGE-M3, fine-tune thêm, đánh giá riêng tiếng Việt |
| Rò rỉ dữ liệu khi đánh giá | Trung bình | Chia theo thời gian, kiểm tra trùng lặp train/test |
| Dữ liệu nhạy cảm | Trung bình | PII detection, mã hoá, RBAC, dùng dữ liệu công khai |
| Độ phức tạp vận hành stack lớn | Trung bình | Bắt đầu bằng Docker Compose, giảm số hệ (ví dụ pgvector thay Milvus ở giai đoạn đầu) |

---

## 11. Cấu trúc mã nguồn đề xuất

```
multimodal-storage-ai/
├── configs/                  # cấu hình tầng, ngưỡng cascade, tham số chi phí
├── data/                     # (DVC) dữ liệu mẫu, log mô phỏng
├── services/
│   ├── api/                  # FastAPI: upload, query
│   ├── ingestion/            # nhận diện, checksum, dedup
│   ├── preprocess/           # text / image / audio / video
│   ├── ai_worker/            # cascade, mô hình, embedding
│   ├── policy_engine/
│   │   ├── router.py         # Storage Router
│   │   ├── tiering/          # baseline, lightgbm, lstm, rl
│   │   └── scheduler.py      # Migration Scheduler
│   └── retrieval/            # hybrid, cross-modal, rerank, prefetch
├── simulator/                # sinh log truy cập (Zipf, decay, burst, semantic)
├── experiments/              # kịch bản B0–B3, P1–P4, ablation, notebook
├── monitoring/               # Prometheus, Grafana dashboards
├── docker-compose.yml
└── README.md
```

---

## 12. Sản phẩm kỳ vọng

1. Hệ thống nguyên mẫu chạy end-to-end (mã nguồn, Docker Compose, tài liệu cài đặt).
2. Bộ mô hình AI đã huấn luyện/hiệu chỉnh cho từng modality và mô hình tiering.
3. Bộ mô phỏng log truy cập và kịch bản thực nghiệm có thể tái lập.
4. Báo cáo so sánh định lượng với baseline: chi phí, độ trễ, chất lượng phân loại/truy xuất.
5. Bài báo khoa học (hội nghị/tạp chí trong nước hoặc quốc tế) và báo cáo tổng kết đề tài.

---

## 13. Tài liệu nền tảng nên đọc

*(Kiểm tra lại thông tin trích dẫn đầy đủ trước khi đưa vào đề cương.)*

- Radford et al., **CLIP** – học biểu diễn thị giác từ giám sát ngôn ngữ tự nhiên (2021).
- Radford et al., **Whisper** – nhận dạng giọng nói bền vững bằng giám sát yếu quy mô lớn (2022).
- Nguyen & Nguyen, **PhoBERT** – mô hình ngôn ngữ tiền huấn luyện cho tiếng Việt (2020).
- Chen et al., **BGE M3-Embedding** – embedding đa ngữ, đa chức năng, đa độ chi tiết (2024).
- Girdhar et al., **ImageBind** – một không gian embedding cho nhiều modality (2023).
- Ke et al., **LightGBM** – gradient boosting hiệu quả (2017).
- Mnih et al., **DQN** – điều khiển mức con người bằng học tăng cường sâu (2015).
- Cormack et al., **Reciprocal Rank Fusion** (2009).
- Wang et al., **Milvus** – hệ quản trị dữ liệu vector chuyên dụng (2021).
- Các công trình về **cache/tiering dựa trên học máy** (learned caching, ML-based storage tiering) và **hệ thống data lake đa phương thức** – cần khảo sát bằng Google Scholar/Scopus/IEEE Xplore để lập bảng so sánh và xác định research gap.
