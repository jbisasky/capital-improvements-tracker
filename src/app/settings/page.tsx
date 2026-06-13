import { type ReactElement, useState } from "react";
import { useStorage } from "@/services/storage-context";
import { type PropertyType } from "@/domain/schemas";

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "primary_residence", label: "Primary Residence" },
  { value: "rental", label: "Rental Property" },
  { value: "home_office", label: "Home Office" },
  { value: "vacation", label: "Vacation Home" },
];

export function SettingsPage(): ReactElement {
  const { manifest } = useStorage();
  const property = manifest?.property;

  const [address, setAddress] = useState(property?.address ?? "");
  const [city, setCity] = useState(property?.city ?? "");
  const [state, setState] = useState(property?.state ?? "");
  const [zip, setZip] = useState(property?.zip ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType>(
    property?.propertyType ?? "primary_residence",
  );
  const [sqftTotal, setSqftTotal] = useState(
    property?.sqftTotal != null ? String(property.sqftTotal) : "",
  );

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  function handleSaveProperty(e: React.SyntheticEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Property saving will be wired to the storage driver in Task 4
    // For now it just shows the form is functional
  }

  function handleClearData(): void {
    localStorage.clear();
    setShowClearConfirm(false);
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Property Profile */}
      <form onSubmit={handleSaveProperty} className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Your Property</h2>
        <p className="text-sm text-muted-foreground">
          Set your property details once — they apply to all projects.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="address" className="mb-1 block text-xs font-medium text-muted-foreground">
              Street Address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="city" className="mb-1 block text-xs font-medium text-muted-foreground">
              City
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => { setCity(e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="state" className="mb-1 block text-xs font-medium text-muted-foreground">
                State
              </label>
              <input
                id="state"
                type="text"
                maxLength={2}
                value={state}
                onChange={(e) => { setState(e.target.value.toUpperCase()); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="zip" className="mb-1 block text-xs font-medium text-muted-foreground">
                ZIP
              </label>
              <input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => { setZip(e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label htmlFor="propertyType" className="mb-1 block text-xs font-medium text-muted-foreground">
              Property Type
            </label>
            <select
              id="propertyType"
              value={propertyType}
              onChange={(e) => { setPropertyType(e.target.value as PropertyType); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {PROPERTY_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sqftTotal" className="mb-1 block text-xs font-medium text-muted-foreground">
              Total Sq Ft
            </label>
            <input
              id="sqftTotal"
              type="number"
              min="0"
              value={sqftTotal}
              onChange={(e) => { setSqftTotal(e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Save Property
        </button>
      </form>

      {/* BYOK API Key (placeholder) */}
      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Gemini API Key (BYOK)</h2>
        <p className="text-sm text-muted-foreground">
          Enter your Google Gemini API key to enable AI-powered receipt extraction.
          The key is stored locally and never sent to any server other than Google.
        </p>
        <div className="flex gap-3">
          <input
            type="password"
            placeholder="Enter API key..."
            autoComplete="off"
            disabled
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:opacity-50"
          />
          <button
            type="button"
            disabled
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          >
            Save Key
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Available after connecting Google Drive (Task 5).
        </p>
      </div>

      {/* Clear All Data */}
      <div className="space-y-4 rounded-lg border border-red-200 p-4">
        <h2 className="text-lg font-medium text-red-600">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Clear all locally stored data including API keys, preferences, and cached
          manifest data. Your data on Google Drive is not affected.
        </p>
        {showClearConfirm ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearData}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Yes, clear everything
            </button>
            <button
              type="button"
              onClick={() => { setShowClearConfirm(false); }}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setShowClearConfirm(true); }}
            className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Clear All Local Data
          </button>
        )}
      </div>
    </div>
  );
}
