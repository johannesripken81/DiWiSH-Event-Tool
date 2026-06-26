import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

export type PaginationState = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

function getPageHref(basePath: string, query: SearchParams, page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (key === "page" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          params.append(key, item);
        }
      }
      continue;
    }

    if (value) {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function PaginationControls({
  basePath,
  pagination,
  query,
}: {
  basePath: string;
  pagination: PaginationState;
  query: SearchParams;
}) {
  if (pagination.totalItems <= pagination.pageSize) {
    return null;
  }

  const firstItem = (pagination.currentPage - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(
    pagination.currentPage * pagination.pageSize,
    pagination.totalItems,
  );
  const previousPage = Math.max(1, pagination.currentPage - 1);
  const nextPage = Math.min(pagination.totalPages, pagination.currentPage + 1);
  const linkClass =
    "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50";
  const disabledClass =
    "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400";

  return (
    <nav
      aria-label="Seitennavigation"
      className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm font-semibold text-slate-600">
        {firstItem.toLocaleString("de-DE")}-{lastItem.toLocaleString("de-DE")}{" "}
        von {pagination.totalItems.toLocaleString("de-DE")}
      </p>
      <div className="flex flex-wrap gap-2">
        {pagination.currentPage > 1 ? (
          <Link
            className={linkClass}
            href={getPageHref(basePath, query, previousPage)}
          >
            Zurück
          </Link>
        ) : (
          <span className={disabledClass}>Zurück</span>
        )}
        <span className="inline-flex min-h-10 items-center rounded-lg bg-slate-100 px-4 text-sm font-bold text-slate-700">
          Seite {pagination.currentPage} / {pagination.totalPages}
        </span>
        {pagination.currentPage < pagination.totalPages ? (
          <Link
            className={linkClass}
            href={getPageHref(basePath, query, nextPage)}
          >
            Weiter
          </Link>
        ) : (
          <span className={disabledClass}>Weiter</span>
        )}
      </div>
    </nav>
  );
}
