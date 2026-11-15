const PALETTE = [
    "from-sky-500/80 to-indigo-500/80",
    "from-violet-500/80 to-fuchsia-500/80",
    "from-emerald-500/80 to-teal-500/80",
    "from-amber-500/80 to-orange-500/80",
    "from-rose-500/80 to-pink-500/80",
    "from-cyan-500/80 to-blue-500/80",
    "from-lime-500/80 to-green-500/80",
    "from-purple-500/80 to-indigo-500/80"
];

export function gradientFor(id) {
    if (!id) return PALETTE[0];
    let hash = 0;
    for (let i = 0; i < String(id).length; i += 1) {
        hash = (hash * 31 + String(id).charCodeAt(i)) | 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function initialFor(username) {
    return String(username || "?")[0].toUpperCase();
}
