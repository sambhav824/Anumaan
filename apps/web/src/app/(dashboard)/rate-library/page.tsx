"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  Building,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  Check,
  Navigation,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "../../../context/I18nContext";
import { useOrg } from "../../../context/OrgContext";
import { api, RateItem, RateRegion } from "../../../lib/api";
import { Modal } from "../../../components/Modal";
import { formatCurrencyINR } from "../../../lib/calculations";
import LocationPermissionModal, {
  getUserSavedLocation,
  UserLocationPreference,
} from "../../../components/LocationPermissionModal";

// Core Material Categories (A to I: Construction Materials Only — Zero Labour)
const MATERIAL_CATEGORIES = [
  { id: "all", label: "All Materials" },
  { id: "cement_binding", label: "Cement & Concrete" },
  { id: "sand_aggregate", label: "Sand & Aggregates" },
  { id: "steel_reinforcement", label: "Steel & Rebar" },
  { id: "masonry_blocks", label: "Bricks & AAC Blocks" },
  { id: "chemicals", label: "Construction Chemicals" },
  { id: "finishing", label: "Tiles & Finishing" },
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical" },
  { id: "other_materials", label: "Formwork & Other" },
];

const COMMON_UNITS = [
  { value: "bag", label: "bag (Cement Bag 50kg / Putty)" },
  { value: "tonne", label: "tonne (Metric Ton - 1,000 kg Steel)" },
  { value: "cum", label: "cum / m³ (Cubic Metre - Sand/Agg/RMC)" },
  { value: "sqm", label: "sqm / m² (Square Metre - Tiles/Ply)" },
  { value: "sqft", label: "sqft / ft² (Square Foot)" },
  { value: "1000 nos", label: "1000 nos (Bricks / Pavers)" },
  { value: "piece", label: "piece / nos (Unit Count / Blocks)" },
  { value: "rmt", label: "rmt / m (Running Metre - Pipes/Conduit)" },
  { value: "kg", label: "kg (Kilogram - Binding Wire/Grout)" },
  { value: "litre", label: "litre (Chemicals/Paint/Admixture)" },
  { value: "coil", label: "coil (Wire 90m Coil)" },
];

interface MaterialDisplayInfo {
  headline: string;
  subname: string;
  description: string;
  chips: string[];
  imageSrc: string;
}

