// src/utils/clothUtils.js
export function capitalize(str) {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export const emptyConsumption = (overrides = {}) => ({
  clothAmountId: "",
  fabricType: "",
  itemType: "",
  unitType: "meters",
  amount: "",
  ...overrides,
});

export const looksLikeObjectId = (id) => {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export const resolveClothAmountRealId = (clothAmountItem) => {
  if (!clothAmountItem) return null;

  if (
    clothAmountItem.__resolvedObjectId &&
    looksLikeObjectId(String(clothAmountItem.__resolvedObjectId))
  ) {
    return String(clothAmountItem.__resolvedObjectId);
  }

  if (clothAmountItem._id && looksLikeObjectId(String(clothAmountItem._id))) {
    return String(clothAmountItem._id);
  }

  const raw = clothAmountItem.raw ?? {};
  const candidates = [
    raw._id,
    raw.clothAmountId,
    raw.clothAmountId && raw.clothAmountId._id,
    raw.clothDoc && raw.clothDoc._id,
    raw.rollId,
    raw.rollId && raw.rollId._id,
    clothAmountItem.rollId,
    clothAmountItem.clothAmountId,
    clothAmountItem.serialNumber,
  ];

  for (const cand of candidates) {
    if (!cand && cand !== 0) continue;
    try {
      const s = String(cand);
      if (looksLikeObjectId(s)) return s;
    } catch (e) {}
  }

  return null;
};

export const toNumberSafe = (v, fallback = 0) => {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
