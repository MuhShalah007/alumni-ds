import { Button } from "./ui";
import { Icons } from "./Icon";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/**
 * Build a compact page-number list with ellipsis, e.g. `1 2 ... 5 6 7 ... 20`.
 * Always includes first, last, current, and one neighbour on each side of current.
 */
function pageNumbers(page: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  pages.push(1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = pageNumbers(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-t border-slate-200">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500 whitespace-nowrap">
          Menampilkan {from}-{to} dari {total}
        </span>
        <select
          value={String(limit)}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="rounded-lg border border-[#E4E4E7] px-2.5 py-1.5 text-sm bg-white outline-none focus:border-[#2563EB]"
        >
          <option value="25">25 / halaman</option>
          <option value="50">50 / halaman</option>
          <option value="100">100 / halaman</option>
        </select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <Icons.ArrowLeft size={14} />
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
                p === page
                  ? "bg-primary-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={page === totalPages || totalPages === 0}
          onClick={() => onPageChange(page + 1)}
        >
          <Icons.ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