function getMaterialDisplayInfo(item: RateItem): MaterialDisplayInfo {
  const code = (item.code || "").toUpperCase();
  const name = (item.name || "").toLowerCase();

  // 1. CEMENT & CONCRETE
  if (code.startsWith("CEM-") || name.includes("cement") || name.includes("opc") || name.includes("ppc")) {
    return {
      headline: "Cement",
      subname: item.name,
      description: "OPC & PPC cement from trusted mills. Stored dry, delivered fresh — ideal for slabs, columns and finish work.",
      chips: ["OPC 43/53", "PPC", "Bagged"],
      imageSrc: "/materials/cement.jpg",
    };
  }

  // 2. AAC BLOCKS
  if (code.startsWith("BLK-AAC") || name.includes("aac") || name.includes("aerated")) {
    return {
      headline: "AAC Blocks",
      subname: item.name,
      description: "Precision-cut autoclaved aerated concrete blocks. High thermal insulation, fire-rated and lightweight for partition and outer walls.",
      chips: ["Autoclaved", "Grade-1", "Lightweight"],
      imageSrc: "/materials/aac_blocks.jpg",
    };
  }

  // 3. BRICKS & SOLID BLOCKS
  if (code.startsWith("BRK-") || code.startsWith("BLK-CONC") || name.includes("brick") || name.includes("block")) {
    return {
      headline: "Bricks & Blocks",
      subname: item.name,
      description: "Kiln-fired red clay bricks and fly ash bricks with consistent size and strength. Load-tested batches for masonry walls.",
      chips: ["Class-A", "Fire-baked", "Bulk Ready"],
      imageSrc: "/materials/bricks.jpg",
    };
  }

  // 4. SAND
  if (code.startsWith("AGG-RIV") || code.startsWith("AGG-MSAND") || code.startsWith("AGG-PSAND") || name.includes("sand")) {
    return {
      headline: "Sand",
      subname: item.name,
      description: "Washed river sand, M-Sand and plastering sand with the right silt limits — suitable for concrete, masonry and finish plaster.",
      chips: ["Washed", "Concrete", "Plaster"],
      imageSrc: "/materials/sand.jpg",
    };
  }

  // 5. STEEL & REBAR
  if (code.startsWith("STL-") || name.includes("steel") || name.includes("tmt") || name.includes("rebar") || name.includes("binding wire")) {
    return {
      headline: "TMT Steel",
      subname: item.name,
      description: "Thermo-mechanically treated high-yield rebar bars. High elongation and seismic resistance for RCC columns, beams and foundations.",
      chips: ["Fe 500D", "IS 1786", "TMT Rebar"],
      imageSrc: "/materials/steel.jpg",
    };
  }

  // 6. COARSE AGGREGATES
  if (code.startsWith("AGG-STONE") || name.includes("aggregate") || name.includes("stone metal") || name.includes("gitti") || name.includes("dust")) {
    return {
      headline: "Stone Aggregates",
      subname: item.name,
      description: "Graded blue metal crushed stone aggregates (10mm, 20mm & 40mm). Silt-free cubical chips for structural concrete.",
      chips: ["10mm / 20mm", "IS 383", "Blue Basalt"],
      imageSrc: "/materials/aggregates.jpg",
    };
  }

  // 7. READY MIX CONCRETE
  if (code.startsWith("CON-RMC") || name.includes("rmc") || name.includes("ready mix")) {
    return {
      headline: "Ready-Mix Concrete",
      subname: item.name,
      description: "Computer-batched ready-mix concrete delivered fresh by transit mixers. Guaranteed slump and compressive strength.",
      chips: ["M20 / M25 / M30", "Transit Mix", "Batch Plant"],
      imageSrc: "/materials/concrete.jpg",
    };
  }

  // 8. TILES & STONE FLOORING
  if (code.startsWith("FIN-TILE") || code.startsWith("FIN-STONE") || name.includes("tile") || name.includes("granite")) {
    return {
      headline: "Tiles & Stone",
      subname: item.name,
      description: "Double-charged vitrified floor tiles, ceramic glazed wall tiles, and gangsaw-polished granite stone slabs.",
      chips: ["Vitrified", "Polished", "Rectified"],
      imageSrc: "/materials/tiles.jpg",
    };
  }

  // 9. PAINTS & PRIMER
  if (code.startsWith("PNT-") || name.includes("paint") || name.includes("primer") || name.includes("putty") || name.includes("emulsion")) {
    return {
      headline: "Paint & Putty",
      subname: item.name,
      description: "Weather-proof exterior emulsions, luxury interior acrylic paints, and polymer white cement wall putty.",
      chips: ["Weather Shield", "Acrylic Base", "Low VOC"],
      imageSrc: "/materials/paint.jpg",
    };
  }

  // 10. CONSTRUCTION CHEMICALS & WATERPROOFING
  if (code.startsWith("CHM-") || code.startsWith("ADH-") || code.startsWith("WPR-") || name.includes("waterproof") || name.includes("adhesive") || name.includes("grout")) {
    return {
      headline: "Chemicals & Waterproofing",
      subname: item.name,
      description: "Polymer-modified tile adhesives, integral liquid waterproofing compounds, and elastomeric protective coatings.",
      chips: ["IS 2645", "Polymer Base", "Waterproof"],
      imageSrc: "/materials/waterproofing.jpg",
    };
  }

  // 11. PLUMBING
  if (code.startsWith("PLM-") || name.includes("pipe") || name.includes("drainage") || name.includes("cpvc") || name.includes("upvc")) {
    return {
      headline: "Plumbing Pipes",
      subname: item.name,
      description: "Lead-free CPVC hot & cold water pipes and heavy-gauge PVC SWR ring-fit drainage stack pipes.",
      chips: ["CPVC SDR 11", "PVC SWR", "Potable"],
      imageSrc: "/materials/cement.jpg",
    };
  }

  // 12. ELECTRICAL
  if (code.startsWith("ELE-") || name.includes("wire") || name.includes("conduit") || name.includes("switch")) {
    return {
      headline: "Electrical Supplies",
      subname: item.name,
      description: "Flame Retardant Low Smoke (FRLS) multi-strand copper wire and heavy-duty rigid PVC electrical conduits.",
      chips: ["FRLS Copper", "IS 694", "Fire Retardant"],
      imageSrc: "/materials/steel.jpg",
    };
  }

  // 13. FORMWORK & PLYWOOD
  if (code.startsWith("FOR-") || name.includes("plywood") || name.includes("shuttering")) {
    return {
      headline: "Formwork & Plywood",
      subname: item.name,
      description: "Boiling Water Proof (BWP) phenolic film-faced shuttering plywood for smooth concrete casting.",
      chips: ["12mm BWP", "Film-Faced", "8 Repetitions"],
      imageSrc: "/materials/formwork.jpg",
    };
  }

  return {
    headline: "Construction Material",
    subname: item.name,
    description: item.description || "Certified construction grade material complying with standard Bureau of Indian Standards (BIS) specifications.",
    chips: [item.category, `Unit: ${item.unit}`],
    imageSrc: "/materials/cement.jpg",
  };
}

