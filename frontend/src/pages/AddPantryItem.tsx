import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { apiGet, apiPostJson, normalizeApiError } from "../api/http";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useScopeUser } from "../context/ScopeUserContext";
import type { CategoryDto, PantryItemDto, UserDto } from "../types";

// Convert a <input type="date"> value (YYYY-MM-DD) to an ISO string at noon UTC.
// Picking noon avoids day-shift issues from local timezones.
function isoFromDateInput(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

// Form for POST /api/pantry-items. All inputs map 1:1 to the Zod create schema.
export function AddPantryItem() {
  const navigate = useNavigate();
  const { scopeUserId, loadingUsers } = useScopeUser();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Form fields.
  const [userId, setUserId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expirationDate, setExpirationDate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [barcode, setBarcode] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill the user picker with the active scope user.
  useEffect(() => {
    if (!loadingUsers && scopeUserId) setUserId(scopeUserId);
  }, [loadingUsers, scopeUserId]);

  // Load users + categories in parallel for the dropdowns.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRefs(true);
      setError(null);
      try {
        const [uRows, catRows] = await Promise.all([
          apiGet<UserDto[]>("/users"),
          apiGet<CategoryDto[]>("/categories"),
        ]);
        if (cancelled) return;
        setUsers(uRows);
        setCategories(catRows);
      } catch (e) {
        if (!cancelled) setError(normalizeApiError(e).message);
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Default the category dropdown to the first option once loaded.
  useEffect(() => {
    if (categories.length === 0) return;
    setCategoryId((current) =>
      current && categories.some((c) => c.id === current)
        ? current
        : categories[0].id,
    );
  }, [categories]);

  // Build the request body, validate locally, then POST.
  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    const qtyParsed = Number(quantity.trim());
    if (!Number.isInteger(qtyParsed) || qtyParsed < 1) {
      setError("Quantity must be a positive integer.");
      return;
    }
    if (!userId.trim() || !categoryId.trim() || name.trim().length === 0) {
      setError("User, category, and name are required.");
      return;
    }

    const payload: Record<string, unknown> = {
      userId: userId.trim(),
      categoryId: categoryId.trim(),
      name: name.trim(),
      quantity: qtyParsed,
    };

    // Optional fields are only sent when actually filled in.
    const trimmedBrand = brand.trim();
    if (trimmedBrand !== "") payload.brand = trimmedBrand;

    const expIso = isoFromDateInput(expirationDate);
    if (expIso !== undefined) payload.expirationDate = expIso;

    const purchasedIso = isoFromDateInput(purchaseDate);
    if (purchasedIso !== undefined) payload.purchaseDate = purchasedIso;

    const loc = storageLocation.trim();
    if (loc !== "") payload.storageLocation = loc;

    const bc = barcode.trim();
    if (bc !== "") payload.barcode = bc;

    const note = notes.trim();
    if (note !== "") payload.notes = note;

    setSubmitting(true);
    try {
      await apiPostJson<PantryItemDto>("/pantry-items", payload);
      navigate("/pantry");
    } catch (err) {
      setError(normalizeApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingRefs || loadingUsers) {
    return (
      <div className="mx-auto max-w-xl py-24">
        <Loading label="Loading reference data…" />
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        title="Add item"
        subtitle="Mirrors the validated POST `/pantry-items` contract."
        actions={
          <Link
            to="/pantry"
            className="ss-btn-secondary inline-flex whitespace-nowrap"
          >
            <ArrowLeft className="size-4" />
            Back to pantry
          </Link>
        }
      />

      {error ? (
        <div
          role="alert"
          className="ss-card border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-950"
        >
          {error}
        </div>
      ) : null}

      <form className="ss-card space-y-4 p-5 md:p-6" onSubmit={submit}>
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={submitting}>
          {/* Owner picker (required FK). */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Owner (user id)
            </label>
            <select
              className={`${inputClass} bg-white`}
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            >
              <option value="" disabled>
                Select user…
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Category picker (required FK). */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category
            </label>
            <select
              className={`${inputClass} bg-white`}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              <option value="" disabled>
                Select category…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Product name *
            </label>
            <input className={inputClass} required value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Brand
            </label>
            <input className={inputClass} value={brand} onChange={(event) => setBrand(event.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quantity *
            </label>
            <input className={inputClass} required type="number" min={1} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Expiration date
            </label>
            <input className={`${inputClass} text-slate-800`} type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Purchase date
            </label>
            <input className={`${inputClass} text-slate-800`} type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Storage location
            </label>
            <input className={inputClass} value={storageLocation} onChange={(event) => setStorageLocation(event.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Barcode
            </label>
            <input className={inputClass} value={barcode} onChange={(event) => setBarcode(event.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notes
            </label>
            <textarea rows={3} className={`${inputClass} resize-none`} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={submitting || users.length === 0 || categories.length === 0}
            className="ss-btn-primary px-6 py-2.5"
          >
            {submitting ? "Saving…" : "Create item"}
          </button>
          <span className="text-xs text-slate-500">Redirects back to pantry on success.</span>
        </div>
      </form>
    </div>
  );
}
