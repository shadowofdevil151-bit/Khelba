import {
    Atom, BookOpen, Brain, BriefcaseBusiness, Calculator, ChartNoAxesCombined,
    Cpu, Dna, FlaskConical, Globe2, History, House, Landmark, Leaf, Scale
} from "lucide-react";

const artworkBySubject = {
    "275": Cpu,
    "277": BriefcaseBusiness,
    "278": ChartNoAxesCombined,
    PHY: Atom,
    CHM: FlaskConical,
    BLG: Dna,
    MAT: Calculator,
    AS: Leaf,
    ACC: Calculator,
    BOM: BriefcaseBusiness,
    BNG: BookOpen,
    ICT: Cpu,
    CGG: Landmark,
    ECN: ChartNoAxesCombined,
    FIB: Landmark,
    GEO: Globe2,
    HS: House,
    HST: History,
    IHC: History,
    ISL: BookOpen,
    LGC: Scale,
    PMM: BriefcaseBusiness,
    PSY: Brain,
    SOC: Globe2,
    SW: Landmark
};

const colorBySubject = {
    PHY: "border-sky-100/20 text-sky-100",
    CHM: "border-emerald-100/20 text-emerald-100",
    BLG: "border-lime-100/20 text-lime-100",
    MAT: "border-violet-100/20 text-violet-100",
    AS: "border-green-100/20 text-green-100",
    ACC: "border-amber-100/20 text-amber-100",
    BOM: "border-orange-100/20 text-orange-100",
    FIB: "border-yellow-100/20 text-yellow-100",
    PMM: "border-rose-100/20 text-rose-100",
    ECN: "border-cyan-100/20 text-cyan-100",
    CGG: "border-indigo-100/20 text-indigo-100",
    GEO: "border-teal-100/20 text-teal-100",
    HST: "border-amber-100/20 text-amber-100",
    IHC: "border-orange-100/20 text-orange-100",
    ISL: "border-emerald-100/20 text-emerald-100",
    LGC: "border-fuchsia-100/20 text-fuchsia-100",
    PSY: "border-pink-100/20 text-pink-100",
    SOC: "border-sky-100/20 text-sky-100",
    SW: "border-blue-100/20 text-blue-100",
    HS: "border-rose-100/20 text-rose-100",
    BNG: "border-rose-100/20 text-rose-100",
    ICT: "border-rose-100/30 text-rose-100",
    "275": "border-cyan-100/20 text-cyan-100",
    "277": "border-emerald-100/20 text-emerald-100",
    "278": "border-amber-100/20 text-amber-100"
};

export default function SubjectArtwork({ code, variant }) {
    const key = String(code).toUpperCase();
    const Icon = artworkBySubject[key] || BookOpen;
    const accent = colorBySubject[key] || "border-white/20 text-white";
    const academy = variant === "academy";
    const battle = variant === "battle";

    return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className={`absolute ${battle ? "-right-5 sm:-right-8" : "-right-5 sm:-right-10"} top-1/2 grid ${battle ? "h-40 w-40 sm:h-64 sm:w-64" : "h-32 w-32 sm:h-56 sm:w-56"} -translate-y-1/2 place-items-center rounded-full border ${accent} ${battle ? "opacity-40 group-hover:opacity-55" : academy ? "opacity-25 group-hover:opacity-35" : "opacity-25 group-hover:opacity-40"} transition-all duration-500 scale-90 sm:scale-100 group-hover:scale-105`}>
            <span className="absolute inset-4 rounded-full border border-current opacity-50"/>
            <span className="absolute inset-10 rounded-full border border-current opacity-35"/>
            <Icon className={`${battle ? "h-20 w-20 sm:h-32 sm:w-32" : "h-16 w-16 sm:h-28 sm:w-28"} drop-shadow-[0_0_18px_currentColor]`} strokeWidth={academy ? 1.5 : 1.15}/>
            <span className="absolute right-8 top-8 h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_16px_currentColor]"/>
        </div>
        <span className={`absolute bottom-8 right-28 h-1.5 w-1.5 rounded-full bg-current opacity-50 ${accent.split(" ")[1]}`}/>
        <span className={`absolute right-16 top-9 h-1 w-1 rounded-full bg-current opacity-40 ${accent.split(" ")[1]}`}/>
    </div>;
}