export default function RateLibraryPage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();

  // Location State
  const [userLocation, setUserLocation] = useState<UserLocationPreference>(() => {
    return (
      getUserSavedLocation() || {
        city: "Palghar",
        district: "Palghar",
        state: "Maharashtra",
        regionId: "maharashtra_pwd",
        regionName: "Maharashtra (Palghar / Mumbai MMR / Pune)",
        source: "manual",
        timestamp: new Date().toISOString(),
      }
    );
  });
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Data State
  const [rates, setRates] = useState<RateItem[]>([]);
  const [regions, setRegions] = useState<RateRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter State
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [filterSource, setFilterSource] = useState<"all" | "verified" | "custom">("all");

  // Sync / Seed Modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncRegion, setSyncRegion] = useState("maharashtra_pwd");
  const [overwriteCustom, setOverwriteCustom] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Edit / Add Modal
  const [editingItem, setEditingItem] = useState<RateItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // Reconciliation State
  const [reconciling, setReconciling] = useState(false);
  const [reconcileReport, setReconcileReport] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "material" as const,
    rate_type: "raw_material" as const,
    material_group: "cement_binding",
    unit: "bag",
    material_rate: 0,
    labour_rate: 0,
    equipment_rate: 0,
    combined_rate: 0,
    rate_source: "Manual" as "Manual" | "Supplier Quote" | "Schedule of Rates",
    supplier_or_source_name: "",
    location: "",
    region: "maharashtra_pwd",
    source_date: "",
    rate_status: "verified_source" as "verified_source" | "illustrative_needs_verification",
    specification: "",
    description: "",
    notes: "",
  });

  // Listen for location changes from other components
  useEffect(() => {
    const handleLocChange = () => {
      const updated = getUserSavedLocation();
      if (updated) {
        setUserLocation(updated);
        setSyncRegion(updated.regionId);
      }
    };
    window.addEventListener("anumaan_location_changed", handleLocChange);
    return () => window.removeEventListener("anumaan_location_changed", handleLocChange);
  }, []);

  // Fetch rate regions on mount
  useEffect(() => {
    api.getRateRegions()
      .then((regs) => {
        setRegions(regs);
        if (userLocation?.regionId) {
          setSyncRegion(userLocation.regionId);
        }
      })
      .catch((err) => console.error("Failed to load regions:", err));
  }, [userLocation?.regionId]);

  // Load Rates for current Org (strictly materials, no labour)
  const loadRates = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      setError(null);
      const items = await api.listRateItems(currentOrg.id, {
        region: userLocation.regionId,
        include_labour: false, // Strictly materials only
        include_archived: false,
      });

      // Extra client-side safeguard: filter out any labour entries
      const pureMaterials = items.filter(
        (it) => it.category === "material" && it.rate_type !== "labour_only" && !it.is_archived
      );

      setRates(pureMaterials);

      // If library has 0 items, offer to seed automatically
      if (pureMaterials.length === 0) {
        await handleSeedRates(userLocation.regionId);
      }
    } catch (err: any) {
      console.error("Failed to load rates:", err);
      setError(err.message || "Failed to load rate library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, [currentOrg?.id, userLocation.regionId]);

  // Seed / Sync Rates
  const handleSeedRates = async (regToSeed?: string) => {
    if (!currentOrg?.id) return;
    const reg = regToSeed || syncRegion;
    try {
      setSyncing(true);
      setError(null);
      const res = await api.seedDefaultRates(currentOrg.id, {
        region: reg,
        overwrite_custom: overwriteCustom,
      });
      setShowSyncModal(false);
      setSuccessMsg(res.message || "Material rates synced successfully.");
      await loadRates();
    } catch (err: any) {
      setError(err.message || "Failed to sync rates");
    } finally {
      setSyncing(false);
    }
  };

  // Run Idempotent Reconciliation & Deduplication
  const handleReconcileAndDeduplicate = async () => {
    if (!currentOrg?.id) return;
    try {
      setReconciling(true);
      setError(null);
      const res = await api.reconcileRateLibrary(currentOrg.id);
      setReconcileReport(res);
      setSuccessMsg(
        `Rate Library Cleaned! ${res.canonical_active_materials} active materials, ${res.duplicates_merged} duplicates merged, ${res.labour_archived} labour entries excluded.`
      );
      await loadRates();
    } catch (err: any) {
      setError(err.message || "Reconciliation failed.");
    } finally {
      setReconciling(false);
    }
  };

  // Open Edit Item Modal
  const handleOpenEdit = (item: RateItem) => {
    setEditingItem(item);
    setIsNewItem(false);
    setFormData({
      name: item.name,
      code: item.code || "",
      category: "material",
      rate_type: "raw_material",
      material_group: item.material_group || "cement_binding",
      unit: item.unit,
      material_rate: Number(item.material_rate) || 0,
      labour_rate: 0,
      equipment_rate: 0,
      combined_rate: Number(item.material_rate) || 0,
      rate_source: item.rate_source || "Manual",
      supplier_or_source_name: item.supplier_or_source_name || "",
      location: item.location || userLocation.city,
      region: item.region || userLocation.regionId,
      source_date: item.source_date || new Date().toISOString().split("T")[0],
      rate_status: item.rate_status || "verified_source",
      specification: item.specification || "",
      description: item.description || "",
      notes: item.notes || "",
    });
  };

  // Open Add New Material Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsNewItem(true);
    setFormData({
      name: "",
      code: "",
      category: "material",
      rate_type: "raw_material",
      material_group: "cement_binding",
      unit: "bag",
      material_rate: 0,
      labour_rate: 0,
      equipment_rate: 0,
      combined_rate: 0,
      rate_source: "Manual",
      supplier_or_source_name: "",
      location: userLocation.city,
      region: userLocation.regionId,
      source_date: new Date().toISOString().split("T")[0],
      rate_status: "illustrative_needs_verification",
      specification: "",
      description: "",
      notes: "",
    });
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id) return;
    try {
      setSavingItem(true);
      setError(null);

      const payload = {
        ...formData,
        material_rate: Number(formData.material_rate) || 0,
        labour_rate: 0,
        equipment_rate: 0,
        combined_rate: Number(formData.material_rate) || 0,
        category: "material" as const,
        rate_type: "raw_material" as const,
        location: formData.location || userLocation.city,
        region: userLocation.regionId,
      };

      if (isNewItem) {
        await api.createRateItem(currentOrg.id, payload);
        setSuccessMsg(`Material "${formData.name}" added successfully.`);
      } else if (editingItem) {
        await api.updateRateItem(currentOrg.id, editingItem.id, payload);
        setSuccessMsg(`Material "${formData.name}" updated successfully.`);
      }

      setEditingItem(null);
      setIsNewItem(false);
      await loadRates();
    } catch (err: any) {
      setError(err.message || "Failed to save material rate.");
    } finally {
      setSavingItem(false);
    }
  };

  // Reset Item to Default
  const handleResetToDefault = async (rateId: string) => {
    if (!currentOrg?.id) return;
    try {
      await api.resetRateToDefault(currentOrg.id, rateId);
      setSuccessMsg("Rate reset to regional default.");
      await loadRates();
    } catch (err: any) {
      setError(err.message || "Failed to reset rate");
    }
  };

  // Delete Material
  const handleDeleteItem = async (rateId: string) => {
    if (!currentOrg?.id || !confirm("Are you sure you want to remove this material from the Rate Library?")) return;
    try {
      await api.deleteRateItem(currentOrg.id, rateId);
      setSuccessMsg("Material removed from active library.");
      await loadRates();
    } catch (err: any) {
      setError(err.message || "Failed to delete item");
    }
  };

  // Filtered materials
  const filteredRates = useMemo(() => {
    return rates.filter((item) => {
      // 1. Strictly materials only
      if (item.category !== "material" || item.rate_type === "labour_only" || item.is_archived) {
        return false;
      }

      // 2. Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = (item.code || "").toLowerCase().includes(q);
        const matchSpec = (item.specification || "").toLowerCase().includes(q);
        const matchSupp = (item.supplier_or_source_name || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchSpec && !matchSupp) return false;
      }

      // 3. Category Group filter
      if (selectedGroup !== "all") {
        const code = (item.code || "").toUpperCase();
        if (selectedGroup === "cement_binding" && !code.startsWith("CEM-") && !code.startsWith("CON-")) return false;
        if (selectedGroup === "sand_aggregate" && !code.startsWith("AGG-")) return false;
        if (selectedGroup === "steel_reinforcement" && !code.startsWith("STL-")) return false;
        if (selectedGroup === "masonry_blocks" && !code.startsWith("BRK-") && !code.startsWith("BLK-")) return false;
        if (selectedGroup === "chemicals" && !code.startsWith("CHM-") && !code.startsWith("ADH-")) return false;
        if (selectedGroup === "finishing" && !code.startsWith("FIN-") && !code.startsWith("PNT-")) return false;
        if (selectedGroup === "plumbing" && !code.startsWith("PLM-")) return false;
        if (selectedGroup === "electrical" && !code.startsWith("ELE-")) return false;
        if (selectedGroup === "other_materials" && !code.startsWith("FOR-") && !code.startsWith("WPR-")) return false;
      }

      // 4. Source verification filter
      if (filterSource === "verified" && item.rate_status !== "verified_source") return false;
      if (filterSource === "custom" && !item.is_custom) return false;

      return true;
    });
  }, [rates, search, selectedGroup, filterSource]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* 1. TOP HEADER & HERO SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-[#102F57] font-heading">
              Rate Library (सामग्री दर सूची)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Materials Only
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Verified construction material prices calibrated to state PWD schedules, regional retail indices and contractor local rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReconcileAndDeduplicate}
            disabled={reconciling}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#DCE4EE] hover:bg-[#F3F6FA] text-[#102F57] rounded-xl text-xs font-semibold transition shadow-2xs"
            title="Clean up duplicates and exclude labour entries"
          >
            {reconciling ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#F7931E]" />
            )}
            <span>Clean & Deduplicate</span>
          </button>

          <button
            onClick={() => setShowSyncModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#102F57] hover:bg-[#0c2444] text-white rounded-xl text-xs font-semibold transition shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#F7931E]" />
            <span>Sync Regional Rates</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] rounded-xl text-xs font-bold transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* 2. LOCATION & REGIONAL PRICING BANNER */}
      <div className="bg-gradient-to-r from-[#102F57] to-[#1A4175] text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md shrink-0">
            <MapPin className="w-6 h-6 text-[#F7931E]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white">
                Construction Pricing Location: {userLocation.city}, {userLocation.state}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {userLocation.source === "gps" ? "GPS Detected" : "Manual Selection"}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Calibrated to {userLocation.regionName} • Schedule of Rates & retail indices applied automatically.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLocationModal(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition backdrop-blur-sm shrink-0"
        >
          <Navigation className="w-3.5 h-3.5 text-[#F7931E]" />
          <span>Change Location</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            ×
          </button>
        </div>
      )}

      {/* 3. MATERIAL CATEGORY TABS & SEARCH BAR */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#DCE4EE] shadow-2xs">
        {/* Horizontal Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {MATERIAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedGroup(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${selectedGroup === cat.id
                  ? "bg-[#102F57] text-white shadow-2xs"
                  : "bg-[#F3F6FA] text-[#263445] hover:bg-[#E8EEF5]"
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Source Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-[#DCE4EE]">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search materials by name, IS specification, code (e.g. OPC 53, River Sand, TMT 12mm)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#DCE4EE] rounded-xl text-xs text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <span className="text-xs text-[#64748B] font-medium hidden sm:inline">Source:</span>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="px-3 py-2 border border-[#DCE4EE] rounded-xl text-xs text-[#263445] bg-[#F3F6FA] font-medium focus:outline-none focus:ring-2 focus:ring-[#102F57]/15"
            >
              <option value="all">All Sources</option>
              <option value="verified">Verified Official Source Only</option>
              <option value="custom">Contractor Customized Only</option>
            </select>

            <span className="text-xs text-[#64748B] font-mono px-2 py-1 bg-[#F3F6FA] rounded-lg">
              {filteredRates.length} materials
            </span>
          </div>
        </div>
      </div>

      {/* 4. MATERIAL TILES GRID */}
      {loading ? (
        <div className="text-center py-20 bg-white border border-[#DCE4EE] rounded-2xl">
          <div className="w-10 h-10 border-4 border-[#DCE4EE] border-t-[#102F57] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-[#64748B] font-devanagari">
            {t("common.loading") || "Loading material rates..."}
          </p>
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#DCE4EE] rounded-2xl space-y-3">
          <Layers className="w-10 h-10 text-[#64748B] mx-auto stroke-[1.5]" />
          <h3 className="font-bold text-sm text-[#102F57]">No construction materials match your filter</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            Try adjusting your search keywords, clear category filter, or sync rates for your region.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedGroup("all");
              setFilterSource("all");
            }}
            className="px-4 py-2 bg-[#102F57] text-white rounded-xl text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRates.map((item) => {
            const display = getMaterialDisplayInfo(item);
            const isVerified = item.rate_status === "verified_source";
            const matPrice = Number(item.material_rate) || 0;

            return (
              <div
                key={item.id}
                className="bg-white border border-[#DCE4EE] rounded-2xl overflow-hidden shadow-2xs hover:border-[#102F57]/40 hover:shadow-sm transition-all duration-150 flex flex-col justify-between"
              >
                <div>
                  {/* Photo with High Quality Tag */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={display.imageSrc}
                      alt={item.name}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm flex items-center space-x-1.5 border border-[#DCE4EE]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[11px] font-semibold text-[#102F57]">High Quality</span>
                    </div>

                    {item.code && (
                      <div className="absolute bottom-2.5 right-3 bg-[#102F57]/90 text-white font-mono text-[10px] px-2 py-0.5 rounded shadow-sm">
                        {item.code}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <div>
                      <h3 className="font-bold text-base text-[#102F57] leading-snug font-heading">
                        {display.headline}
                      </h3>
                      <p className="text-xs text-[#263445] font-semibold mt-0.5 line-clamp-1">
                        {item.name}
                      </p>
                    </div>

                    <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2">
                      {item.description || display.description}
                    </p>

                    {/* Chips */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {display.chips.map((chip, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-[#F3F6FA] text-[#102F57] text-[10px] font-medium rounded-md border border-[#DCE4EE]"
                        >
                          {chip}
                        </span>
                      ))}
                      {item.specification && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-mono rounded-md border border-blue-200 truncate max-w-[150px]">
                          {item.specification}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pricing Footer */}
                <div className="p-4 bg-[#F8FAFC] border-t border-[#DCE4EE] space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#64748B] block">
                        Material Rate ({item.unit})
                      </span>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-xl font-bold font-mono text-[#102F57]">
                          {formatCurrencyINR(matPrice)}
                        </span>
                        <span className="text-xs text-[#64748B]">/ {item.unit}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {isVerified ? (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                          Verify Local
                        </span>
                      )}
                      <span className="text-[10px] text-[#64748B] block truncate max-w-[130px] mt-0.5" title={item.supplier_or_source_name || "Official CSR"}>
                        {item.supplier_or_source_name || "PWD Schedule"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#DCE4EE]/60 text-xs">
                    <div className="flex items-center space-x-1">
                      {item.is_custom && (
                        <button
                          onClick={() => handleResetToDefault(item.id)}
                          className="text-[11px] text-[#64748B] hover:text-[#102F57] inline-flex items-center"
                          title="Reset to default regional schedule rate"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-3 py-1 bg-[#102F57] hover:bg-[#0c2444] text-white text-xs font-semibold rounded-lg inline-flex items-center space-x-1 transition shadow-2xs"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Rate</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. LOCATION PERMISSION / SWITCHER MODAL */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        forceShow={showLocationModal}
        onLocationSelected={(loc) => {
          setUserLocation(loc);
          setShowLocationModal(false);
          setSuccessMsg(`Location updated to ${loc.city}, ${loc.state}. Rates adjusted.`);
        }}
      />

      {/* 6. SYNC REGIONAL RATES MODAL */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => !syncing && setShowSyncModal(false)}
        title="Sync Regional Construction Material Rates"
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-[#64748B] leading-relaxed">
            Select an authoritative Indian Schedule of Rates benchmark to calibrate your organization's material prices:
          </p>

          <div className="space-y-2">
            {regions.map((reg) => (
              <label
                key={reg.id}
                className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${syncRegion === reg.id
                    ? "bg-[#EEF3F9] border-[#102F57]"
                    : "bg-[#F3F6FA] border-[#DCE4EE] hover:bg-[#E8EEF5]"
                  }`}
              >
                <input
                  type="radio"
                  name="syncRegion"
                  value={reg.id}
                  checked={syncRegion === reg.id}
                  onChange={(e) => setSyncRegion(e.target.value)}
                  className="mt-1 accent-[#102F57]"
                />
                <div>
                  <span className="font-bold text-[#102F57] block">{reg.name}</span>
                  <span className="text-[11px] text-[#64748B] block mt-0.5">
                    Authority: {reg.authority} • {reg.source_doc}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <label className="flex items-center space-x-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={overwriteCustom}
              onChange={(e) => setOverwriteCustom(e.target.checked)}
              className="accent-[#102F57]"
            />
            <span className="text-xs text-[#263445]">
              Overwrite any customized rates with latest regional defaults
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE4EE]">
            <button
              type="button"
              disabled={syncing}
              onClick={() => setShowSyncModal(false)}
              className="btn-secondary px-3.5 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={() => handleSeedRates()}
              className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Regional Rates</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* 7. EDIT / ADD MATERIAL MODAL */}
      <Modal
        isOpen={Boolean(editingItem || isNewItem)}
        onClose={() => !savingItem && (setEditingItem(null), setIsNewItem(false))}
        title={isNewItem ? "Add Construction Material" : "Edit Material Price & Specification"}
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Material Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. OPC 53 Grade Cement (50 kg Bag)"
              className="w-full px-3 py-2 border border-[#DCE4EE] rounded-xl text-xs text-[#263445] focus:ring-2 focus:ring-[#102F57]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Material Rate (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={formData.material_rate}
                onChange={(e) => setFormData({ ...formData, material_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-[#DCE4EE] rounded-xl text-xs font-mono text-[#263445] focus:ring-2 focus:ring-[#102F57]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Standard Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-[#DCE4EE] rounded-xl text-xs text-[#263445] bg-white focus:ring-2 focus:ring-[#102F57]"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Supplier / Quotation Source
              </label>
              <input
                type="text"
                value={formData.supplier_or_source_name}
                onChange={(e) => setFormData({ ...formData, supplier_or_source_name: e.target.value })}
                placeholder="e.g. UltraTech Dealer / Palghar Yard"
                className="w-full px-3 py-2 border border-[#DCE4EE] rounded-xl text-xs text-[#263445] focus:ring-2 focus:ring-[#102F57]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Price Verification Status
              </label>
              <select
                value={formData.rate_status}
                onChange={(e) => setFormData({ ...formData, rate_status: e.target.value as any })}
                className="w-full px-3 py-2 border border-[#DCE4EE] rounded-xl text-xs text-[#263445] bg-white focus:ring-2 focus:ring-[#102F57]"
              >
                <option value="verified_source">Verified Source (Official / Quoted)</option>
                <option value="illustrative_needs_verification">Contractor Rate / Verify Local</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Specification / Standards
            </label>
            <input
              type="text"
              value={formData.specification}
              onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
              placeholder="e.g. IS 12269:2013 / High Strength 53 Grade"
              className="w-full px-3 py-2 border border-[#DCE4EE] rounded-xl text-xs text-[#263445] focus:ring-2 focus:ring-[#102F57]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Notes / Technical Remarks
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Moisture proof storage required; GST 28% extra on retail billing."
              className="w-full px-3 py-2 border border-[#DCE4EE] rounded-xl text-xs text-[#263445] focus:ring-2 focus:ring-[#102F57]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE4EE]">
            <button
              type="button"
              disabled={savingItem}
              onClick={() => {
                setEditingItem(null);
                setIsNewItem(false);
              }}
              className="btn-secondary px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingItem}
              className="btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              {savingItem ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Material</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}