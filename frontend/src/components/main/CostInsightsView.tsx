import React from 'react';
import { 
  TrendingUp, 
  BarChart3
} from 'lucide-react';

export const CostInsightsView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          Báo Cáo Hiệu Quả & Tối Ưu Chi Phí Vận Hành (Cost & ROI)
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Đo lường mức tiết kiệm dung lượng, chi phí lưu trữ đám mây và tối ưu hóa tài nguyên phần cứng
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-xs text-slate-400 font-mono">Dung lượng giải phóng:</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">185.8 GB</div>
          <p className="text-[11px] text-slate-500 font-mono">Khử trùng lặp + Dọn Temp</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-xs text-slate-400 font-mono">Chi phí tiết kiệm/năm:</span>
          <div className="text-2xl font-bold font-mono text-lime-400">$348.50</div>
          <p className="text-[11px] text-slate-500 font-mono">So với lưu trữ toàn bộ ở Hot Tier</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-xs text-slate-400 font-mono">Chi phí suy luận AI (C_AI):</span>
          <div className="text-2xl font-bold font-mono text-sky-400">$0.00</div>
          <p className="text-[11px] text-slate-500 font-mono">100% On-Premise GPU GTX 1650</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-xs text-slate-400 font-mono">Tỷ lệ giảm độ trễ truy xuất:</span>
          <div className="text-2xl font-bold font-mono text-amber-400">-62.4%</div>
          <p className="text-[11px] text-slate-500 font-mono">Nhờ Hybrid Search & Cache Hot Tier</p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Bảng So Sánh Hiệu Quả Trước & Sau Khi Triển Khai MMO
        </h3>

        <div className="border border-slate-800 rounded-xl overflow-hidden text-xs font-mono">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="p-3">Tiêu Chí Đo Lường</th>
                <th className="p-3">Trước Khi Tối Ưu (Truyền Thống)</th>
                <th className="p-3">Sau Khi Có MMO (AI Multi-Tiering)</th>
                <th className="p-3 text-right">Mức Độ Cải Thiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="p-3 font-medium">Chi Phí Lưu Trữ Hàng Tháng</td>
                <td className="p-3 text-rose-400">$48.20 / tháng</td>
                <td className="p-3 text-emerald-400 font-bold">$16.10 / tháng</td>
                <td className="p-3 text-right text-emerald-400 font-bold">-66.6%</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Thời Gian Tìm Kiếm File Cần Thiết</td>
                <td className="p-3 text-rose-400">120 - 300 giây (Thủ công)</td>
                <td className="p-3 text-emerald-400 font-bold">&lt; 0.5 giây (Semantic Search)</td>
                <td className="p-3 text-right text-emerald-400 font-bold">Nhanh gấp 400x</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Toàn Vẹn Dữ Liệu & Rủi Ro Mất Mát</td>
                <td className="p-3 text-amber-400">Không có kiểm tra Checksum</td>
                <td className="p-3 text-emerald-400 font-bold">100% SHA-256 + Recycle Bin Safe</td>
                <td className="p-3 text-right text-emerald-400 font-bold">Không rủi ro</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Bảo Mật Quyền Riêng Tư (Privacy)</td>
                <td className="p-3 text-amber-400">Upload qua Cloud Third-party</td>
                <td className="p-3 text-emerald-400 font-bold">100% Local GPU Ollama GTX 1650</td>
                <td className="p-3 text-right text-emerald-400 font-bold">Tuyệt đối riêng tư</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
