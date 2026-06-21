import { ChevronLeft, ChevronRight } from 'lucide-react'

export const PAGE_SIZE = 20

export default function Pagination({ page, pageSize = PAGE_SIZE, count, onPageChange }) {
  const isFirst = page === 1
  const isLast = count < pageSize

  if (isFirst && isLast) return null

  return (
    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
      <span className="text-xs text-slate-400">
        Showing {((page - 1) * pageSize) + 1}–{((page - 1) * pageSize) + count} items
        {!isLast && ' · more available'}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="btn-icon text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => onPageChange(page - 1)}
          disabled={isFirst}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-slate-700 min-w-[2rem] text-center">{page}</span>
        <button
          className="btn-icon text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => onPageChange(page + 1)}
          disabled={isLast}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
