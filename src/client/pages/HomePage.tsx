import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";

export function HomePage() {
  return (
    <div>
      {/* Hero — single page, DocuForge colors, Darusy Syahadah branding */}
      <section className="relative bg-gradient-to-br from-[#087348] to-[#065f37] text-white min-h-[calc(100vh-4rem)] flex items-center">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <Icon name="book-open-fill" size={40} className="text-white" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-3 font-display tracking-tight">
            Buku & Biodata Alumni
          </h1>
          <p className="text-xl text-white/90 mb-1 font-display">
            Pondok Pesantren Darusy Syahadah
          </p>
          <p className="text-sm text-white/60 mb-10">
            Kedunglengkong, Simo, Boyolali, Surakarta
          </p>

          <p className="text-base text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Digitalkan kenangan dan jejak santri. Isi biodata alumni, kelola data
            dengan aman, dan susun Buku Alumni siap cetak — semua dalam satu platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/form">
              <button className="inline-flex items-center gap-2 px-7 py-3 bg-white text-[#087348] rounded-lg font-medium hover:bg-white/90 transition-colors text-base">
                <Icon name="user-add-line" size={20} />
                Daftar
              </button>
            </Link>
            <Link to="/alumni/login">
              <button className="inline-flex items-center gap-2 px-7 py-3 bg-transparent border border-white/40 text-white rounded-lg font-medium hover:bg-white/10 transition-colors text-base">
                <Icon name="login-circle-line" size={20} />
                Masuk
              </button>
            </Link>
          </div>

          <div className="mt-16 flex items-center justify-center gap-6 text-white/50 text-sm">
            <span className="flex items-center gap-1.5">
              <Icon name="shield-keyhole-line" size={16} /> Data Aman
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="book-open-line" size={16} /> Buku Alumni
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="qr-code-line" size={16} /> Profile Alumni
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
