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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-anumaan-border-light">
        <div>
          <h1 className="text-2xl font-bold text-anumaan-charcoal-900 font-devanagari">
            {t("clients.title")}
          </h1>
          <p className="text-sm text-anumaan-charcoal-500 font-devanagari mt-1">
            {t("clients.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-anumaan-charcoal-900 text-white text-sm font-semibold hover:bg-anumaan-charcoal-800 transition-colors shadow-xs font-devanagari self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-anumaan-gold-500" />
          <span>{t("clients.createNew")}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-anumaan-border shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-anumaan-charcoal-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
          />
        </div>
      </div>

      {/* Clients Table / List */}
      <div className="bg-white rounded-xl border border-anumaan-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-anumaan-charcoal-500 font-devanagari">
            {t("common.loading")}
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-anumaan-beige-100 flex items-center justify-center text-anumaan-charcoal-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-anumaan-charcoal-900 font-devanagari">
              {search ? t("clients.emptySearch") : t("clients.emptyClientsTitle")}
            </h3>
            <p className="text-xs text-anumaan-charcoal-500 font-devanagari mt-1 mb-4">
              {t("clients.emptyClientsSubtitle")}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-anumaan-charcoal-900 text-white text-xs font-semibold hover:bg-anumaan-charcoal-800 transition-colors font-devanagari"
            >
              <Plus className="w-3.5 h-3.5 text-anumaan-gold-500" />
              <span>{t("clients.createNew")}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-anumaan-border-light bg-anumaan-beige-50/50 text-xs font-semibold uppercase tracking-wider text-anumaan-charcoal-500 font-devanagari">
                  <th className="px-6 py-3.5">{t("clients.nameLabel")}</th>
                  <th className="px-6 py-3.5">{t("clients.contactPersonLabel")}</th>
                  <th className="px-6 py-3.5">{t("clients.phoneLabel")} & {t("clients.emailLabel")}</th>
                  <th className="px-6 py-3.5">{t("clients.gstinLabel")}</th>
                  <th className="px-6 py-3.5 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-anumaan-border-light">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-anumaan-beige-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-anumaan-charcoal-900 font-devanagari">
                        {client.name}
                      </div>
                      {client.billing_address && (
                        <div className="text-xs text-anumaan-charcoal-500 font-devanagari line-clamp-1 max-w-sm mt-0.5">
                          {client.billing_address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-anumaan-charcoal-700 font-devanagari">
                      {client.contact_person || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs space-y-1">
                      {client.phone && (
                        <div className="flex items-center gap-1.5 text-anumaan-charcoal-700">
                          <Phone className="w-3 h-3 text-anumaan-charcoal-400" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-anumaan-charcoal-600">
                          <Mail className="w-3 h-3 text-anumaan-charcoal-400" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {!client.phone && !client.email && <span className="text-anumaan-charcoal-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-anumaan-charcoal-700">
                      {client.gstin ? (
                        <span className="px-2 py-0.5 rounded bg-anumaan-beige-100 font-medium">
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
                        className="p-1.5 rounded text-anumaan-charcoal-500 hover:text-anumaan-gold-700 hover:bg-anumaan-gold-50 transition-colors"
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
