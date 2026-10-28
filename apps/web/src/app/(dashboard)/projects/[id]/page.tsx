"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  ArrowLeft,
  Building,
  Car,
  MapPin,
  Calendar,
  User,
  Users,
  UserPlus,
  Calculator,
  FileSpreadsheet,
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Download,
  ExternalLink,
  Edit2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  Percent,
  Ruler,
  Layers,
  Trash2,
  Eye,
  UploadCloud,
} from "lucide-react";
import { useTranslation } from "../../../../context/I18nContext";
import { useOrg } from "../../../../context/OrgContext";
import {
  api,
  Estimate,
  Quotation,
  Invoice,
  DrawingItem,
} from "../../../../lib/api";
import { Modal } from "../../../../components/Modal";
import { ProjectForm, ProjectFormData } from "../../../../components/ProjectForm";
import { ClientForm, ClientFormData } from "../../../../components/ClientForm";
import {
  formatIndianCurrency,
  calculateQuickEstimate,
} from "../../../../lib/calculations";

export default function ProjectWorkspacePage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  // Active step: 1 (Details), 2 (Estimate), 3 (Quotation), 4 (Invoices)
  const initialStep = parseInt(searchParams.get("step") || "1", 10);
  const [activeStep, setActiveStep] = useState<number>(
    initialStep >= 1 && initialStep <= 4 ? initialStep : 1
  );

  const [project, setProject] = useState<any | null>(null);
  const [client, setClient] = useState<any | null>(null);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [showUploadDrawingModal, setShowUploadDrawingModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDrawingName, setUploadDrawingName] = useState<string>("");
  const [uploadEstimateId, setUploadEstimateId] = useState<string>("");
  const [uploadingDrawing, setUploadingDrawing] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showAssignClientModal, setShowAssignClientModal] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showQuickEstimatorModal, setShowQuickEstimatorModal] = useState(false);
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState<Invoice | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Quick Estimator Form State
  const [quickCalcArea, setQuickCalcArea] = useState<number>(1200);
  const [quickCalcFloors, setQuickCalcFloors] = useState<number>(1);
  const [quickCalcTier, setQuickCalcTier] = useState<"economy" | "standard" | "luxury">("standard");

  // Milestone Form State
  const [milestoneName, setMilestoneName] = useState("Advance Booking Payment");
  const [milestonePct, setMilestonePct] = useState(15);
  const [milestoneAmount, setMilestoneAmount] = useState<number>(0);
  const [milestoneDueDate, setMilestoneDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [milestoneNotes, setMilestoneNotes] = useState("");

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("NEFT");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");

  // Load All Project Data
  const loadWorkspaceData = async () => {
    if (!currentOrg?.id || !projectId) return;
    try {
      setLoading(true);
      setError(null);

      const [projData, clientList, estList, quotList, invList, drawingList] = await Promise.all([
        api.getProject(currentOrg.id, projectId),
        api.listClients(currentOrg.id),
        api.listEstimates(currentOrg.id, { project_id: projectId }),
        api.listQuotations(currentOrg.id, { project_id: projectId }),
        api.listInvoices(currentOrg.id, { project_id: projectId }),
        api.listProjectDrawings(currentOrg.id, projectId),
      ]);

      setProject(projData);
      setAllClients(clientList);
      setEstimates(estList);
      setQuotations(quotList);
      setInvoices(invList);
      setDrawings(drawingList);

      if (projData.client_id) {
        const matched = clientList.find((c: any) => c.id === projData.client_id);
        setClient(matched || null);
      } else {
        setClient(null);
      }
    } catch (err: any) {
      console.error("Failed to load project workspace data:", err);
      setError(err.message || "Failed to load project workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [currentOrg?.id, projectId]);

  // Derived financial summary
  const primaryQuotation = quotations[0] || null;
  const primaryEstimate = estimates[0] || null;

  const totalContractValue = Number(primaryQuotation?.total_amount ?? primaryQuotation?.grand_total ?? primaryEstimate?.total_amount ?? 0);
  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalReceived);
  const collectionPct = totalContractValue > 0 ? Math.round((totalReceived / totalContractValue) * 100) : 0;

  // Step completion status
  const isStep1Done = Boolean(project?.name);
  const isStep2Done = estimates.length > 0;
  const isStep3Done = quotations.length > 0;
  const isStep4Done = invoices.some((i) => i.status === "paid");

  // Step 1: Assign Client Handler
  const handleAssignClient = async (clientId: string) => {
    if (!currentOrg?.id || !project) return;
    setActionLoading(true);
    try {
      await api.updateProject(currentOrg.id, project.id, { client_id: clientId || null });
      setShowAssignClientModal(false);
      await loadWorkspaceData();
      setSuccessMsg("Client updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Step 1: Create & Assign Client Inline
  const handleCreateAndAssignClient = async (data: ClientFormData) => {
    if (!currentOrg?.id || !project) return;
    setActionLoading(true);
    try {
      const newClient = await api.createClient(currentOrg.id, data);
      await api.updateProject(currentOrg.id, project.id, { client_id: newClient.id });
      setShowCreateClientModal(false);
      await loadWorkspaceData();
      setSuccessMsg(`Client "${newClient.name}" created and assigned to this project.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Drawing Upload & Delete Handlers
  const handleUploadDrawingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !currentOrg?.id || !projectId) return;
    try {
      setUploadingDrawing(true);
      setError(null);
      const uploaded = await api.uploadProjectDrawing(
        currentOrg.id,
        projectId,
        uploadFile,
        uploadDrawingName || uploadFile.name.replace(/\.[^/.]+$/, ""),
        uploadEstimateId || undefined
      );
      setShowUploadDrawingModal(false);
      setUploadFile(null);
      setUploadDrawingName("");
      setSuccessMsg(`Drawing "${uploaded.name}" uploaded successfully!`);
      await loadWorkspaceData();
    } catch (err: any) {
      setError(err.message || "Failed to upload drawing.");
    } finally {
      setUploadingDrawing(false);
    }
  };

  const handleDeleteDrawing = async (drawingId: string) => {
    if (!currentOrg?.id || !confirm(t("drawings.deleteDrawingConfirm") || "Delete this drawing?")) return;
    try {
      await api.deleteDrawing(currentOrg.id, drawingId);
      setDrawings((prev) => prev.filter((d) => d.id !== drawingId));
      setSuccessMsg("Drawing deleted successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to delete drawing.");
    }
  };

  // Step 2: Create Quick Civil Estimate
  const handleCreateQuickEstimate = async () => {
    if (!currentOrg?.id || !project) return;
    setActionLoading(true);
    try {
      const regionId = (project.state || "").toLowerCase().includes("maharashtra")
        ? "maharashtra_pwd"
        : (project.state || "").toLowerCase().includes("karnataka")
        ? "karnataka_pwd"
        : "national_cpwd";

      const quick = calculateQuickEstimate(quickCalcArea, quickCalcFloors, quickCalcTier, regionId);

      const estNum = `EST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const createdEst = await api.createEstimate(currentOrg.id, {
        project_id: project.id,
        estimate_number: estNum,
        name: `${project.name} — ${quickCalcArea} sq.ft (${quickCalcTier.toUpperCase()})`,
        category: project.project_type || "building",
        overhead_pct: 5.0,
        contingency_pct: 3.0,
        gst_pct: 18.0,
      });

      // Add standard civil BOQ items with precalculated quantities
      const itemsToAdd = [
        {
          item_number: "1.1",
          description: `Civil Structure - Cement Requirements (OPC 43/53 & PPC)`,
          category: "material",
          quantity: quick.cementBags,
          unit: "bag",
          unit_rate: 385.0,
          amount: Math.round(quick.cementBags * 385.0),
          notes: `${quick.totalAreaSqft} sq.ft × 0.45 bags/sq.ft`,
        },
        {
          item_number: "2.1",
          description: `Reinforcement Steel Rebar Fe 500D (Cut, Bend & Fix)`,
          category: "material",
          quantity: quick.steelTonnes,
          unit: "tonne",
          unit_rate: 68500.0,
          amount: Math.round(quick.steelTonnes * 68500.0),
          notes: `${quick.steelKg} kg @ ₹68.5/kg`,
        },
        {
          item_number: "3.1",
          description: `Washed River Sand / Coarse Plaster Sand`,
          category: "material",
          quantity: quick.sandBrass,
          unit: "brass",
          unit_rate: 8200.0,
          amount: Math.round(quick.sandBrass * 8200.0),
          notes: `${quick.sandBrass} brass equivalent`,
        },
        {
          item_number: "4.1",
          description: `Crushed Stone Aggregate 20mm/10mm Metal (Gitti)`,
          category: "material",
          quantity: quick.aggBrass,
          unit: "brass",
          unit_rate: 4500.0,
          amount: Math.round(quick.aggBrass * 4500.0),
          notes: `${quick.aggBrass} brass aggregate`,
        },
        {
          item_number: "5.1",
          description: `Kiln-Fired Red Clay Bricks (Class-A) for Masonry`,
          category: "material",
          quantity: Math.round(quick.bricksCount / 1000 * 100) / 100,
          unit: "1000 nos",
          unit_rate: 9500.0,
          amount: Math.round((quick.bricksCount / 1000) * 9500.0),
          notes: `${quick.bricksCount} bricks total`,
        },
        {
          item_number: "6.1",
          description: `Civil & Structural Execution Labour (Masonry, Shuttering, Casting)`,
          category: "labour",
          quantity: quick.totalAreaSqft,
          unit: "sqft",
          unit_rate: 320.0,
          amount: Math.round(quick.totalAreaSqft * 320.0),
          notes: `Lump-sum contractor civil work labour`,
        },
      ];

      for (const it of itemsToAdd) {
        await api.addBOQItem(currentOrg.id, createdEst.id, it as any);
      }

      setShowQuickEstimatorModal(false);
      await loadWorkspaceData();
      setActiveStep(2);
      setSuccessMsg("Quick civil estimate calculated and saved to project workspace.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to generate estimate.");
    } finally {
      setActionLoading(false);
    }
  };

  // Step 3: Generate Quotation from Selected Estimate
  const handleGenerateQuotationFromEstimate = async (est: Estimate) => {
    if (!currentOrg?.id || !project) return;
    setActionLoading(true);
    try {
      const isRoad = project.project_type === "road";
      // AI recommended GST based on project scope
      const recommendedGstRate = isRoad ? 18.0 : 12.0;

      const quotation = await api.createQuotation(currentOrg.id, {
        estimate_id: est.id,
        project_id: project.id,
        client_id: project.client_id || undefined,
        language: project.quotation_language || "en",
        tax_configured: true,
        tax_name: "GST",
        tax_rate: recommendedGstRate,
        payment_terms:
          "1. 15% Advance on agreement.\n2. 25% Plinth level completion.\n3. 30% Slab casting completion.\n4. 20% Brickwork & internal plaster.\n5. 10% Handover & final inspection.",
        exclusions: "Electricity & water charges during construction to be provided by client at site.",
        notes: `Prepared via Anumaan (अनुमान) automatic estimation engine. Strictly based on verified benchmark rates.`,
      });

      await loadWorkspaceData();
      setActiveStep(3);
      setSuccessMsg(`Quotation "${quotation.quotation_number}" generated from estimate.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to generate quotation.");
    } finally {
      setActionLoading(false);
    }
  };

  // Step 4: Generate Standard 5-Stage Construction Milestones
  const handleGenerateStandardMilestones = async () => {
    if (!currentOrg?.id || !project) return;
    const baseAmount = totalContractValue || 1000000;
    setActionLoading(true);

    const standardStages = [
      { name: "1. Mobilization Advance & Site Setup", pct: 15, days: 7 },
      { name: "2. Excavation & Plinth Level Completion", pct: 25, days: 30 },
      { name: "3. RCC Slab & Superstructure Casting", pct: 30, days: 60 },
      { name: "4. Brickwork, Plaster & MEP Concealing", pct: 20, days: 90 },
      { name: "5. Flooring, Painting & Final Handover", pct: 10, days: 120 },
    ];

    try {
      for (const stg of standardStages) {
        const amt = Math.round(baseAmount * (stg.pct / 100.0));
        const dueDate = new Date(Date.now() + stg.days * 86400000).toISOString().split("T")[0];
        await api.createInvoice(currentOrg.id, {
          project_id: project.id,
          quotation_id: primaryQuotation?.id,
          milestone_name: stg.name,
          percentage: stg.pct,
          amount: amt,
          status: "draft",
          due_date: dueDate,
        });
      }
      await loadWorkspaceData();
      setSuccessMsg("Standard 5-stage payment milestone schedule generated.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to generate milestones.");
    } finally {
      setActionLoading(false);
    }
  };

  // Step 4: Create Custom Milestone
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !project) return;
    setActionLoading(true);
    try {
      await api.createInvoice(currentOrg.id, {
        project_id: project.id,
        quotation_id: primaryQuotation?.id,
        milestone_name: milestoneName.trim(),
        percentage: Number(milestonePct) || 0,
        amount: Number(milestoneAmount) || 0,
        status: "draft",
        due_date: milestoneDueDate || undefined,
        notes: milestoneNotes.trim() || undefined,
      });
      setShowAddMilestoneModal(false);
      setMilestoneName("");
      setMilestoneAmount(0);
      setMilestoneNotes("");
      await loadWorkspaceData();
      setSuccessMsg("Payment milestone added.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add milestone.");
    } finally {
      setActionLoading(false);
    }
  };

  // Step 4: Record Payment Received
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !showRecordPaymentModal) return;
    setActionLoading(true);
    try {
      const inv = showRecordPaymentModal;
      const newPaidAmount = Number(inv.paid_amount || 0) + Number(paymentAmount);
      await api.updateInvoice(currentOrg.id, inv.id, {
        paid_amount: newPaidAmount,
        paid_date: paymentDate,
        payment_method: paymentMethod,
        notes: paymentNotes.trim()
          ? `${inv.notes ? inv.notes + "\n" : ""}Payment: ₹${paymentAmount} via ${paymentMethod} (${paymentDate}) - ${paymentNotes}`
          : inv.notes,
      });
      setShowRecordPaymentModal(null);
      setPaymentAmount(0);
      setPaymentNotes("");
      await loadWorkspaceData();
      setSuccessMsg(`Payment of ${formatIndianCurrency(paymentAmount)} recorded.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to record payment.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !project) {
    return (
      <div className="py-24 text-center text-xs text-[#64748B] font-devanagari">
        <div className="animate-spin w-8 h-8 border-2 border-[#102F57] border-t-transparent rounded-full mx-auto mb-3" />
        <span>{t("common.loading") || "Loading project workspace..."}</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-16 text-center space-y-3 font-devanagari max-w-md mx-auto">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#102F57]">Project Not Found</h2>
        <p className="text-xs text-[#64748B]">This project may have been deleted or archived.</p>
        <Link href="/projects" className="btn-primary inline-flex items-center gap-1.5 text-xs">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>
      </div>
    );
  }

  const isRoad = project.project_type === "road";

  return (
    <div className="space-y-6 font-devanagari pb-16">
      {/* 1. TOP HEADER & PROJECT IDENTITY BAR */}
      <div className="bg-white border border-[#DCE4EE] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <Link
            href="/projects"
            className="p-2 rounded-xl border border-[#DCE4EE] text-[#102F57] hover:bg-[#F3F6FA] transition shrink-0 mt-0.5"
            title="Back to all projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 bg-[#EEF3F9] text-[#102F57] rounded-lg">
                {isRoad ? <Car className="w-4 h-4 text-[#F7931E]" /> : <Building className="w-4 h-4 text-[#102F57]" />}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#102F57] font-heading tracking-tight">
                {project.name}
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  project.status === "in_progress"
                    ? "bg-[#FFF6EB] text-[#B86B08] border-[#F7931E]/30"
                    : project.status === "completed"
                    ? "bg-emerald-50 text-[#16835D] border-emerald-200"
                    : "bg-[#EEF3F9] text-[#102F57] border-[#DCE4EE]"
                }`}
              >
                {t(`status.${project.status}`) || project.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#F7931E] shrink-0" />
                <span>
                  {[project.site_location, project.city, project.state].filter(Boolean).join(", ") ||
                    "Location not specified"}
                </span>
              </span>
              {project.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Start: {project.start_date}</span>
                </span>
              )}
              <span className="font-mono text-[11px] bg-[#F3F6FA] px-2 py-0.5 rounded border border-[#DCE4EE]">
                Output Lang: {project.quotation_language?.toUpperCase() || "EN"}
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setShowEditProjectModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#102F57] bg-[#EEF3F9] hover:bg-[#E8EEF5] border border-[#DCE4EE] rounded-lg transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Project</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. THE 4-STEP GUIDED PROJECT WORKSPACE STEPPER */}
      <div className="bg-white border border-[#DCE4EE] rounded-2xl p-2 sm:p-3 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
              activeStep === 1
                ? "bg-[#102F57] text-white border-[#102F57] shadow-sm"
                : isStep1Done
                ? "bg-[#F3F6FA] text-[#102F57] border-[#DCE4EE] hover:bg-[#EEF3F9]"
                : "bg-white text-[#64748B] border-[#DCE4EE]"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                activeStep === 1
                  ? "bg-white text-[#102F57]"
                  : isStep1Done
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isStep1Done && activeStep !== 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : "1"}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold leading-tight font-heading">Project Details</div>
              <div className={`text-[11px] truncate ${activeStep === 1 ? "text-slate-200" : "text-[#64748B]"}`}>
                {client ? client.name : "Client & Site Info"}
              </div>
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
              activeStep === 2
                ? "bg-[#102F57] text-white border-[#102F57] shadow-sm"
                : isStep2Done
                ? "bg-[#F3F6FA] text-[#102F57] border-[#DCE4EE] hover:bg-[#EEF3F9]"
                : "bg-white text-[#64748B] border-[#DCE4EE]"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                activeStep === 2
                  ? "bg-white text-[#102F57]"
                  : isStep2Done
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isStep2Done && activeStep !== 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : "2"}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold leading-tight font-heading">Estimate & BOQ</div>
              <div className={`text-[11px] truncate ${activeStep === 2 ? "text-slate-200" : "text-[#64748B]"}`}>
                {estimates.length > 0 ? `${estimates.length} Estimate(s)` : "Quantities & Rates"}
              </div>
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
              activeStep === 3
                ? "bg-[#102F57] text-white border-[#102F57] shadow-sm"
                : isStep3Done
                ? "bg-[#F3F6FA] text-[#102F57] border-[#DCE4EE] hover:bg-[#EEF3F9]"
                : "bg-white text-[#64748B] border-[#DCE4EE]"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                activeStep === 3
                  ? "bg-white text-[#102F57]"
                  : isStep3Done
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isStep3Done && activeStep !== 3 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : "3"}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold leading-tight font-heading">Quotation & GST</div>
              <div className={`text-[11px] truncate ${activeStep === 3 ? "text-slate-200" : "text-[#64748B]"}`}>
                {quotations.length > 0 ? quotations[0].quotation_number : "Commercial Proposal"}
              </div>
            </div>
          </button>

          {/* Step 4 */}
          <button
            type="button"
            onClick={() => setActiveStep(4)}
            className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
              activeStep === 4
                ? "bg-[#102F57] text-white border-[#102F57] shadow-sm"
                : isStep4Done
                ? "bg-[#F3F6FA] text-[#102F57] border-[#DCE4EE] hover:bg-[#EEF3F9]"
                : "bg-white text-[#64748B] border-[#DCE4EE]"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                activeStep === 4
                  ? "bg-white text-[#102F57]"
                  : isStep4Done
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isStep4Done && activeStep !== 4 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : "4"}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold leading-tight font-heading">Invoices & Milestones</div>
              <div className={`text-[11px] truncate ${activeStep === 4 ? "text-slate-200" : "text-[#64748B]"}`}>
                {invoices.length > 0 ? `${invoices.length} Milestone(s)` : "Progress Billing"}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: PROJECT DETAILS & CLIENT CARD                                    */}
      {/* ========================================================================= */}
      {activeStep === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Site Location & Civil Specifications Card */}
            <div className="md:col-span-2 bg-white border border-[#DCE4EE] rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DCE4EE] pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#F7931E]" />
                  <h3 className="font-bold text-sm text-[#102F57] font-heading">
                    Construction Site Location & Scope
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProjectModal(true)}
                  className="text-xs text-[#102F57] font-semibold hover:underline"
                >
                  Edit Location
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#F3F6FA] rounded-xl border border-[#DCE4EE]">
                  <span className="text-[11px] text-[#64748B] block">Site Plot & Landmark</span>
                  <span className="font-semibold text-[#263445] text-sm mt-0.5 block">
                    {project.site_location || "Not specified"}
                  </span>
                </div>

                <div className="p-3 bg-[#F3F6FA] rounded-xl border border-[#DCE4EE]">
                  <span className="text-[11px] text-[#64748B] block">City & State</span>
                  <span className="font-semibold text-[#263445] text-sm mt-0.5 block">
                    {[project.city, project.state].filter(Boolean).join(", ") || "Not specified"}
                  </span>
                </div>

                <div className="p-3 bg-[#F3F6FA] rounded-xl border border-[#DCE4EE]">
                  <span className="text-[11px] text-[#64748B] block">Construction Category</span>
                  <span className="font-semibold text-[#102F57] text-sm mt-0.5 capitalize block">
                    {t(`projectType.${project.project_type}`) || project.project_type}
                  </span>
                </div>

                <div className="p-3 bg-[#F3F6FA] rounded-xl border border-[#DCE4EE]">
                  <span className="text-[11px] text-[#64748B] block">Quotation Output Language</span>
                  <span className="font-semibold text-[#102F57] text-sm mt-0.5 block">
                    {project.quotation_language === "mr"
                      ? "मराठी (दरपत्रक)"
                      : project.quotation_language === "hi"
                      ? "हिन्दी (कोटेशन)"
                      : "English (Official BOQ)"}
                  </span>
                </div>
              </div>

              {project.description && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-700 block">Project Description & Notes</span>
                  <p className="text-slate-600 leading-relaxed">{project.description}</p>
                </div>
              )}
            </div>

            {/* Linked Client Information Card */}
            <div className="bg-white border border-[#DCE4EE] rounded-2xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#DCE4EE] pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#102F57]" />
                    <h3 className="font-bold text-sm text-[#102F57] font-heading">
                      Client Information
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAssignClientModal(true)}
                      className="text-xs text-[#102F57] font-semibold hover:underline"
                    >
                      {client ? "Change" : "+ Select"}
                    </button>
                    {!client && (
                      <button
                        type="button"
                        onClick={() => setShowCreateClientModal(true)}
                        className="text-xs text-[#F7931E] font-semibold hover:underline"
                      >
                        + New
                      </button>
                    )}
                  </div>
                </div>

                {client ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 bg-[#EEF3F9] rounded-xl border border-[#DCE4EE]">
                      <span className="text-sm font-bold text-[#102F57] block">{client.name}</span>
                      {client.contact_person && (
                        <span className="text-[11px] text-[#64748B] block mt-0.5">
                          Attn: {client.contact_person}
                        </span>
                      )}
                    </div>

                    {client.phone && (
                      <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                        <span className="text-[#64748B]">Phone:</span>
                        <span className="font-semibold text-[#263445]">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                        <span className="text-[#64748B]">Email:</span>
                        <span className="font-semibold text-[#263445] truncate max-w-[160px]">{client.email}</span>
                      </div>
                    )}
                    {client.billing_address && (
                      <div className="text-xs py-1 text-[#64748B]">
                        <span>Billing Address:</span>
                        <p className="text-[#263445] font-medium mt-0.5 leading-snug">{client.billing_address}</p>
                      </div>
                    )}
                    {client.gstin && (
                      <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
                        <span className="text-[#64748B]">GSTIN:</span>
                        <span className="font-mono font-bold text-[#102F57]">{client.gstin}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-[#F3F6FA] border border-dashed border-[#DCE4EE] rounded-xl space-y-2">
                    <Users className="w-8 h-8 text-[#64748B] mx-auto" />
                    <span className="font-semibold text-xs text-[#102F57] block">No Client Assigned</span>
                    <p className="text-[11px] text-[#64748B] leading-relaxed">
                      You can add or select a client now, or complete the estimate first and assign the client before finalizing the quotation.
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateClientModal(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#102F57] text-white hover:bg-[#0c2444]"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-[#F7931E]" />
                        <span>Add New Client</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAssignClientModal(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#DCE4EE] text-[#102F57] hover:bg-[#F3F6FA]"
                      >
                        Select Existing
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 1 Next Button */}
              <div className="pt-4 border-t border-[#DCE4EE]">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="w-full btn-primary py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>Proceed to Step 2: Estimate & BOQ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: ESTIMATE & BOQ WORKFLOW                                          */}
      {/* ========================================================================= */}
      {activeStep === 2 && (
        <div className="space-y-6">
          {/* Action Hero Bar */}
          <div className="bg-[#EEF3F9] border border-[#DCE4EE] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-[#102F57] font-heading flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#F7931E]" />
                <span>Project Estimates & Bill of Quantities (BOQ)</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Calculate materials automatically from dimensions, review itemized line items, edit rates directly, and verify transparent totals.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQuickEstimatorModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#102F57] text-white hover:bg-[#0c2444] transition shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F7931E]" />
                <span>Quick Civil Calculator</span>
              </button>
              <Link
                href={`/estimates?new=1&project_id=${project.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#DCE4EE] text-[#102F57] hover:bg-[#F3F6FA] transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#F7931E]" />
                <span>Detailed Custom Estimate</span>
              </Link>
            </div>
          </div>

          {/* Estimates List */}
          {estimates.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#DCE4EE] rounded-2xl space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 bg-[#EEF3F9] text-[#102F57] rounded-full flex items-center justify-center mx-auto">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#102F57]">No Estimates Created Yet</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Use the Quick Civil Calculator to generate an estimate in 5 seconds based on your site area, or build an itemized detailed BOQ.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickEstimatorModal(true)}
                  className="btn-accent px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Quick Calculator</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {estimates.map((est) => (
                  <div
                    key={est.id}
                    className="bg-white border border-[#DCE4EE] rounded-2xl p-5 shadow-xs hover:border-[#102F57]/40 transition space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#102F57] block">
                            {est.estimate_number}
                          </span>
                          <h4 className="font-bold text-sm text-[#263445] font-heading mt-0.5">
                            {est.name}
                          </h4>
                        </div>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EEF3F9] text-[#102F57] border border-[#DCE4EE] uppercase">
                          {est.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2.5 bg-[#F3F6FA] rounded-lg">
                          <span className="text-[11px] text-[#64748B] block">Items in BOQ</span>
                          <span className="font-semibold text-[#102F57] text-sm">
                            {est.item_count ?? est.items?.length ?? 0} Items
                          </span>
                        </div>
                        <div className="p-2.5 bg-[#F3F6FA] rounded-lg">
                          <span className="text-[11px] text-[#64748B] block">Taxable Total</span>
                          <span className="font-bold font-mono text-[#102F57] text-sm">
                            {formatIndianCurrency(est.taxable_amount || est.total_amount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B] pt-1">
                        <span>Overhead: {est.overhead_pct}%</span>
                        <span>•</span>
                        <span>Emergency Fund: {est.contingency_pct}%</span>
                        <span>•</span>
                        <span>GST: {est.gst_pct}%</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#DCE4EE] flex items-center justify-between gap-2">
                      <Link
                        href={`/estimates/${est.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#102F57] hover:underline"
                      >
                        <span>View / Edit BOQ</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleGenerateQuotationFromEstimate(est)}
                        disabled={actionLoading}
                        className="btn-accent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Quotation ➔</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>


          {/* Construction Drawings & Quantity Takeoff Engine Section */}
          <div className="bg-white border border-[#DCE4EE] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE4EE] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#102F57] font-heading flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-[#F7931E]" />
                  <span>{t("drawings.drawingsList") || "Project Construction Drawings & Takeoff Engine"}</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {t("drawings.takeoffSubtitle") || "Upload blueprints or architectural PDFs, calibrate scale, and measure quantities directly into your BOQ."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUploadDrawingModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#102F57] text-white hover:bg-[#0c2444] transition shadow-2xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#F7931E]" />
                <span>{t("drawings.uploadDrawing") || "Upload Drawing"}</span>
              </button>
            </div>

            {drawings.length === 0 ? (
              <div className="p-8 text-center bg-[#F3F6FA] border border-dashed border-[#DCE4EE] rounded-xl space-y-3">
                <Ruler className="w-10 h-10 text-[#64748B] mx-auto stroke-[1.5]" />
                <h4 className="text-xs font-bold text-[#102F57]">
                  {t("drawings.noDrawingsYet") || "No construction drawings uploaded yet."}
                </h4>
                <p className="text-[11px] text-[#64748B] max-w-md mx-auto leading-relaxed">
                  {t("drawings.noDrawingsDesc") || "Upload architectural blueprints or structural drawings (PDF or image) to calibrate scale and measure lengths, areas, and item counts directly into your BOQ."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowUploadDrawingModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] transition shadow-2xs font-devanagari"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("drawings.uploadDrawing") || "Upload Construction Drawing"}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drawings.map((dwg) => {
                  const hasScale = dwg.scale_calibrations && Object.keys(dwg.scale_calibrations).length > 0;
                  return (
                    <div
                      key={dwg.id}
                      className="p-4 bg-[#F8FAFC] border border-[#DCE4EE] rounded-xl flex flex-col justify-between space-y-3 hover:border-[#102F57]/40 transition shadow-2xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-[#102F57] truncate block" title={dwg.name}>
                            {dwg.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDrawing(dwg.id)}
                            className="text-[#64748B] hover:text-rose-600 p-1"
                            title="Delete Drawing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-[11px] text-[#64748B] font-mono truncate">
                          {dwg.file_name}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          {hasScale ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {t("drawings.calibrated") || "Scale Calibrated"}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {t("drawings.uncalibrated") || "Uncalibrated"}
                            </span>
                          )}

                          <span className="text-[10px] text-[#64748B] font-mono">
                            {dwg.pages_count || 1} {t("drawings.pages") || "Page(s)"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#DCE4EE] flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#263445]">
                          {dwg.measurement_count || 0} {t("drawings.measurements") || "measurements"}
                        </span>

                        <Link
                          href={`/projects/${project.id}/takeoff/${dwg.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] transition shadow-2xs"
                        >
                          <Ruler className="w-3.5 h-3.5" />
                          <span>{t("drawings.openTakeoff") || "Open Takeoff"}</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

              {/* Proceed to Step 3 Footer */}
              <div className="flex items-center justify-between pt-4 bg-white border border-[#DCE4EE] rounded-2xl p-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="btn-secondary px-3.5 py-2 text-xs font-semibold"
                >
                  ← Back to Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>Proceed to Step 3: Quotation & GST</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: QUOTATION & GST RECOMMENDATION                                    */}
      {/* ========================================================================= */}
      {activeStep === 3 && (
        <div className="space-y-6">
          {/* AI GST Policy Advisory Banner */}
          <div className="bg-white border border-[#DCE4EE] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE4EE] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#16835D]" />
                <h3 className="font-bold text-sm text-[#102F57] font-heading">
                  Statutory Tax Policy & AI-Assisted GST Recommendation
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Transparent Breakdown
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#F3F6FA] rounded-xl border border-[#DCE4EE]">
                <span className="text-[11px] font-bold text-[#102F57] block">Residential Works Contract</span>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                  Recommended: <strong>12% or 18% GST</strong> for standard composite construction. Pure residential labor contracts may be exempt.
                </p>
              </div>

              <div className="p-3 bg-[#F3F6FA] rounded-xl border border-[#DCE4EE]">
                <span className="text-[11px] font-bold text-[#102F57] block">Commercial / Infrastructure</span>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                  Recommended: <strong>18% GST</strong> for commercial structures, roads, bridges, and industrial industrial units.
                </p>
              </div>

              <div className="p-3 bg-[#F3F6FA] rounded-xl border border-[#DCE4EE]">
                <span className="text-[11px] font-bold text-[#102F57] block">Affordable Housing (PMAY)</span>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                  Concessional rate: <strong>5% GST without ITC</strong> for approved affordable housing schemes.
                </p>
              </div>
            </div>
          </div>

          {/* Quotations List */}
          {quotations.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#DCE4EE] rounded-2xl space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 bg-[#EEF3F9] text-[#102F57] rounded-full flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#102F57]">No Quotation Generated Yet</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Generate a professional quotation carrying forward all quantities and rates from your estimate with one click.
              </p>
              {estimates.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleGenerateQuotationFromEstimate(estimates[0])}
                  disabled={actionLoading}
                  className="btn-accent px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate from Estimate ({estimates[0].estimate_number})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span>Go to Step 2 to Create Estimate First</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quotations.map((q) => {
                  const isIssued = q.status === "issued" || q.status === "accepted";
                  const displayTotal = Number(q.total_amount ?? q.grand_total ?? 0) || (Number(q.taxable_amount || 0) + Number(q.tax_amount || 0));

                  return (
                    <div
                      key={q.id}
                      className="bg-white border border-[#DCE4EE] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-[#102F57] block">
                              {q.quotation_number}
                            </span>
                            <span className="text-xs text-[#64748B] block mt-0.5">
                              Issue Date: {q.issue_date || "Draft (Pending Issue)"}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border uppercase ${
                              q.status === "issued"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : q.status === "accepted"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {q.status}
                          </span>
                        </div>

                        {/* Financials grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="p-2.5 bg-[#F3F6FA] rounded-lg">
                            <span className="text-[11px] text-[#64748B] block">Taxable Subtotal</span>
                            <span className="font-semibold text-[#102F57] text-sm font-mono">
                              {formatIndianCurrency(q.taxable_amount || q.subtotal)}
                            </span>
                          </div>
                          <div className="p-2.5 bg-[#EEF3F9] rounded-lg border border-[#DCE4EE]">
                            <span className="text-[11px] text-[#102F57] font-semibold block">
                              Grand Total {q.tax_rate ? `(incl. ${q.tax_rate}% GST)` : ""}
                            </span>
                            <span className="font-bold text-[#102F57] text-base font-mono">
                              {formatIndianCurrency(displayTotal)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#64748B] pt-1">
                          <span>Ref: {q.estimate_number || "Project Estimate"}</span>
                          <span>•</span>
                          <span>Language: {q.language?.toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-[#DCE4EE] flex items-center justify-between gap-2">
                        <Link
                          href={`/quotations/${q.id}`}
                          className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Official Quotation</span>
                        </Link>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => api.downloadQuotationPdf(currentOrg!.id, q.id)}
                            className="p-1.5 rounded-lg border border-[#DCE4EE] text-[#102F57] hover:bg-[#F3F6FA]"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => api.exportQuotationExcel(currentOrg!.id, q.id)}
                            className="p-1.5 rounded-lg border border-[#DCE4EE] text-[#16835D] hover:bg-[#F3F6FA]"
                            title="Export Excel"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Proceed to Step 4 Footer */}
              <div className="flex items-center justify-between pt-4 bg-white border border-[#DCE4EE] rounded-2xl p-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="btn-secondary px-3.5 py-2 text-xs font-semibold"
                >
                  ← Back to Estimates
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>Proceed to Step 4: Invoices & Milestones</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: INVOICES & PAYMENT MILESTONES                                     */}
      {/* ========================================================================= */}
      {activeStep === 4 && (
        <div className="space-y-6">
          {/* Financial Progress & Collection Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-white border border-[#DCE4EE] rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B] block uppercase tracking-wider">
                Contract Value
              </span>
              <span className="text-lg font-bold font-mono text-[#102F57] mt-1 block">
                {formatIndianCurrency(totalContractValue)}
              </span>
              <span className="text-[10px] text-[#64748B]">Approved Quotation Value</span>
            </div>

            <div className="p-4 bg-white border border-[#DCE4EE] rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B] block uppercase tracking-wider">
                Total Billed
              </span>
              <span className="text-lg font-bold font-mono text-[#102F57] mt-1 block">
                {formatIndianCurrency(totalBilled)}
              </span>
              <span className="text-[10px] text-[#64748B]">{invoices.length} Milestone Invoices</span>
            </div>

            <div className="p-4 bg-white border border-[#DCE4EE] rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700 block uppercase tracking-wider">
                Total Collected
              </span>
              <span className="text-lg font-bold font-mono text-emerald-700 mt-1 block">
                {formatIndianCurrency(totalReceived)}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">{collectionPct}% of Project</span>
            </div>

            <div className="p-4 bg-white border border-[#DCE4EE] rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-[#B86B08] block uppercase tracking-wider">
                Balance Due
              </span>
              <span className="text-lg font-bold font-mono text-[#B86B08] mt-1 block">
                {formatIndianCurrency(totalOutstanding)}
              </span>
              <span className="text-[10px] text-[#64748B]">Pending Collections</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white border border-[#DCE4EE] rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#102F57]">
              <span>Payment Collection Progress</span>
              <span className="font-mono">{collectionPct}% Collected</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${Math.min(100, collectionPct)}%` }}
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Actions Bar */}
          <div className="bg-[#EEF3F9] border border-[#DCE4EE] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#102F57] font-heading flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#F7931E]" />
                <span>Milestone Billing Schedule</span>
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Issue progress claims across standard construction stages: Plinth, Slabs, Masonry, Finishing, and Handover.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {invoices.length === 0 && (
                <button
                  type="button"
                  onClick={handleGenerateStandardMilestones}
                  disabled={actionLoading}
                  className="btn-accent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Standard 5-Stage Schedule</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMilestoneAmount(Math.round((totalContractValue || 1000000) * 0.15));
                  setShowAddMilestoneModal(true);
                }}
                className="btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#F7931E]" />
                <span>Add Milestone</span>
              </button>
            </div>
          </div>

          {/* Milestones Table */}
          {invoices.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#DCE4EE] rounded-2xl space-y-3 max-w-md mx-auto">
              <Receipt className="w-10 h-10 text-[#64748B] mx-auto" />
              <h3 className="text-sm font-bold text-[#102F57]">No Invoices or Milestones Yet</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Click "Generate Standard 5-Stage Schedule" to auto-create standard civil milestones with calculated amounts, or add individual progress claims.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#DCE4EE] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#E8EEF5] text-[#102F57] uppercase font-semibold border-b border-[#DCE4EE]">
                    <tr>
                      <th className="px-4 py-3 w-32">Invoice #</th>
                      <th className="px-4 py-3">Milestone Stage</th>
                      <th className="px-4 py-3 text-right">Amount (₹)</th>
                      <th className="px-4 py-3 text-right">Paid (₹)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE4EE] text-[#263445]">
                    {invoices.map((inv) => {
                      const isPaid = inv.status === "paid";
                      const isPartial = inv.status === "partially_paid";
                      const amt = Number(inv.amount) || 0;
                      const paid = Number(inv.paid_amount) || 0;

                      return (
                        <tr key={inv.id} className="hover:bg-[#F3F6FA] transition">
                          <td className="px-4 py-3 font-mono font-bold text-[#102F57]">
                            {inv.invoice_number}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#102F57]">{inv.milestone_name}</div>
                            {inv.percentage > 0 && (
                              <div className="text-[11px] text-[#64748B]">{inv.percentage}% of project value</div>
                            )}
                            {inv.notes && (
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{inv.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#102F57]">
                            {formatIndianCurrency(amt)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                            {formatIndianCurrency(paid)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : isPartial
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#64748B]">
                            {inv.due_date || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isPaid ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowRecordPaymentModal(inv);
                                  setPaymentAmount(Math.max(0, amt - paid));
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md transition"
                              >
                                Record Payment
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-700 flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Paid</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* Edit Project Modal */}
      <Modal
        isOpen={showEditProjectModal}
        onClose={() => setShowEditProjectModal(false)}
        title="Edit Project Details"
      >
        <ProjectForm
          initialData={project}
          clients={allClients}
          onSubmit={async (data) => {
            if (!currentOrg?.id) return;
            setActionLoading(true);
            try {
              await api.updateProject(currentOrg.id, project.id, data);
              setShowEditProjectModal(false);
              await loadWorkspaceData();
            } finally {
              setActionLoading(false);
            }
          }}
          onCancel={() => setShowEditProjectModal(false)}
          loading={actionLoading}
        />
      </Modal>

      {/* Select Existing Client Modal */}
      <Modal
        isOpen={showAssignClientModal}
        onClose={() => setShowAssignClientModal(false)}
        title="Select Client for Project"
      >
        <div className="space-y-4 font-devanagari">
          <p className="text-xs text-[#64748B]">
            Choose a client from your client directory to link to this project and its quotations.
          </p>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#DCE4EE] border border-[#DCE4EE] rounded-xl">
            {allClients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleAssignClient(c.id)}
                className="w-full p-3 text-left hover:bg-[#F3F6FA] flex items-center justify-between transition"
              >
                <div>
                  <span className="font-bold text-xs text-[#102F57] block">{c.name}</span>
                  {c.phone && <span className="text-[11px] text-[#64748B]">{c.phone}</span>}
                </div>
                {project.client_id === c.id && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Current
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAssignClientModal(false);
                setShowCreateClientModal(true);
              }}
              className="text-xs font-semibold text-[#102F57] hover:underline flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#F7931E]" />
              <span>+ Add Brand New Client</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAssignClientModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Add New Client Inline Modal */}
      <Modal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        title="Create & Assign New Client"
      >
        <ClientForm
          onSubmit={handleCreateAndAssignClient}
          onCancel={() => setShowCreateClientModal(false)}
          loading={actionLoading}
        />
      </Modal>

      {/* Quick Civil Estimator Modal */}
      <Modal
        isOpen={showQuickEstimatorModal}
        onClose={() => setShowQuickEstimatorModal(false)}
        title="Quick Civil Material & Cost Calculator"
      >
        <div className="space-y-4 font-devanagari">
          <p className="text-xs text-[#64748B]">
            Enter your site dimensions to automatically calculate quantities and rates for Cement, Steel, Sand, Coarse Aggregate, Bricks, and Masonry Labour.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Built-up Footprint Area (sq.ft) *
              </label>
              <input
                type="number"
                min="100"
                step="50"
                value={quickCalcArea}
                onChange={(e) => setQuickCalcArea(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm font-mono text-[#263445] focus:ring-2 focus:ring-[#102F57]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Number of Floors (G + X)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={quickCalcFloors}
                onChange={(e) => setQuickCalcFloors(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm font-mono text-[#263445] focus:ring-2 focus:ring-[#102F57]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Construction Quality Benchmark
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["economy", "standard", "luxury"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setQuickCalcTier(tier)}
                  className={`p-2.5 rounded-xl border text-center text-xs font-semibold capitalize transition ${
                    quickCalcTier === tier
                      ? "bg-[#102F57] text-white border-[#102F57] shadow-xs"
                      : "bg-[#F3F6FA] text-[#263445] border-[#DCE4EE] hover:bg-[#EEF3F9]"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#EEF3F9] border border-[#DCE4EE] rounded-xl text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold text-[#102F57]">
              <span>Total Constructed Slab Area:</span>
              <span className="font-mono font-bold">{quickCalcArea * quickCalcFloors} sq.ft</span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Generates compliant line items with editable rates populated from regional pricing data.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE4EE]">
            <button
              type="button"
              onClick={() => setShowQuickEstimatorModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateQuickEstimate}
              disabled={actionLoading}
              className="btn-primary text-xs font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F7931E]" />
              <span>{actionLoading ? "Calculating..." : "Calculate & Generate BOQ"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Custom Milestone Modal */}
      <Modal
        isOpen={showAddMilestoneModal}
        onClose={() => setShowAddMilestoneModal(false)}
        title="Add Payment Milestone"
      >
        <form onSubmit={handleCreateMilestone} className="space-y-4 font-devanagari">
          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Milestone Name / Stage *
            </label>
            <input
              type="text"
              required
              value={milestoneName}
              onChange={(e) => setMilestoneName(e.target.value)}
              placeholder="e.g. 1st Floor Slab Casting Completion"
              className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm text-[#263445]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Milestone Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="1000"
                value={milestoneAmount}
                onChange={(e) => setMilestoneAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm font-mono text-[#263445]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Percentage of Project (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={milestonePct}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  setMilestonePct(p);
                  if (totalContractValue > 0) {
                    setMilestoneAmount(Math.round(totalContractValue * (p / 100)));
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm font-mono text-[#263445]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Expected Due Date
            </label>
            <input
              type="date"
              value={milestoneDueDate}
              onChange={(e) => setMilestoneDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm text-[#263445]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Notes / Technical Completion Criteria
            </label>
            <textarea
              rows={2}
              value={milestoneNotes}
              onChange={(e) => setMilestoneNotes(e.target.value)}
              placeholder="e.g. Subject to cube test 28-day compressive strength certificate."
              className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm text-[#263445]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE4EE]">
            <button
              type="button"
              onClick={() => setShowAddMilestoneModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn-primary text-xs">
              {actionLoading ? "Saving..." : "Add Milestone"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={Boolean(showRecordPaymentModal)}
        onClose={() => setShowRecordPaymentModal(null)}
        title={`Record Payment for ${showRecordPaymentModal?.milestone_name}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 font-devanagari">
          <div className="p-3 bg-[#EEF3F9] rounded-xl border border-[#DCE4EE] text-xs space-y-1">
            <div className="flex items-center justify-between text-[#102F57]">
              <span>Milestone Claim Amount:</span>
              <span className="font-mono font-bold">
                {formatIndianCurrency(showRecordPaymentModal?.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-emerald-800">
              <span>Previously Received:</span>
              <span className="font-mono font-semibold">
                {formatIndianCurrency(showRecordPaymentModal?.paid_amount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Payment Amount Received (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="500"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm font-mono text-[#263445]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm text-[#263445] bg-white"
              >
                <option value="NEFT">NEFT / RTGS Bank Transfer</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Cheque">Bank Cheque</option>
                <option value="Cash">Cash / Site Petty Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Payment Received Date
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm text-[#263445]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              UTR / Cheque Ref / Voucher #
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. UTR #HDFC000129381 or Cheque #091823"
              className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm text-[#263445]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE4EE]">
            <button
              type="button"
              onClick={() => setShowRecordPaymentModal(null)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn-primary text-xs">
              {actionLoading ? "Recording..." : "Save Payment"}
            </button>
          </div>
        </form>
      </Modal>
      {/* Upload Drawing Modal */}
      <Modal
        isOpen={showUploadDrawingModal}
        onClose={() => !uploadingDrawing && setShowUploadDrawingModal(false)}
        title={t("drawings.uploadDrawing") || "Upload Construction Drawing"}
      >
        <form onSubmit={handleUploadDrawingSubmit} className="space-y-4 font-devanagari text-xs">
          <p className="text-[#64748B] leading-relaxed">
            {t("drawings.uploadPrompt") || "Upload architectural plans or structural blueprints (PDF, PNG, JPG). Supported file size up to 50MB."}
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Drawing Name / Sheet Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ground Floor Architectural Plan Rev-2"
              value={uploadDrawingName}
              onChange={(e) => setUploadDrawingName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm text-[#263445] focus:ring-2 focus:ring-[#102F57]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
              Select Drawing File (PDF or Image) *
            </label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.dwg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploadFile(f);
                  if (!uploadDrawingName) {
                    setUploadDrawingName(f.name.replace(/\.[^/.]+$/, ""));
                  }
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-xs text-[#263445] bg-[#F3F6FA] file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#102F57] file:text-white hover:file:bg-[#0c2444]"
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              {t("drawings.supportedFormats") || "Supported: PDF, PNG, JPG, DWG (Max 50MB)"}
            </p>
          </div>

          {estimates.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Link to Initial Estimate (Optional)
              </label>
              <select
                value={uploadEstimateId}
                onChange={(e) => setUploadEstimateId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-xs text-[#263445] bg-white focus:ring-2 focus:ring-[#102F57]"
              >
                <option value="">None (Can link measurements later)</option>
                {estimates.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.estimate_number} — {est.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE4EE]">
            <button
              type="button"
              disabled={uploadingDrawing}
              onClick={() => setShowUploadDrawingModal(false)}
              className="btn-secondary px-4 py-2 text-xs font-semibold"
            >
              {t("common.cancel") || "Cancel"}
            </button>
            <button
              type="submit"
              disabled={uploadingDrawing || !uploadFile}
              className="btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              {uploadingDrawing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading & Processing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 text-[#F7931E]" />
                  <span>Upload Drawing</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
