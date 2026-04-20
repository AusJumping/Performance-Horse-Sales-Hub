const MAP: Record<string, string> = {
  new: "bg-stone-100 text-stone-700 border-stone-300",
  awaiting_review: "bg-amber-50 text-amber-700 border-amber-400",
  awaiting_seller_response: "bg-orange-50 text-orange-700 border-orange-400",
  needs_more_information: "bg-red-50 text-red-700 border-red-400",
  ready_to_list: "bg-sky-50 text-sky-700 border-sky-400",
  seller_review_sent: "bg-violet-50 text-violet-700 border-violet-400",
  approved_to_market: "bg-emerald-600 text-white border-emerald-600",
  live: "bg-[#24384e] text-white border-[#24384e]",
  viewing_pending: "bg-cyan-50 text-cyan-700 border-cyan-400",
  sold_pending: "bg-indigo-50 text-indigo-700 border-indigo-400",
  in_vetting: "bg-yellow-50 text-yellow-700 border-yellow-500",
  sold: "bg-emerald-700 text-white border-emerald-700",
  archived: "bg-gray-100 text-gray-600 border-gray-300",
  processing: "bg-blue-50 text-blue-700 border-blue-400",
  approved: "bg-emerald-600 text-white border-emerald-600",
  published: "bg-[#24384e] text-white border-[#24384e]",
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
