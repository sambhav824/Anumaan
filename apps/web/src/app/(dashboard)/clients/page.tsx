"use client";

import React, { useEffect, useState } from "react";
import { Users, Plus, Search, Edit2, Phone, Mail, MapPin, FileText } from "lucide-react";
import { useTranslation } from "../../../context/I18nContext";
import { useOrg } from "../../../context/OrgContext";
import { api } from "../../../lib/api";
import { Modal } from "../../../components/Modal";
import { ClientForm, ClientFormData } from "../../../components/ClientForm";

export default function ClientsPage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();

  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadClients = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const res = await api.listClients(currentOrg.id, search.trim() || undefined);
      setClients(res);
    } catch (err) {
      console.error("Failed to load clients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [currentOrg?.id, search]);

  const handleCreate = async (data: ClientFormData) => {
    if (!currentOrg?.id) return;
    setActionLoading(true);
    try {
      await api.createClient(currentOrg.id, data);
      setShowCreateModal(false);
      await loadClients();
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (data: ClientFormData) => {
    if (!currentOrg?.id || !editingClient) return;
    setActionLoading(true);
    try {
      await api.updateClient(currentOrg.id, editingClient.id, data);
      setEditingClient(null);
      await loadClients();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE4EE]">
        <div>
          <h1 className="text-2xl font-bold text-[#102F57] font-heading">
            {t("clients.title")}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            {t("clients.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#102F57] text-white text-sm font-semibold hover:bg-[#0c2444] transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#F7931E]" />
          <span>{t("clients.createNew")}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#DCE4EE] shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[#DCE4EE] bg-[#F3F6FA] text-[#263445] focus:outline-none focus:ring-2 focus:ring-[#102F57] focus:bg-white"
          />
        </div>
      </div>

      {/* Clients Table / List */}
      <div className="bg-white rounded-xl border border-[#DCE4EE] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#64748B]">
            {t("common.loading")}
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EEF3F9] flex items-center justify-center text-[#102F57]">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[#102F57] font-heading">
              {search ? t("clients.emptySearch") : t("clients.emptyClientsTitle")}
            </h3>
            <p className="text-xs text-[#64748B] mt-1 mb-4">
              {t("clients.emptyClientsSubtitle")}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#102F57] text-white text-xs font-semibold hover:bg-[#0c2444] transition"
            >
              <Plus className="w-3.5 h-3.5 text-[#F7931E]" />
              <span>{t("clients.createNew")}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#DCE4EE] bg-[#E8EEF5] text-xs font-semibold uppercase tracking-wider text-[#102F57]">
                  <th className="px-6 py-3.5">{t("clients.nameLabel")}</th>
                  <th className="px-6 py-3.5">{t("clients.contactPersonLabel")}</th>
                  <th className="px-6 py-3.5">{t("clients.phoneLabel")} & {t("clients.emailLabel")}</th>
                  <th className="px-6 py-3.5">{t("clients.gstinLabel")}</th>
                  <th className="px-6 py-3.5 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE4EE]">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-[#F3F6FA] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#102F57]">
                        {client.name}
                      </div>
                      {client.billing_address && (
                        <div className="text-xs text-[#64748B] line-clamp-1 max-w-sm mt-0.5">
                          {client.billing_address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#263445]">
                      {client.contact_person || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs space-y-1">
                      {client.phone && (
                        <div className="flex items-center gap-1.5 text-[#263445]">
                          <Phone className="w-3 h-3 text-[#64748B]" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-[#64748B]">
                          <Mail className="w-3 h-3 text-[#64748B]" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {!client.phone && !client.email && <span className="text-[#64748B]">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-[#263445]">
                      {client.gstin ? (
                        <span className="px-2 py-0.5 rounded bg-[#EEF3F9] text-[#102F57] font-medium border border-[#DCE4EE]">
                          {client.gstin}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingClient(client)}
                        title={t("common.edit")}
                        className="p-1.5 rounded text-[#64748B] hover:text-[#102F57] hover:bg-[#EEF3F9] transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Client Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t("clients.createNew")}
        maxWidth="md"
      >
        <ClientForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          loading={actionLoading}
        />
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={Boolean(editingClient)}
        onClose={() => setEditingClient(null)}
        title={t("clients.editClient")}
        maxWidth="md"
      >
        {editingClient && (
          <ClientForm
            initialData={editingClient}
            onSubmit={handleUpdate}
            onCancel={() => setEditingClient(null)}
            loading={actionLoading}
          />
        )}
      </Modal>
    </div>
  );
}
