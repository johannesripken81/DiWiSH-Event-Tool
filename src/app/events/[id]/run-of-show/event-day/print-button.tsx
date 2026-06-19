"use client";

export function PrintButton() {
  return (
    <button
      className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white"
      onClick={() => window.print()}
      type="button"
    >
      Drucken / als PDF speichern
    </button>
  );
}
