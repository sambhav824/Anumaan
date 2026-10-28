"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Plus,
  Building,
  User,
  CreditCard,
  Clock,
} from "lucide-react";
import { useTranslation } from "../../../context/I18nContext";
import { useOrg } from "../../../context/OrgContext";
import { api, Invoice } from "../../../lib/api";
import { Modal } from "../../../components/Modal";
import { formatIndianCurrency } from "../../../lib/calculations";

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [recordPaymentInvoice, setRecordPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("NEFT");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadInvoices = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.listInvoices(currentOrg.id, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setInvoices(data);
    } catch (err: any) {
      console.error("Failed to load invoices:", err);
      setErrorMsg(err.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [currentOrg?.id, statusFilter, search]);

  // Derived financial summary
  const summary = useMemo(() => {
    let billed = 0;
    let received = 0;
    let overdueCount = 0;
    const now = new Date().toISOString().split("T")[0];

    invoices.forEach((inv) => {
      const amt = Number(inv.amount) || 0;
      const paid = Number(inv.paid_amount) || 0;
      billed += amt;
      received += paid;
      if (inv.status !== "paid" && inv.due_date && inv.due_date < now) {
        overdueCount += 1;
      }
    });

    return {
      totalBilled: billed,
      totalReceived: received,
      totalOutstanding: Math.max(0, billed - received),
      overdueCount,
    };
  }, [invoices]);

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !recordPaymentInvoice) return;
    setSubmittingPayment(true);
    try {
      const inv = recordPaymentInvoice;
      const newPaid = Number(inv.paid_amount || 0) + Number(paymentAmount);
      await api.updateInvoice(currentOrg.id, inv.id, {
        paid_amount: newPaid,
        paid_date: paymentDate,
        payment_method: paymentMethod,
        notes: paymentNotes.trim()
          ? `${inv.notes ? inv.notes + "\n" : ""}Payment: ₹${paymentAmount} via ${paymentMethod} (${paymentDate}) - ${paymentNotes}`
          : inv.notes,
      });
      setRecordPaymentInvoice(null);
      setPaymentAmount(0);
      setPaymentNotes("");
      await loadInvoices();
      setSuccessMsg(`Payment of ${formatIndianCurrency(paymentAmount)} recorded successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record payment.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6 font-devanagari pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE4EE]">
        <div>
          <h1 className="text-2xl font-bold text-[#102F57] font-heading flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#F7931E]" />
            <span>Invoices & Milestone Payments</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Track progress billings, mobilization advances, site milestone collections, and payment statuses across all projects.
          </p>
        </div>

        <Link
          href="/projects"
          className="btn-primary self-start sm:self-auto px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
        >
          <Building className="w-3.5 h-3.5 text-[#F7931E]" />
          <span>Go to Project Workspaces</span>
        </Link>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-[#DCE4EE] rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block uppercase tracking-wider">
            Total Invoiced
          </span>
          <span className="text-xl font-bold font-mono text-[#102F57] mt-1 block">
            {formatIndianCurrency(summary.totalBilled)}
          </span>
          <span className="text-[10px] text-[#64748B]">{invoices.length} Invoices Across Projects</span>
        </div>

        <div className="p-4 bg-white border border-[#DCE4EE] rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 block uppercase tracking-wider">
            Total Received
          </span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
            {formatIndianCurrency(summary.totalReceived)}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">Realized Site Cashflow</span>
        </div>

        <div className="p-4 bg-white border border-[#DCE4EE] rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-[#B86B08] block uppercase tracking-wider">
            Outstanding Due
          </span>
          <span className="text-xl font-bold font-mono text-[#B86B08] mt-1 block">
            {formatIndianCurrency(summary.totalOutstanding)}
          </span>
          <span className="text-[10px] text-[#64748B]">Pending from Clients</span>
        </div>

        <div className="p-4 bg-white border border-[#DCE4EE] rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-red-600 block uppercase tracking-wider">
            Overdue Milestones
          </span>
          <span className="text-xl font-bold font-mono text-red-600 mt-1 block">
            {summary.overdueCount}
          </span>
          <span className="text-[10px] text-red-500">Past Payment Due Date</span>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white border border-[#DCE4EE] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, milestone, project or client..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DCE4EE] text-[#263445] placeholder:text-[#64748B] focus:ring-2 focus:ring-[#102F57]"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-[#64748B] shrink-0 mr-1" />
          {(["all", "draft", "sent", "paid", "partially_paid", "overdue"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-medium transition capitalize whitespace-nowrap ${
                statusFilter === st
                  ? "bg-[#102F57] text-white shadow-2xs font-semibold"
                  : "bg-[#F3F6FA] text-[#263445] border border-[#DCE4EE] hover:bg-[#EEF3F9]"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#DCE4EE]">
          <div className="animate-spin w-7 h-7 border-2 border-[#102F57] border-t-transparent rounded-full mx-auto mb-2" />
          <span>Loading invoices...</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-[#DCE4EE] max-w-md mx-auto p-8">
          <Receipt className="w-10 h-10 text-[#64748B] mx-auto" />
          <h3 className="text-sm font-bold text-[#102F57]">No Invoices Found</h3>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Invoices are created inside each project workspace under Step 4 (Invoices & Milestones) based on approved quotations.
          </p>
          <Link
            href="/projects"
            className="btn-primary inline-flex items-center gap-1.5 text-xs px-3.5 py-2 mt-2"
          >
            <span>Open Projects to Manage Billing</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-[#DCE4EE] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E8EEF5] text-[#102F57] uppercase font-semibold border-b border-[#DCE4EE]">
                <tr>
                  <th className="px-4 py-3 w-32">Invoice #</th>
                  <th className="px-4 py-3">Project & Client</th>
                  <th className="px-4 py-3">Milestone Stage</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3 text-right">Paid (₹)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE4EE] text-[#263445]">
                {invoices.map((inv) => {
                  const isPaid = inv.status === "paid";
                  const amt = Number(inv.amount) || 0;
                  const paid = Number(inv.paid_amount) || 0;

                  return (
                    <tr key={inv.id} className="hover:bg-[#F3F6FA] transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#102F57]">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${inv.project_id}?step=4`}
                          className="font-bold text-[#102F57] hover:underline block"
                        >
                          {inv.project_name || "Project"}
                        </Link>
                        {inv.client_name && (
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            Client: {inv.client_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#263445]">{inv.milestone_name}</div>
                        {inv.percentage > 0 && (
                          <div className="text-[10px] text-[#64748B]">{inv.percentage}% milestone claim</div>
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
                              : inv.status === "partially_paid"
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
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setRecordPaymentInvoice(inv);
                                setPaymentAmount(Math.max(0, amt - paid));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition"
                            >
                              Record Payment
                            </button>
                          )}
                          <Link
                            href={`/projects/${inv.project_id}?step=4`}
                            className="p-1.5 text-slate-400 hover:text-[#102F57] hover:bg-[#EEF3F9] rounded-lg transition"
                            title="Open project workspace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={Boolean(recordPaymentInvoice)}
        onClose={() => setRecordPaymentInvoice(null)}
        title={`Record Payment for ${recordPaymentInvoice?.milestone_name}`}
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 font-devanagari">
          <div className="p-3 bg-[#EEF3F9] rounded-xl border border-[#DCE4EE] text-xs space-y-1">
            <div className="flex items-center justify-between text-[#102F57]">
              <span>Milestone Claim:</span>
              <span className="font-mono font-bold">
                {formatIndianCurrency(recordPaymentInvoice?.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-emerald-800">
              <span>Previously Received:</span>
              <span className="font-mono font-semibold">
                {formatIndianCurrency(recordPaymentInvoice?.paid_amount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                Amount Received (₹) *
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
                Payment Mode
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
              Date Received
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
              UTR # / Reference Details
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. UTR #4928174 or Bank Voucher #8819"
              className="w-full px-3 py-2 rounded-lg border border-[#DCE4EE] text-sm text-[#263445]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE4EE]">
            <button
              type="button"
              onClick={() => setRecordPaymentInvoice(null)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={submittingPayment} className="btn-primary text-xs">
              {submittingPayment ? "Recording..." : "Save Payment"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

