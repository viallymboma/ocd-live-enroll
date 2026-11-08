import type { BookingStatus } from "@/lib/types";

const TONE: Record<BookingStatus, string> = {
  pending: "bg-gold/15 text-gold ring-gold/30",
  validated: "bg-ok/15 text-ok ring-ok/30",
  rejected: "bg-bad/15 text-bad ring-bad/30",
  cancelled: "bg-dust/15 text-dust ring-dust/30",
};

export function StatusBadge({ status, label }: { status: BookingStatus; label: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${TONE[status]}`}><span className="size-1.5 rounded-full bg-current" />{label}</span>;
}
