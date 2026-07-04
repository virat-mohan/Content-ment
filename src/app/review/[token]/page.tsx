"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { contentStore, CONTENT_STATUS_LABELS, type ContentItem } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText } from "lucide-react";

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [item, setItem] = useState<ContentItem | null | undefined>(undefined);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const all = contentStore.getAll();
    const found = all.find((c) => c.reviewToken === token);
    setItem(found ?? null);
    if (found?.reviewedAt) setApproved(true);
  }, [token]);

  function approve() {
    if (!item) return;
    const now = new Date().toISOString();
    contentStore.save({ ...item, status: "approved", reviewedAt: now, updatedAt: now });
    setItem((prev) => prev ? { ...prev, status: "approved", reviewedAt: now } : prev);
    setApproved(true);
  }

  if (item === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (item === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <FileText className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium">Content not found</p>
        <p className="text-xs text-muted-foreground">This link may be invalid or the content has been removed.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Review request</p>
          <h1 className="text-2xl font-semibold leading-snug">{item.title}</h1>
          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{item.platform}</span>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">{CONTENT_STATUS_LABELS[item.status]}</span>
          </div>
        </div>

        {/* Body */}
        <div className="rounded-xl border bg-card p-6">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Content</p>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{item.body || <span className="italic text-muted-foreground">No body content yet.</span>}</div>
        </div>

        {/* Notes */}
        {item.notes && (
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <span className="font-medium">Notes: </span>{item.notes}
          </div>
        )}

        {/* Approval */}
        {approved ? (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-5 py-4">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Approved</p>
              {item.reviewedAt && (
                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                  {new Date(item.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border p-4 bg-muted/20">
            <div className="flex-1">
              <p className="text-sm font-medium">Ready to approve?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Clicking approve will mark this content as approved by owner.</p>
            </div>
            <Button onClick={approve} className="shrink-0">
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center">Powered by Content-ment</p>
      </div>
    </div>
  );
}
