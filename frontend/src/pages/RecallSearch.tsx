import type { FormEvent } from "react";
import { useState } from "react";
import { Search } from "lucide-react";

import { apiGet, normalizeApiError } from "../api/http";
import { RiskBadge } from "../components/Badge";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import type { RecallSearchPayload } from "../types";

type Notice =
  | { kind: "info"; message: string }
  | { kind: "error"; message: string };

export function RecallSearch() {
  const [query, setQuery] = useState("");
  const [meta, setMeta] = useState<RecallSearchPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function runSearch(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = query.trim();
    setAttempted(true);
    if (!trimmed) {
      setNotice({
        kind: "info",
        message: "Enter a product, brand, or FDA firm name to query recalls.",
      });
      setMeta(null);
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const envelope = await apiGet<RecallSearchPayload>("/recalls/search", {
        query: trimmed,
      });
      setMeta(envelope);

      const rows = envelope.recalls ?? [];

      if (rows.length === 0 && envelope.count > 0) {
        setNotice({
          kind: "info",
          message:
            "Recall-service reported hits but payloads were truncated — widen the query wording.",
        });
      } else {
        setNotice(null);
      }
    } catch (e) {
      setMeta(null);
      setNotice({
        kind: "error",
        message: normalizeApiError(e).message,
      });
    } finally {
      setLoading(false);
    }
  }

  const rows = meta?.recalls ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="FDA Recall Search"
        subtitle="Search openFDA enforcement narratives through the SafeShelf recall-service proxy — ideal for live classroom demos."
      />

      <form
        onSubmit={(event) => void runSearch(event)}
        className="ss-card p-6 md:p-7"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-emerald-600"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Try "peanut butter", "spinach", or "Jif"'
              className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="ss-btn-primary min-h-[52px] rounded-xl !px-7 !text-base"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {loading ? <Loading label="Calling recall-service…" /> : null}

      {!loading && notice ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.kind === "error"
              ? "border-red-100 bg-red-50 text-red-900"
              : "border-amber-100 bg-amber-50 text-amber-950"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {meta?.upstreamMessage || meta?.info ? (
        <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <p className="font-semibold uppercase tracking-wide text-slate-500">
            Recall-service notes
          </p>
          {meta.upstreamMessage ? <p>{meta.upstreamMessage}</p> : null}
          {meta.info ? <p>{meta.info}</p> : null}
        </div>
      ) : null}

      {!loading && attempted && rows.length === 0 && meta && meta.count === 0 ? (
        <EmptyState
          title="No enforcement hits"
          description="The FDA catalogue simply had nothing tagged to that wording."
        />
      ) : null}

      {!loading && attempted && rows.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Results ({meta?.count ?? rows.length})
            </h2>
            <p className="text-xs text-slate-500">
              Showing derived risk tiers for quick demos — informational only.
            </p>
          </div>

          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((row) => (
              <li
                key={`${row.eventId}-${String(row.reasonForRecall)}`}
                className="ss-card flex flex-col p-5 md:p-6"
              >
                <div className="flex flex-wrap gap-2">
                  <RiskBadge level={row.riskLevel} />
                  {row.recallInitiationDate ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Initiated {row.recallInitiationDate}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  FDA event {row.eventId}
                </p>
                <p className="mt-2 text-base font-semibold leading-snug text-slate-900">
                  {row.productDescription ??
                    "(No product description captured)"}
                </p>
                <dl className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-slate-500">
                      Recalling firm
                    </dt>
                    <dd className="text-right">{row.recallingFirm ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-slate-500">
                      Classification
                    </dt>
                    <dd className="text-right">{row.classification ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Reason</dt>
                    <dd className="mt-1 text-sm leading-snug">
                      {row.reasonForRecall ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Distribution
                    </dt>
                    <dd className="mt-1 text-sm">
                      {row.distributionPattern ?? "—"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
