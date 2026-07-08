interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}

export function Pagination({
  total,
  limit,
  offset,
  onChange,
}: PaginationProps) {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);

  return (
    <div className="pagination">
      <button
        type="button"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(offset - limit, 0))}
      >
        Previous
      </button>
      <span className="muted">
        Page {page} of {totalPages} ({start}-{end} of {total})
      </span>
      <button
        type="button"
        disabled={offset + limit >= total}
        onClick={() => onChange(offset + limit)}
      >
        Next
      </button>
    </div>
  );
}
