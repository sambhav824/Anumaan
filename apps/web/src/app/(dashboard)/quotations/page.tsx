"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  Copy,
  ExternalLink,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "@/context/I18nContext";
import { useOrg } from "@/context/OrgContext";
import { api, Quotation } from "@/lib/api";

export default function QuotationsPage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();
  const router = useRouter();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    loadQuotations();
  }, [currentOrg, statusFilter]);

  const loadQuotations = async () => {
    if (!currentOrg) return;
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (search.trim()) filters.search = search.trim();

      const data = await api.listQuotations(currentOrg.id, filters);
      setQuotations(data);
    } catch (err: any) {
      console.error("Failed to load quotations:", err);
      setError(err.message || "Failed to load quotations.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuotations();
  };

  const handleDuplicate = async (quotationId: string) => {
    if (!currentOrg) return;
    try {
      setActionLoadingId(quotationId);
      const newDraft = await api.duplicateQuotation(currentOrg.id, quotationId);
      router.push(`/quotations/${newDraft.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to duplicate quotation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadPdf = async (q: Quotation) => {
    if (!currentOrg) return;
    try {
      setActionLoadingId(q.id);
      await api.downloadQuotationPdf(currentOrg.id, q.id, `${q.quotation_number}.pdf`);
    } catch (err: any) {
      alert(err.message || "Failed to download PDF.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExportExcel = async (q: Quotation) => {
    if (!currentOrg) return;
    try {
      setActionLoadingId(q.id);
      await api.exportQuotationExcel(currentOrg.id, q.id, `${q.quotation_number}.xlsx`);
    } catch (err: any) {
      alert(err.message || "Failed to export Excel.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            {t("quotations.statusDraft")}
          </span>
        );
      case "issued":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" />
            {t("quotations.statusIssued")}
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {t("quotations.statusAccepted")}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            {t("quotations.statusRejected")}
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
            <AlertCircle className="w-3 h-3" />
            {t("quotations.statusExpired")}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-devanagari text-anumaan-charcoal-900 tracking-tight">
            {t("quotations.title")}
          </h1>
          <p className="text-sm text-anumaan-charcoal-600 font-devanagari mt-1">
            {t("quotations.subtitle")}
          </p>
        </div>
        <Link
          href="/quotations/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-anumaan-gold-600 hover:bg-anumaan-gold-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-anumaan-gold-500 focus:outline-none"
        >
          <Plus className="w-4 h-4" />
          <span className="font-devanagari">{t("quotations.newQuotation")}</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-anumaan-border shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-anumaan-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("quotations.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-anumaan-border rounded-lg bg-anumaan-beige-50/40 text-anumaan-charcoal-900 focus:outline-none focus:ring-2 focus:ring-anumaan-gold-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {["all", "draft", "issued", "accepted", "rejected", "expired"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize whitespace-nowrap ${
                statusFilter === st
                  ? "bg-anumaan-charcoal-800 text-white shadow-sm"
                  : "bg-anumaan-beige-100 text-anumaan-charcoal-700 hover:bg-anumaan-beige-200"
              }`}
            >
              {st === "all" ? t("quotations.filterAll") : t(`quotations.status${st.charAt(0).toUpperCase() + st.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations List Table */}
      <div className="bg-white rounded-xl border border-anumaan-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-anumaan-charcoal-500">
            <div className="w-8 h-8 border-2 border-anumaan-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-devanagari">{t("quotations.loadingQuotations")}</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-600">
            <p className="text-sm">{error}</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-16 text-center">
            <FileSpreadsheet className="w-12 h-12 text-anumaan-charcoal-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-anumaan-charcoal-800 font-devanagari">
              {t("quotations.emptyList")}
            </h3>
            <p className="text-sm text-anumaan-charcoal-500 font-devanagari mt-1 max-w-sm mx-auto">
              {t("quotations.createFirst")}
            </p>
            <Link
              href="/quotations/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-anumaan-gold-600 text-white text-sm font-medium rounded-lg hover:bg-anumaan-gold-700"
            >
              <Plus className="w-4 h-4" />
              <span>{t("quotations.newQuotation")}</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-anumaan-beige-50/70 border-b border-anumaan-border text-xs text-anumaan-charcoal-600 font-semibold font-devanagari uppercase">
                <tr>
                  <th className="px-5 py-3.5">{t("quotations.quotationNumber")}</th>
                  <th className="px-5 py-3.5">{t("quotations.clientDetails")}</th>
                  <th className="px-5 py-3.5">{t("quotations.projectDetails")}</th>
                  <th className="px-5 py-3.5">{t("quotations.status")}</th>
                  <th className="px-5 py-3.5">{t("quotations.validUntil")}</th>
                  <th className="px-5 py-3.5 text-right">{t("quotations.grandTotal")}</th>
                  <th className="px-5 py-3.5 text-center">{t("quotations.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-anumaan-border-light">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-anumaan-beige-50/30 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-anumaan-charcoal-900">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="text-anumaan-gold-700 hover:text-anumaan-gold-800 hover:underline"
                      >
                        {q.quotation_number}
                      </Link>
                      <div className="text-[11px] text-anumaan-charcoal-400 font-sans font-normal uppercase">
                        {q.language}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-anumaan-charcoal-800 font-medium">
                      {q.client_name || "-"}
                    </td>
                    <td className="px-5 py-4 text-anumaan-charcoal-700">
                      {q.project_name || "-"}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {getStatusBadge(q.status)}
                      {!q.tax_configured && (
                        <span className="block text-[10px] text-amber-600 font-medium mt-0.5" title={t("quotations.taxNotConfigured")}>
                          {t("quotations.taxNotConfigured")}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-anumaan-charcoal-600 text-xs whitespace-nowrap">
                      {q.valid_until_date || "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-anumaan-charcoal-900 whitespace-nowrap">
                      ₹ {Number(q.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/quotations/${q.id}`}
                          title={t("quotations.preview")}
                          className="p-1.5 text-anumaan-charcoal-600 hover:text-anumaan-gold-700 hover:bg-anumaan-beige-100 rounded transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(q)}
                          disabled={actionLoadingId === q.id}
                          title={t("quotations.downloadPdf")}
                          className="p-1.5 text-anumaan-charcoal-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportExcel(q)}
                          disabled={actionLoadingId === q.id}
                          title={t("quotations.exportExcel")}
                          className="p-1.5 text-anumaan-charcoal-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(q.id)}
                          disabled={actionLoadingId === q.id}
                          title={t("quotations.duplicate")}
                          className="p-1.5 text-anumaan-charcoal-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
