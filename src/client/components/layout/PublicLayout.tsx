import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { Icon } from "../Icon";

export function PublicLayout() {
  const navigate = useNavigate();
  const [alumniLoggedIn, setAlumniLoggedIn] = useState(false);

  useEffect(() => {
    setAlumniLoggedIn(!!localStorage.getItem("alumni_token"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("alumni_token");
    setAlumniLoggedIn(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[#F4F4F5] bg-white/95 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 h-16 sm:h-20">
          {/* Logo + 3-line branding */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#087348] text-white flex items-center justify-center flex-shrink-0">
              <Icon name="book-open-fill" size={24} />
            </div>
            <div className="min-w-0 leading-tight">
              <span className="block text-[9px] sm:text-[10px] font-bold text-[#71717A] tracking-wider uppercase leading-none">Pondok Pesantren</span>
              <span className="block text-sm sm:text-lg font-bold text-[#087348] font-display leading-tight truncate">DARUSY SYAHADAH</span>
              <span className="block text-[9px] sm:text-[11px] text-[#71717A] font-medium leading-none mt-0.5">Kedunglengkong, Simo, Boyolali, Surakarta</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <Link to="/" className="px-3 py-2 font-semibold text-[#52525B] hover:text-[#087348] transition-colors rounded-lg hover:bg-[#087348]/5">Beranda</Link>
            {alumniLoggedIn ? (
              <>
                <Link to="/alumni/edit" className="px-3 py-2 font-semibold text-[#52525B] hover:text-[#087348] transition-colors rounded-lg hover:bg-[#087348]/5">Edit Biodata</Link>
                <button onClick={handleLogout} className="px-4 py-2 text-sm font-bold text-[#087348] border border-[#087348] rounded-lg hover:bg-[#087348]/5 transition-colors">Keluar</button>
              </>
            ) : (
              <>
                <Link to="/form" className="px-3 py-2 font-semibold text-[#52525B] hover:text-[#087348] transition-colors rounded-lg hover:bg-[#087348]/5">Daftar</Link>
                <Link to="/alumni/login" className="px-4 py-2 text-sm font-bold text-[#087348] border border-[#087348] rounded-lg hover:bg-[#087348]/5 transition-colors">Masuk</Link>
              </>
            )}
          </nav>
        </div>

        {/* Mobile bottom bar */}
        <div className="md:hidden border-t border-[#F4F4F5]/50 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
            {alumniLoggedIn ? (
              <>
                <Link to="/alumni/edit" className="flex-1 text-center py-2 text-xs font-bold text-[#087348] border border-[#087348] rounded-lg hover:bg-[#087348]/5 transition-colors">Edit Biodata</Link>
                <button onClick={handleLogout} className="flex-1 text-center py-2 text-xs font-bold text-white bg-[#087348] rounded-lg hover:bg-[#065f37] transition-colors">Keluar</button>
              </>
            ) : (
              <>
                <Link to="/form" className="flex-1 text-center py-2 text-xs font-bold text-[#087348] border border-[#087348] rounded-lg hover:bg-[#087348]/5 transition-colors">Daftar</Link>
                <Link to="/alumni/login" className="flex-1 text-center py-2 text-xs font-bold text-white bg-[#087348] rounded-lg hover:bg-[#065f37] transition-colors">Masuk</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#18181B] text-[#A1A1AA] py-6 no-print">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p>Buku Alumni — Pondok Pesantren Islam Darusy Syahadah &copy; {new Date().getFullYear()}</p>
          <p className="text-xs text-[#71717A] mt-1">Kedunglengkong, Simo, Boyolali, Surakarta</p>
        </div>
      </footer>
    </div>
  );
}
