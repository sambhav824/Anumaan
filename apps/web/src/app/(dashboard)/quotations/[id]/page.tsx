"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Lock,
  Copy,
  Edit3,
  Save,
  Send,
  Building,
  User,
  Calendar,
  Percent,
  Printer,
  Sparkles,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "../../../../context/I18nContext";
import { useOrg } from "../../../../context/OrgContext";
import { api, QuotationDetail } from "../../../../lib/api";
import { Modal } from "../../../../components/Modal";
import { formatIndianCurrency } from "../../../../lib/calculations";

export default function QuotationDetailPage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id as string;

  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Draft Mode
  const [isEditing, setIsEditing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [editForm, setEditForm] = useState({
    language: "en",
    valid_until_date: "",
    payment_terms: "",
    exclusions: "",
    notes: "",
    client_instructions: "",
    authorized_signatory_name: "",
    authorized_signatory_designation: "",
    tax_configured: false,
    tax_name: "GST",
    tax_rate: 18,
  });

  // Issue Modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueTaxConfigured, setIssueTaxConfigured] = useState(false);
  const [issueTaxName, setIssueTaxName] = useState("GST");
  const [issueTaxRate, setIssueTaxRate] = useState(18);
  const [confirmTaxCheckbox, setConfirmTaxCheckbox] = useState(false);

  // Status Change Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("accepted");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Export Loading
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const loadQuotation = useCallback(async () => {
    if (!currentOrg || !quotationId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getQuotation(currentOrg.id, quotationId);
      setQuotation(data);

      // Populate edit form
      setEditForm({
        language: data.language || "en",
        valid_until_date: data.valid_until_date || "",
        payment_terms: data.payment_terms || "",
        exclusions: data.exclusions || "",
        notes: data.notes || "",
        client_instructions: data.client_instructions || "",
        authorized_signatory_name: data.authorized_signatory_name || "",
        authorized_signatory_designation: data.authorized_signatory_designation || "",
        tax_configured: Boolean(data.tax_configured),
        tax_name: data.tax_name || "GST",
        tax_rate: Number(data.tax_rate || 0),
      });

      setIssueTaxConfigured(Boolean(data.tax_configured));
      setIssueTaxName(data.tax_name || "GST");
      setIssueTaxRate(Number(data.tax_rate || 18));
      setConfirmTaxCheckbox(Boolean(data.tax_configured));
    } catch (err: any) {
      setError(err.message || "Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }, [currentOrg, quotationId]);

  useEffect(() => {
    loadQuotation();
  }, [loadQuotation]);

  // Handle Edit Save
  const handleSaveDraft = async () => {
    if (!currentOrg || !quotation) return;
    try {
      setSavingDraft(true);
      setError(null);
      const updated = await api.updateQuotation(currentOrg.id, quotation.id, {
        language: editForm.language,
        valid_until_date: editForm.valid_until_date || null,
        payment_terms: editForm.payment_terms || null,
        exclusions: editForm.exclusions || null,
        notes: editForm.notes || null,
        client_instructions: editForm.client_instructions || null,
        authorized_signatory_name: editForm.authorized_signatory_name || null,
        authorized_signatory_designation: editForm.authorized_signatory_designation || null,
        tax_configured: editForm.tax_configured,
        tax_name: editForm.tax_configured ? editForm.tax_name : "GST",
        tax_rate: editForm.tax_configured ? Number(editForm.tax_rate) : 0,
      });
      setQuotation(updated);
      setIsEditing(false);
      setSuccessMsg("Draft quotation updated successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save draft changes");
    } finally {
      setSavingDraft(false);
    }
  };

  // Handle Issue
  const handleIssueQuotation = async () => {
    if (!currentOrg || !quotation) return;
    try {
      setIssuing(true);
      setError(null);
      const payload: any = {
        confirm_tax: true,
      };
      if (issueTaxConfigured) {
        payload.tax_configured = true;
        payload.tax_name = issueTaxName;
        payload.tax_rate = Number(issueTaxRate);
      } else {
        payload.tax_configured = false;
        payload.tax_rate = 0;
      }

      const issued = await api.issueQuotation(currentOrg.id, quotation.id, payload);
      setQuotation(issued);
      setShowIssueModal(false);
      setSuccessMsg("Quotation issued successfully! Immutable snapshot created.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to issue quotation");
    } finally {
      setIssuing(false);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async () => {
    if (!currentOrg || !quotation) return;
    try {
      setUpdatingStatus(true);
      setError(null);
      const updated = await api.updateQuotationStatus(currentOrg.id, quotation.id, newStatus);
      setQuotation(updated);
      setShowStatusModal(false);
      setSuccessMsg(`Status updated to ${newStatus.toUpperCase()}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update quotation status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Duplicate
  const handleDuplicate = async () => {
    if (!currentOrg || !quotation) return;
    try {
      setDuplicating(true);
      setError(null);
      const copy = await api.duplicateQuotation(currentOrg.id, quotation.id);
      router.push(`/quotations/${copy.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to duplicate quotation");
      setDuplicating(false);
    }
  };

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    if (!currentOrg || !quotation) return;
    try {
      setDownloadingPdf(true);
      setError(null);
      await api.downloadQuotationPdf(
        currentOrg.id,
        quotation.id,
        `${quotation.quotation_number || "Quotation"}.pdf`
      );
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Handle Excel Export
  const handleExportExcel = async () => {
    if (!currentOrg || !quotation) return;
    try {
      setExportingExcel(true);
      setError(null);
      await api.exportQuotationExcel(
        currentOrg.id,
        quotation.id,
        `${quotation.quotation_number || "Quotation"}_BOQ.xlsx`
      );
    } catch (err: any) {
      setError(err.message || "Failed to export Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200">
            <Clock className="w-3 h-3 mr-1 text-stone-500" />
            {t("quotations.status_draft") || "DRAFT"}
          </span>
        );
      case "issued":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3 h-3 mr-1 text-blue-600" />
            {t("quotations.status_issued") || "ISSUED"}
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
            {t("quotations.status_accepted") || "ACCEPTED"}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
            {t("quotations.status_rejected") || "REJECTED"}
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
            {t("quotations.status_expired") || "EXPIRED"}
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-stone-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-300 border-t-amber-600 mb-3"></div>
        <p>{t("common.loading") || "Loading quotation..."}</p>
      </div>
    );
  }

  if (error && !quotation) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-base font-semibold text-red-900">{t("quotations.notFoundOrError")}</h2>
          <p className="text-sm text-red-700">{error}</p>
          <Link
            href="/quotations"
            className="inline-flex items-center px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-900 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("quotations.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  if (!quotation) return null;

  // Derive document display values from snapshot if issued, or live fields if draft
  const isSnapshot = quotation.status !== "draft" && quotation.snapshot;
  const company = isSnapshot ? quotation.snapshot?.company : currentOrg;
  const clientName = isSnapshot ? quotation.snapshot?.client?.name : quotation.client_name;
  const clientPhone = isSnapshot ? quotation.snapshot?.client?.phone : null;
  const clientEmail = isSnapshot ? quotation.snapshot?.client?.email : null;
  const clientAddress = isSnapshot ? quotation.snapshot?.client?.address : null;

  const projectName = isSnapshot ? quotation.snapshot?.project?.name : quotation.project_name;
  const projectAddress = isSnapshot ? quotation.snapshot?.project?.address : null;
  const projectType = isSnapshot ? quotation.snapshot?.project?.project_type : null;

  const boqItems: any[] = isSnapshot
    ? quotation.snapshot?.boq_items || []
    : quotation.items || [];

  const subtotal = Number(quotation.subtotal || 0);
  const overhead = Number(quotation.overhead_amount || 0);
  const contingency = Number(quotation.contingency_amount || 0);
  const discount = Number(quotation.discount_amount || 0);
  const taxableAmount = Number(quotation.taxable_amount || 0);
  const taxConfigured = Boolean(quotation.tax_configured);
  const taxRate = Number(quotation.tax_rate || 0);
  const taxAmount = Number(quotation.tax_amount || 0);
  const grandTotal = Number(quotation.grand_total || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Action Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Link
            href="/quotations"
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-stone-900">
                {quotation.quotation_number}
              </h1>
              {getStatusBadge(quotation.status)}
            </div>
            <p className="text-xs text-stone-500">
              {t("quotations.refEstimate")}:{" "}
              <Link
                href={`/estimates/${quotation.estimate_id}`}
                className="text-amber-700 hover:underline font-medium"
              >
                {quotation.estimate_number || quotation.estimate_id.slice(0, 8)}
              </Link>{" "}
              • Lang: <span className="uppercase font-semibold">{quotation.language}</span>
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          {quotation.status === "draft" ? (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3.5 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-medium transition flex items-center space-x-1.5"
              >
                <Edit3 className="w-4 h-4 text-stone-600" />
                <span>{isEditing ? t("quotations.closeEditor") : t("quotations.editDraft")}</span>
              </button>

              <button
                onClick={() => setShowIssueModal(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shadow-sm transition flex items-center space-x-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>{t("quotations.issue_quotation")}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm transition flex items-center space-x-1.5"
              >
                {downloadingPdf ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>PDF</span>
              </button>

              <button
                onClick={handleExportExcel}
                disabled={exportingExcel}
                className="px-3.5 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 rounded-lg text-sm font-medium transition flex items-center space-x-1.5"
              >
                {exportingExcel ? (
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                )}
                <span>Excel BOQ</span>
              </button>

              {quotation.status === "issued" && (
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="px-3.5 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-medium transition flex items-center space-x-1.5"
                >
                  <Clock className="w-4 h-4 text-stone-500" />
                  <span>{t("quotations.updateStatus")}</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            title="Duplicate as new draft quotation"
            className="p-2 border border-stone-300 text-stone-600 hover:bg-stone-50 rounded-lg transition"
          >
            {duplicating ? (
              <div className="w-4 h-4 border-2 border-stone-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Immutable Snapshot Notice */}
      {isSnapshot && (
        <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-stone-500 flex-shrink-0" />
            <span>
              <strong>Immutable Snapshot Active:</strong> This quotation was finalized on{" "}
              {quotation.issue_date || "date of issue"}. All contractor, client, BOQ rates, and
              totals are locked. Future edits to the estimate or database profiles will not alter
              this document or its PDF/Excel downloads.
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-stone-200 text-stone-800 rounded">
            FROZEN
          </span>
        </div>
      )}

      {/* Draft Edit Drawer */}
      {isEditing && quotation.status === "draft" && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <div className="flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-amber-700" />
              <h2 className="text-base font-semibold text-stone-900">{t("quotations.editDraft")}</h2>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs text-stone-500 hover:text-stone-800"
            >
              {t("common.cancel")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">{t("common.language")}</label>
              <select
                value={editForm.language}
                onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm"
              >
                <option value="en">English (EN)</option>
                <option value="mr">मराठी (MR)</option>
                <option value="hi">हिन्दी (HI)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t("quotations.validUntil")}
              </label>
              <input
                type="date"
                value={editForm.valid_until_date}
                onChange={(e) => setEditForm({ ...editForm, valid_until_date: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t("quotations.signatoryName")}
              </label>
              <input
                type="text"
                placeholder={t("quotations.signatoryName")}
                value={editForm.authorized_signatory_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, authorized_signatory_name: e.target.value })
                }
                className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm mb-1.5"
              />
              <input
                type="text"
                placeholder={t("quotations.signatoryDesignation")}
                value={editForm.authorized_signatory_designation}
                onChange={(e) =>
                  setEditForm({ ...editForm, authorized_signatory_designation: e.target.value })
                }
                className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Tax config */}
          <div className="pt-2 border-t border-amber-200/60">
            <label className="flex items-center space-x-2 text-sm font-medium text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.tax_configured}
                onChange={(e) => setEditForm({ ...editForm, tax_configured: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded border-stone-300"
              />
              <span>{t("quotations.taxConfigTitle")}</span>
            </label>
            {editForm.tax_configured && (
              <div className="grid grid-cols-2 gap-4 mt-2 max-w-md">
                <input
                  type="text"
                  placeholder={t("quotations.taxName")}
                  value={editForm.tax_name}
                  onChange={(e) => setEditForm({ ...editForm, tax_name: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder={t("quotations.taxRate")}
                  value={editForm.tax_rate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tax_rate: parseFloat(e.target.value) || 0 })
                  }
                  className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm"
                />
              </div>
            )}
          </div>

          {/* Terms textareas */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t("quotations.paymentTerms")}
              </label>
              <textarea
                rows={2}
                value={editForm.payment_terms}
                onChange={(e) => setEditForm({ ...editForm, payment_terms: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t("quotations.exclusions")}
              </label>
              <textarea
                rows={2}
                value={editForm.exclusions}
                onChange={(e) => setEditForm({ ...editForm, exclusions: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t("quotations.notes")}
              </label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center space-x-2"
            >
              {savingDraft ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{t("quotations.saveChanges")}</span>
            </button>
          </div>
        </div>
      )}

      {/* AUTHORITATIVE DOCUMENT VIEW (A4 Paper Aesthetic) */}
      <div className="bg-white border border-stone-300 rounded-2xl shadow-xl overflow-hidden p-8 md:p-12 space-y-8 font-sans text-stone-800">
        {/* Document Header */}
        <div className="border-b-2 border-amber-700/80 pb-6 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold tracking-tight text-stone-900">{t("brand.nameDevanagari")}</span>
              <span className="text-sm font-medium text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                {t("brand.name")}
              </span>
            </div>
            <p className="text-xs italic text-stone-500">“{t("brand.tagline")}”</p>

            <div className="pt-2 text-xs text-stone-600 space-y-0.5">
              <p className="font-semibold text-stone-900 text-sm">{company?.name || "Contractor"}</p>
              {company?.address && <p>{company.address}</p>}
              {(company?.city || company?.state) && (
                <p>
                  {[company.city, company.state, company.pincode].filter(Boolean).join(", ")}
                </p>
              )}
              {company?.phone && <p>Ph: {company.phone}</p>}
              {company?.email && <p>Email: {company.email}</p>}
              {company?.gstin && (
                <p className="font-mono text-stone-700 font-medium">GSTIN: {company.gstin}</p>
              )}
            </div>
          </div>

          <div className="md:text-right space-y-2">
            <span className="inline-block text-xs uppercase tracking-widest font-bold text-amber-800 bg-amber-100/60 px-3 py-1 rounded">
              {t("quotations.commercialQuotation")}
            </span>
            <div className="text-lg font-bold font-mono text-stone-900">
              {quotation.quotation_number}
            </div>
            <div className="text-xs space-y-1 text-stone-600">
              <p>
                <span className="text-stone-400">{t("common.date")}:</span>{" "}
                <span className="font-medium text-stone-800">
                  {quotation.issue_date || new Date().toISOString().split("T")[0]}
                </span>
              </p>
              <p>
                <span className="text-stone-400">{t("quotations.validUntil")}:</span>{" "}
                <span className="font-medium text-stone-800">
                  {quotation.valid_until_date || "30 days from date of issue"}
                </span>
              </p>
              <p>
                <span className="text-stone-400">{t("common.status")}:</span>{" "}
                <span className="font-semibold uppercase text-stone-800">
                  {t(`quotations.status_${quotation.status}`) || quotation.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Client & Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50/70 border border-stone-200/80 rounded-xl p-5 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px] block text-amber-800 mb-1">
              {t("quotations.clientDetails")}
            </span>
            <p className="font-semibold text-stone-800 text-sm">{clientName || "—"}</p>
            {clientPhone && <p className="text-stone-600">{t("clients.phoneLabel")}: {clientPhone}</p>}
            {clientEmail && <p className="text-stone-600">{t("clients.emailLabel")}: {clientEmail}</p>}
            {clientAddress && <p className="text-stone-600">{clientAddress}</p>}
          </div>

          <div className="space-y-1">
            <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px] block text-amber-800 mb-1">
              {t("quotations.projectDetails")}
            </span>
            <p className="font-semibold text-stone-800 text-sm">{projectName || "—"}</p>
            {projectType && <p className="text-stone-600 capitalize">{t("common.type")}: {t(`projectType.${projectType}`) || projectType}</p>}
            {projectAddress && <p className="text-stone-600">{t("projects.locationLabel")}: {projectAddress}</p>}
            <p className="text-stone-500 pt-1">
              {t("quotations.refEstimate")}: <span className="font-mono text-stone-800">{quotation.estimate_number || "—"}</span>
            </p>
          </div>
        </div>

        {/* Itemized BOQ Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              {t("quotations.itemizedBOQ")}
            </h3>
            <span className="text-xs text-stone-500 font-mono">
              {boqItems.length} {t("estimates.items_count")}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-stone-200">
              <thead className="bg-stone-100 text-stone-700 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">{t("estimates.item_number")}</th>
                  <th className="px-3 py-2.5">{t("estimates.description")}</th>
                  <th className="px-3 py-2.5 w-24 text-right">{t("estimates.quantity")}</th>
                  <th className="px-3 py-2.5 w-16 text-center">{t("estimates.unit")}</th>
                  <th className="px-3 py-2.5 w-28 text-right">{t("estimates.unit_rate")}</th>
                  <th className="px-3 py-2.5 w-32 text-right">{t("estimates.amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                {boqItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-400 italic">
                      {t("estimates.empty_boq_notice")}
                    </td>
                  </tr>
                ) : (
                  boqItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-amber-50/20">
                      <td className="px-3 py-2.5 text-center font-mono text-stone-500">
                        {item.item_number || idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-stone-900">{item.description}</div>
                        {item.specification && (
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {item.specification}
                          </div>
                        )}
                        {item.formula && (
                          <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                            {t("estimates.formula_breakdown_heading")}: {item.formula}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium">
                        {Number(item.quantity).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-stone-600 font-medium">
                        {item.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {formatIndianCurrency(Number(item.unit_rate))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-stone-900">
                        {formatIndianCurrency(Number(item.total_amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Transparent Tax Breakdown */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 pt-2">
          {/* Transparent Tax Policy Badge */}
          <div className="max-w-md text-xs space-y-2 text-stone-600">
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg">
              <div className="flex items-center space-x-1.5 font-semibold text-amber-900 mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>{t("quotations.taxTransparencyHeading")}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {taxConfigured
                  ? t("quotations.taxConfiguredExplanation", { rate: taxRate, name: quotation.tax_name || "GST" })
                  : t("quotations.taxNotConfiguredExplanation")}
              </p>
            </div>
            {quotation.client_instructions && (
              <div className="p-2.5 bg-stone-50 rounded border border-stone-200 text-[11px]">
                <span className="font-semibold text-stone-700 block">{t("quotations.clientInstructionsLabel")}</span>
                <span className="italic">{quotation.client_instructions}</span>
              </div>
            )}
          </div>

          {/* Totals Table */}
          <div className="w-full md:w-80 space-y-2 text-xs border border-stone-200 rounded-xl p-4 bg-stone-50/50">
            <div className="flex justify-between text-stone-600">
              <span>{t("quotations.boqSubtotal")}</span>
              <span className="font-mono font-medium">{formatIndianCurrency(subtotal)}</span>
            </div>
            {overhead > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>{t("quotations.overhead")}:</span>
                <span className="font-mono font-medium">{formatIndianCurrency(overhead)}</span>
              </div>
            )}
            {contingency > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>{t("quotations.contingency")}:</span>
                <span className="font-mono font-medium">{formatIndianCurrency(contingency)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>{t("quotations.discount")}:</span>
                <span className="font-mono font-medium text-emerald-700">
                  - {formatIndianCurrency(discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-stone-800 font-semibold border-t border-stone-200 pt-1.5">
              <span>{t("quotations.taxableAmount")}:</span>
              <span className="font-mono">{formatIndianCurrency(taxableAmount)}</span>
            </div>

            {/* Transparent Tax Row */}
            <div className="flex justify-between items-center py-1 border-t border-dashed border-stone-300">
              <span className="text-stone-600">
                {taxConfigured ? `${quotation.tax_name || "GST"} (${taxRate}%):` : t("quotations.taxStatus")}
              </span>
              <span
                className={`font-mono ${
                  taxConfigured ? "font-medium text-stone-900" : "text-amber-800 italic font-semibold"
                }`}
              >
                {taxConfigured ? formatIndianCurrency(taxAmount) : t("quotations.taxNotConfiguredZero")}
              </span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between text-stone-900 font-bold text-sm border-t-2 border-stone-800 pt-2 text-amber-800">
              <span>{t("quotations.grandTotal")}:</span>
              <span className="font-mono text-base">{formatIndianCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Terms, Scope & Signatures */}
        <div className="space-y-6 pt-4 border-t border-stone-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {quotation.payment_terms && (
              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-stone-900 block text-amber-800">
                  {t("quotations.paymentTerms")}
                </span>
                <div className="text-stone-600 whitespace-pre-line leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200/70">
                  {quotation.payment_terms}
                </div>
              </div>
            )}

            {quotation.exclusions && (
              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-stone-900 block text-amber-800">
                  {t("quotations.exclusions")}
                </span>
                <div className="text-stone-600 whitespace-pre-line leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200/70">
                  {quotation.exclusions}
                </div>
              </div>
            )}

            {quotation.notes && (
              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-stone-900 block text-amber-800">
                  {t("quotations.notes")}
                </span>
                <div className="text-stone-600 whitespace-pre-line leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200/70">
                  {quotation.notes}
                </div>
              </div>
            )}
          </div>

          {/* Signature and Stamp Blocks */}
          <div className="pt-8 flex flex-col md:flex-row justify-between items-end gap-8 text-xs text-stone-600">
            {/* Acceptance Signature */}
            <div className="w-full md:w-64 border-t border-stone-400 pt-2 space-y-1">
              <p className="font-semibold text-stone-800">{t("quotations.clientAcceptanceSign")}</p>
              <p className="text-stone-400">{t("quotations.nameAndDesignation")}</p>
              <p className="text-stone-400">{t("common.date")}:</p>
            </div>

            {/* Contractor Signatory & Stamp */}
            <div className="w-full md:w-72 border-t border-stone-800 pt-2 text-right space-y-1">
              <p className="font-semibold text-stone-900">
                {t("quotations.forCompany", { company: company?.name || "Contractor" })}
              </p>
              {quotation.authorized_signatory_name && (
                <p className="font-medium text-stone-800">
                  {quotation.authorized_signatory_name}
                </p>
              )}
              {quotation.authorized_signatory_designation && (
                <p className="text-stone-500">
                  {quotation.authorized_signatory_designation}
                </p>
              )}
              <div className="pt-4 inline-block w-28 h-16 border border-dashed border-stone-300 rounded text-center text-[10px] text-stone-400 leading-[4rem]">
                {t("quotations.companySeal")}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-stone-400 pt-6 border-t border-stone-100">
            {t("quotations.generatedWithAnumaan", { brand: t("brand.name"), ref: quotation.quotation_number })}
          </div>
        </div>
      </div>

      {/* ISSUE QUOTATION MODAL */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => !issuing && setShowIssueModal(false)}
        title={t("quotations.finalizeAndIssue")}
      >
        <div className="space-y-4 text-sm text-stone-700">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 font-semibold text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>{t("quotations.immutableSnapshotNotice")}</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              {t("quotations.immutableSnapshotDesc")}
            </p>
          </div>

          {/* Tax Confirmation in Modal */}
          <div className="border border-stone-200 rounded-xl p-4 space-y-3 bg-stone-50">
            <h4 className="font-semibold text-stone-900 text-xs uppercase tracking-wider">
              {t("quotations.statutoryTaxConfirmation")}
            </h4>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={issueTaxConfigured}
                onChange={(e) => setIssueTaxConfigured(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
              />
              <span className="font-medium text-stone-800">{t("quotations.applyTaxCheckbox")}</span>
            </label>

            {issueTaxConfigured ? (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                    {t("quotations.taxName")}
                  </label>
                  <input
                    type="text"
                    value={issueTaxName}
                    onChange={(e) => setIssueTaxName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                    {t("quotations.taxRate")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={issueTaxRate}
                    onChange={(e) => setIssueTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded text-xs"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-800 pl-6 italic">
                {t("quotations.taxNotConfiguredWarning")}
              </p>
            )}

            <label className="flex items-start space-x-2.5 cursor-pointer pt-2 border-t border-stone-200">
              <input
                type="checkbox"
                checked={confirmTaxCheckbox}
                onChange={(e) => setConfirmTaxCheckbox(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500 mt-0.5"
              />
              <span className="text-xs text-stone-700">
                {t("quotations.taxObligationVerify")}
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setShowIssueModal(false)}
              disabled={issuing}
              className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-sm"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleIssueQuotation}
              disabled={issuing || !confirmTaxCheckbox}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center space-x-2"
            >
              {issuing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t("quotations.issuing")}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{t("quotations.confirmTax")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* UPDATE STATUS MODAL */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => !updatingStatus && setShowStatusModal(false)}
        title={t("quotations.updateStatusModalTitle")}
      >
        <div className="space-y-4 text-sm text-stone-700">
          <p className="text-xs text-stone-500">
            {t("quotations.updateStatusModalDesc")}
          </p>

          <div className="space-y-2">
            {[
              { id: "accepted", label: t("quotations.statusAcceptedLabel") },
              { id: "rejected", label: t("quotations.statusRejectedLabel") },
              { id: "expired", label: t("quotations.statusExpiredLabel") },
            ].map((opt) => (
              <label
                key={opt.id}
                className="flex items-center space-x-3 p-3 border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-50"
              >
                <input
                  type="radio"
                  name="quotationStatus"
                  value={opt.id}
                  checked={newStatus === opt.id}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-medium text-stone-800">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setShowStatusModal(false)}
              disabled={updatingStatus}
              className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-sm"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleUpdateStatus}
              disabled={updatingStatus}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center space-x-2"
            >
              {updatingStatus ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>{t("quotations.updateStatus")}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
