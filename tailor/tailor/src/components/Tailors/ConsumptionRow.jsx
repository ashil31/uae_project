// src/components/ConsumptionRow.jsx
import React from "react";
import { Minus } from "lucide-react";

/**
 * ConsumptionRow
 * props:
 *  - idx
 *  - row (object)
 *  - clothAmounts (array)
 *  - onChange(idx, key, value)
 *  - onSelectCloth(idx, clothAmountId)
 *  - onRemove(idx)
 *  - amountAvailableMap (object)
 *  - requestedPerClothAmount (object)
 */
export default function ConsumptionRow({
  idx,
  row,
  clothAmounts = [],
  onChange,
  onSelectCloth,
  onRemove,
  amountAvailableMap = {},
  requestedPerClothAmount = {},
}) {
  const pretty = (v) => (v || v === 0 ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "");
  const getAmountAvailable = (ca) => {
    if (!ca) return 0;
    return ca.remainingMeters ?? ca.available ?? ca.amount ?? ca.totalAmount ?? ca.totalAssigned ?? 0;
  };
  const clothTitle = (c) => {
    if (!c) return "Unknown";
    const fabric = c.fabricType ?? c.fabric ?? c.fabric_type ?? "";
    const item = c.itemType ?? c.item ?? c.item_type ?? "";
    const available = getAmountAvailable(c);
    const unit = c.unitType ?? c.unit ?? "";
    const titlePart = [pretty(fabric), pretty(item)].filter(Boolean).join(" / ") || (c._id ?? "Unknown");
    return `${titlePart} — ${available} ${unit || ""}`;
  };

  return (
    <div className="border p-3 rounded-md bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Row {idx + 1}</div>
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="text-red-500 inline-flex items-center gap-1"
        >
          <Minus className="w-4 h-4" /> Remove
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <select
          required
          value={row.clothAmountId}
          onChange={(e) => onSelectCloth(idx, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select cloth (aggregate item) for this row...</option>
          {clothAmounts.map((ca) => {
            const avail = getAmountAvailable(ca);
            if (avail <= 0) return null;
            return <option key={ca._id} value={ca._id}>{clothTitle(ca)}</option>;
          })}
        </select>

        <input
          type="text"
          value={row.fabricType}
          onChange={(e) => onChange(idx, "fabricType", e.target.value)}
          placeholder="Fabric Type (optional if Item provided)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        <input
          type="text"
          value={row.itemType}
          onChange={(e) => onChange(idx, "itemType", e.target.value)}
          placeholder="Item Type (optional if Fabric provided)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />

        <div className="flex gap-2 items-center">
          <select
            value={row.unitType}
            onChange={(e) => onChange(idx, "unitType", e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="meters">Meters</option>
            <option value="kilos">Kilos</option>
            <option value="unit">Units</option>
          </select>

          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={row.amount}
            onChange={(e) => onChange(idx, "amount", e.target.value)}
            placeholder="Amount"
            className="w-36 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {row.clothAmountId && (
          <div className="text-xs text-gray-600 mt-1">
            Available:{" "}
            <strong>
              {amountAvailableMap[row.clothAmountId] ?? 0}{" "}
              {clothAmounts.find((c) => String(c._id) === String(row.clothAmountId))
                ?.unitType ?? ""}
            </strong>{" "}
            — Requested for this item:{" "}
            <strong>{requestedPerClothAmount[String(row.clothAmountId)] ?? 0}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
