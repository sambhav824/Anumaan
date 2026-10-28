"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Building,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  ShieldCheck,
  FileCheck,
  Percent,
  Calculator,
  Info,
} from "lucide-react";
import { useTranslation } from "@/context/I18nContext";
import { useOrg } from "@/context/OrgContext";
import { api, Estimate } from "@/lib/api";
import { formatIndianCurrency } from "@/lib/calculations";

export default function NewQuotationPage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEstimateId = searchParams.get("estimate_id");

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [estimateId, setEstimateId] = useState<string>(preselectedEstimateId || "");
  const [language, setLanguage] = useState<"en" | "mr" | "hi">("en");
  
  // Default valid until 30 days ahead
  const defaultValidDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  }, []);
  const [validUntilDate, setValidUntilDate] = useState<string>(defaultValidDate);

  // Signatory
  const [signatoryName, setSignatoryName] = useState<string>("");
  const [signatoryDesignation, setSignatoryDesignation] = useState<string>("");

  // Commercial Terms
  const [paymentTerms, setPaymentTerms] = useState<string>(
    "1. 30% mobilization advance upon work order.\n2. Running account bills based on completed measurements.\n3. 5% retention for defects liability period (6 months)."
  );
  const [exclusions, setExclusions] = useState<string>(
    "1. Water and three-phase power supply to be provided by client at site.\n2. Municipal / local authority permissions and statutory fees are excluded.\n3. Extra items will be charged per actual site measurements and agreed rate analysis."
  );
  const [notes, setNotes] = useState<string>(
    "1. Rates are valid until the specified validity date.\n2. Quantities are estimated; final billing will be on actual measurement as per IS 1200."
  );
  const [clientInstructions, setClientInstructions] = useState<string>("");

  // Tax Configuration
  const [taxConfigured, setTaxConfigured] = useState<boolean>(false);
  const [taxName, setTaxName] = useState<string>("GST");
  const [taxRate, setTaxRate] = useState<number>(18);

  useEffect(() => {
    async function loadData() {
      if (!currentOrg) return;
      try {
        setLoading(true);
        setError(null);
        const estData = await api.listEstimates(currentOrg.id);
        setEstimates(estData);
        if (preselectedEstimateId && estData.some((e: any) => e.id === preselectedEstimateId)) {
          setEstimateId(preselectedEstimateId);
        } else if (estData.length > 0 && !estimateId) {
          setEstimateId(estData[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load estimates");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentOrg, preselectedEstimateId]);

  const selectedEstimate = useMemo(() => {
    return estimates.find((e) => e.id === estimateId) || null;
  }, [estimates, estimateId]);

  // Projected totals based on selected estimate and tax toggle
  const financialSummary = useMemo(() => {
    if (!selectedEstimate) return null;
    const subtotal = Number(selectedEstimate.subtotal || 0);
    const overhead = Number(selectedEstimate.overhead_amount || 0);
    const contingency = Number(selectedEstimate.contingency_amount || 0);
    const taxable = Math.max(0, subtotal + overhead + contingency);
    
    let taxAmount = 0;
    if (taxConfigured && taxRate > 0) {
      taxAmount = (taxable * taxRate) / 100;
    }
    const grandTotal = taxable + taxAmount;

    return {
      subtotal,
      overhead,
      contingency,
      taxable,
      taxAmount,
      grandTotal,
    };
  }, [selectedEstimate, taxConfigured, taxRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    if (!estimateId) {
      setError("Please select an estimate");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        estimate_id: estimateId,
        language,
        valid_until_date: validUntilDate || null,
        payment_terms: paymentTerms.trim() || null,
        exclusions: exclusions.trim() || null,
        notes: notes.trim() || null,
        client_instructions: clientInstructions.trim() || null,
        authorized_signatory_name: signatoryName.trim() || null,
        authorized_signatory_designation: signatoryDesignation.trim() || null,
        tax_configured: taxConfigured,
        tax_name: taxConfigured ? (taxName.trim() || "GST") : "GST",
        tax_rate: taxConfigured ? Number(taxRate) : 0,
      };

      const result = await api.createQuotation(currentOrg.id, payload);
      router.push(`/quotations/${result.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create quotation");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/quotations"
            className="p-2 text-[#64748B] hover:text-[#102F57] hover:bg-[#EEF3F9] rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#102F57] font-heading">
              {t("quotations.new_quotation") || "New Quotation"}
            </h1>
            <p className="text-sm text-[#64748B]">
              {t("quotations.create_draft_desc") ||
                "Generate a draft quotation snapshot from an existing project estimate"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-[#C62828] text-sm flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-[#DCE4EE] p-12 text-center text-[#64748B]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#DCE4EE] border-t-[#102F57] mb-3"></div>
          <p>{t("common.loading") || "Loading..."}</p>
        </div>
      ) : estimates.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#DCE4EE] p-12 text-center">
          <FileText className="w-12 h-12 text-[#64748B]/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#102F57] mb-1 font-heading">
            {t("quotations.no_estimates_found") || "No estimates available"}
          </h3>
          <p className="text-sm text-[#64748B] max-w-md mx-auto mb-6">
            {t("quotations.no_estimates_desc") ||
              "A quotation is generated from an estimate and its itemized BOQ. Please create an estimate first."}
          </p>
          <Link
            href="/estimates"
            className="inline-flex items-center px-4 py-2 bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] font-semibold rounded-lg text-sm shadow-sm transition"
          >
            {t("estimates.create_estimate") || "Create Estimate"}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Select Estimate */}
          <div className="bg-white rounded-xl border border-[#DCE4EE] p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#DCE4EE] pb-3">
              <Calculator className="w-5 h-5 text-[#F7931E]" />
              <h2 className="text-base font-semibold text-[#102F57] font-heading">
                {t("quotations.select_source_estimate") || "1. Source Estimate & Project"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#263445] uppercase tracking-wider mb-1">
                  {t("quotations.estimate") || "Select Estimate *"}
                </label>
                <select
                  value={estimateId}
                  onChange={(e) => setEstimateId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                >
                  {estimates.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.estimate_number} — {est.name} ({est.status.toUpperCase()})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#64748B] mt-1">
                  {t("quotations.source_estimate_hint") ||
                    "The quotation will copy current BOQ line items and rates into a fresh draft."}
                </p>
              </div>

              {/* Estimate Details Card */}
              {selectedEstimate && (
                <div className="bg-[#F3F6FA] border border-[#DCE4EE] rounded-lg p-3 text-xs space-y-1.5 text-[#263445]">
                  <div className="flex justify-between font-medium text-[#102F57]">
                    <span>{t("quotations.estimate_label")} {selectedEstimate.estimate_number}</span>
                    <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-[#FFF6EB] text-[#B86B08] font-semibold">
                      {t(`estimates.status_${selectedEstimate.status}`) || selectedEstimate.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B]">{t("quotations.project_label")} </span>
                    <span className="font-medium text-[#263445]">{selectedEstimate.project_name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B]">{t("quotations.client_label")} </span>
                    <span className="font-medium text-[#263445]">{selectedEstimate.client_name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B]">{t("quotations.category_label")} </span>
                    <span className="capitalize text-[#263445]">{selectedEstimate.project_type ? (t(`projectType.${selectedEstimate.project_type}`) || selectedEstimate.project_type) : "General"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Document Settings & Language */}
          <div className="bg-white rounded-xl border border-[#DCE4EE] p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#DCE4EE] pb-3">
              <FileCheck className="w-5 h-5 text-[#F7931E]" />
              <h2 className="text-base font-semibold text-[#102F57] font-heading">
                {t("quotations.document_settings") || "2. Document Settings & Validity"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Language Selection */}
              <div>
                <label className="block text-xs font-medium text-[#263445] uppercase tracking-wider mb-1">
                  {t("quotations.language") || "Quotation Language"}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                >
                  <option value="en">English (EN)</option>
                  <option value="mr">मराठी (MR)</option>
                  <option value="hi">हिन्दी (HI)</option>
                </select>
                <p className="text-xs text-[#64748B] mt-1">
                  {t("quotations.language_hint") ||
                    "PDF and Excel exports will be generated in this language."}
                </p>
              </div>

              {/* Valid Until Date */}
              <div>
                <label className="block text-xs font-medium text-[#263445] uppercase tracking-wider mb-1">
                  {t("quotations.validity_date") || "Valid Until Date"}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                  />
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  {t("quotations.validity_hint") || "Standard validity is 30 days from proposal date."}
                </p>
              </div>

              {/* Signatory Name & Designation */}
              <div>
                <label className="block text-xs font-medium text-[#263445] uppercase tracking-wider mb-1">
                  {t("quotations.signatory_name") || "Authorized Signatory"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57] mb-2"
                />
                <input
                  type="text"
                  placeholder="e.g. Managing Director / Partner"
                  value={signatoryDesignation}
                  onChange={(e) => setSignatoryDesignation(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Transparent Tax Configuration */}
          <div className="bg-white rounded-xl border border-[#DCE4EE] p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#DCE4EE] pb-3">
              <Percent className="w-5 h-5 text-[#F7931E]" />
              <h2 className="text-base font-semibold text-[#102F57] font-heading">
                {t("quotations.tax_configuration") || "3. Tax Treatment & Statutory Disclosure"}
              </h2>
            </div>

            <div className="p-4 bg-[#FFF6EB] border border-[#F7931E]/30 rounded-lg text-xs text-[#263445] space-y-1.5">
              <div className="flex items-center space-x-2 font-medium text-[#102F57]">
                <Info className="w-4 h-4 text-[#F7931E] flex-shrink-0" />
                <span>{t("quotations.tax_transparency_title") || "Tax Transparency Policy"}</span>
              </div>
              <p className="text-[#64748B]">
                {t("quotations.tax_policy_desc") ||
                  "Anumaan never assumes a universal 18% or 0% GST rate. Tax must be explicitly confirmed by the contractor before issuing a legally compliant document. If unconfigured, the quotation clearly states 'Tax not configured'."}
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={taxConfigured}
                  onChange={(e) => setTaxConfigured(e.target.checked)}
                  className="w-4 h-4 accent-[#F7931E] rounded border-[#DCE4EE] focus:ring-[#F7931E]"
                />
                <span className="text-sm font-medium text-[#263445]">
                  {t("quotations.configure_tax_now") ||
                    "Apply specific tax calculation to this quotation"}
                </span>
              </label>

              {taxConfigured ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-[#263445] mb-1">
                      {t("quotations.tax_name") || "Tax Label (e.g. GST / CGST + SGST)"}
                    </label>
                    <input
                      type="text"
                      value={taxName}
                      onChange={(e) => setTaxName(e.target.value)}
                      placeholder="GST"
                      className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#263445] mb-1">
                      {t("quotations.tax_rate") || "Tax Rate (%)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#64748B] pl-7">
                  {t("quotations.tax_unconfigured_note") ||
                    "Status: 'Tax not configured' will be displayed. You can edit or verify tax details at any point before issuing."}
                </p>
              )}
            </div>
          </div>

          {/* Section 4: Commercial Terms & Notes */}
          <div className="bg-white rounded-xl border border-[#DCE4EE] p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#DCE4EE] pb-3">
              <ShieldCheck className="w-5 h-5 text-[#F7931E]" />
              <h2 className="text-base font-semibold text-[#102F57] font-heading">
                {t("quotations.terms_and_scope") || "4. Payment Terms, Exclusions & Notes"}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#263445] uppercase tracking-wider mb-1">
                  {t("quotations.payment_terms") || "Payment Terms"}
                </label>
                <textarea
                  rows={3}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#263445] uppercase tracking-wider mb-1">
                  {t("quotations.exclusions") || "Scope Exclusions"}
                </label>
                <textarea
                  rows={3}
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#263445] uppercase tracking-wider mb-1">
                    {t("quotations.notes") || "Notes & Assumptions"}
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#263445] uppercase tracking-wider mb-1">
                    {t("quotations.client_instructions") || "Special Client Instructions"}
                  </label>
                  <textarea
                    rows={2}
                    value={clientInstructions}
                    onChange={(e) => setClientInstructions(e.target.value)}
                    placeholder="Optional site or delivery notes..."
                    className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Projected Financial Summary */}
          {financialSummary && (
            <div className="bg-[#F3F6FA] border border-[#DCE4EE] rounded-xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#DCE4EE] pb-2">
                <h3 className="text-sm font-semibold text-[#102F57] font-heading">
                  {t("quotations.projected_summary") || "Projected Financial Summary"}
                </h3>
                <span className="text-xs text-[#64748B]">
                  {t("quotations.reconciles_with_estimate") || "Reconciles with source estimate BOQ"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
                <div>
                  <span className="text-[#64748B] block">{t("quotations.boq_subtotal")}</span>
                  <span className="font-semibold text-[#263445] text-sm">
                    {formatIndianCurrency(financialSummary.subtotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">{t("quotations.overheads_and_contingency")}</span>
                  <span className="font-semibold text-[#263445] text-sm">
                    {formatIndianCurrency(financialSummary.overhead + financialSummary.contingency)}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">
                    {taxConfigured ? `${taxName} (${taxRate}%)` : t("quotations.tax_status_label")}
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      taxConfigured ? "text-[#263445]" : "text-[#B86B08] italic"
                    }`}
                  >
                    {taxConfigured
                      ? formatIndianCurrency(financialSummary.taxAmount)
                      : t("quotations.taxNotConfigured")}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block font-semibold">{t("quotations.grand_total_label")}</span>
                  <span className="font-bold text-[#102F57] text-base">
                    {formatIndianCurrency(financialSummary.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#DCE4EE]">
            <Link
              href="/quotations"
              className="px-5 py-2.5 border border-[#DCE4EE] bg-white text-[#102F57] hover:bg-[#F3F6FA] rounded-lg text-sm font-medium transition"
            >
              {t("common.cancel") || "Cancel"}
            </Link>
            <button
              type="submit"
              disabled={submitting || !estimateId}
              className="px-6 py-2.5 bg-[#F7931E] hover:bg-[#e08215] disabled:opacity-50 text-[#102F57] font-semibold rounded-lg text-sm shadow-sm transition flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#102F57] border-t-transparent rounded-full animate-spin"></div>
                  <span>{t("quotations.generating") || "Generating Draft..."}</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>{t("quotations.create_draft") || "Create Draft Quotation"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
