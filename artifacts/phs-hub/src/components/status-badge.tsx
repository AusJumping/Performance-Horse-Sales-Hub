const MAP: Record<string, string> = {
  new:                      "bg-sky-100 text-sky-800 border-sky-200",
  awaiting_review:          "bg-amber-100 text-amber-800 border-amber-200",
  awaiting_seller_response: "bg-orange-100 text-orange-800 border-orange-200",
  needs_more_information:   "bg-red-100 text-red-800 border-red-200",
  ready_to_list:            "bg-teal-100 text-teal-800 border-teal-200",
  seller_review_sent:       "bg-violet-100 text-violet-800 border-violet-200",
  approved:                 "bg-emerald-100 text-emerald-800 border-emerald-200",
  approved_to_market:       "bg-emerald-100 text-emerald-800 border-emerald-200",
  processing:               "bg-blue-100 text-blue-800 border-blue-200",
  viewing_pending:          "bg-cyan-100 text-cyan-800 border-cyan-200",
  in_vetting:               "bg-yellow-100 text-yellow-800 border-yellow-200",
  sold_pending:             "bg-indigo-100 text-indigo-800 border-indigo-200",
  live:                     "bg-[#24384e] text-white border-[#24384e]",
  published:                "bg-[#24384e] text-white border-[#24384e]",
  sold:                     "bg-stone-700 text-white border-stone-700",
  archived:                 "bg-stone-100 text-stone-600 border-stone-200",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = MAP[status] ?? "bg-muted text-muted-foreground border-muted";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}
