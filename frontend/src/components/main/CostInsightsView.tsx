import React from 'react';
import { 
  TrendingUp, 
  BarChart3,
  HardDrive,
  DollarSign,
  Cpu,
  Clock
} from 'lucide-react';

export const CostInsightsView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
          <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
          Báo cáo hiệu quả & Chi phí vận hành (Cost & ROI)
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Đo lường dung lượng đã giải phóng, chi phí tiết kiệm được và hiệu quả tận dụng tài nguyên phần cứng cục bộ
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Dung lượng đã giải phóng</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-semibold font-mono text-emerald-400">185.8 GB</div>
          <p className="text-xs text-zinc-400">Từ khử trùng lặp & dọn tệp tạm</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Ước tính tiết kiệm/năm</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-semibold font-mono text-zinc-100">$348.50</div>
          <p className="text-xs text-zinc-400">So với lưu trữ toàn bộ ở Hot Tier</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Chi phí suy luận AI</span>
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-semibold font-mono text-sky-400">$0.00</div>
          <p className="text-xs text-zinc-400">100% chạy cục bộ trên GPU</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Giảm thời gian tìm kiếm</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-semibold font-mono text-amber-400">-62.4%</div>
          <p className="text-xs text-zinc-400">Nhờ tìm kiếm ngữ nghĩa & cache</p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3.5 shadow-sm">
        <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-zinc-400" />
          So sánh hiệu quả trước và sau khi triển khai hệ thống MMO
        </h3>

        <div className="border border-zinc-800 rounded-lg overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/80 text-zinc-400 text-xs">
              <tr>
                <th className="p-3 font-medium">Tiêu chí đánh giá</th>
                <th className="p-3 font-medium">Trước khi tối ưu (Thủ công)</th>
                <th className="p-3 font-medium">Sau khi áp dụng MMO</th>
                <th className="p-3 text-right font-medium">Mức độ cải thiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              <tr>
                <td className="p-3 font-medium text-zinc-200">Chi phí lưu trữ hàng tháng</td>
                <td className="p-3 text-zinc-400">$48.20 / tháng</td>
                <td className="p-3 text-emerald-400 font-mono font-medium">$16.10 / tháng</td>
                <td className="p-3 text-right text-emerald-400 font-medium">-66.6%</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-zinc-200">Thời gian tìm kiếm tệp</td>
                <td className="p-3 text-zinc-400">120 - 300 giây (Thủ công)</td>
                <td className="p-3 text-indigo-400 font-mono font-medium">&lt; 0.5 giây (Semantic Search)</td>
                <td className="p-3 text-right text-indigo-400 font-medium">Nhanh gấp 400x</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-zinc-200">Tính an toàn & Toàn vẹn dữ liệu</td>
                <td className="p-3 text-zinc-400">Không có kiểm tra Checksum</td>
                <td className="p-3 text-emerald-400 font-medium">100% SHA-256 + Thùng rác bảo vệ</td>
                <td className="p-3 text-right text-emerald-400 font-medium">An toàn tuyệt đối</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-zinc-200">Bảo mật & Quyền riêng tư</td>
                <td className="p-3 text-zinc-400">Tải lên dịch vụ đám mây bên thứ ba</td>
                <td className="p-3 text-emerald-400 font-medium">100% Cục bộ trên GPU GTX 1650</td>
                <td className="p-3 text-right text-emerald-400 font-medium">Tuyệt đối riêng tư</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};