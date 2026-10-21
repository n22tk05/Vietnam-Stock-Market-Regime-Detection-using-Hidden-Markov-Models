import React from 'react';
import { Link } from 'react-router-dom';

export const FinalCtaBanner: React.FC = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-10 sm:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="text-3xl font-black mb-3 leading-tight">
              Sẵn sàng đầu tư kỷ luật cùng AI QUANTUM?
            </h2>
            <p className="text-sm text-blue-100">
              Xem ngay dự báo biến động giá và vùng an toàn cho phiên giao dịch ngày mai.
            </p>
          </div>
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full font-extrabold text-base bg-white text-blue-700 hover:bg-blue-50 shadow-lg shadow-black/10 transition-transform hover:scale-105"
            >
              Vào Dashboard Miễn Phí &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
