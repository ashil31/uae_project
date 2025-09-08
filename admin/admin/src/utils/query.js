// small helper to build query strings; arrays become comma-separated
export const buildQueryString = (params = {}) => {
    const cleaned = {};
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (typeof v === 'string' && v.trim() === '') return;
        // arrays -> comma separated
        if (Array.isArray(v)) {
            cleaned[k] = v.join(',');
            return;
        }
        cleaned[k] = v;
    });
    const usp = new URLSearchParams();
    Object.entries(cleaned).forEach(([k, v]) => usp.append(k, String(v)));
    const s = usp.toString();
    return s ? `?${s}` : '';
};