"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  UserPlus,
  Plus,
  Building,
  Check,
} from "lucide-react";
import { api, ReverseGeocodeResult } from "../lib/api";
import { useTranslation } from "../context/I18nContext";
import { useSafeOrg } from "../context/OrgContext";
import { Modal } from "./Modal";
import { ClientForm, ClientFormData } from "./ClientForm";

export interface ProjectFormData {
  name: string;
  project_type: "building" | "road";
  client_id?: string;
  site_location?: string;
  city?: string;
  state?: string;
  description?: string;
  start_date?: string;
  status: "planning" | "in_progress" | "completed" | "archived";
  quotation_language: "en" | "mr" | "hi";
}

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  clients: { id: string; name: string }[];
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  onClientCreated?: (newClient: { id: string; name: string }) => void;
}

export function ProjectForm({
  initialData,
  clients: initialClients,
  onSubmit,
  onCancel,
  loading = false,
  onClientCreated,
}: ProjectFormProps) {
  const { t } = useTranslation();
  const orgCtx = useSafeOrg();
  const currentOrg = orgCtx?.currentOrg;

  const [localClients, setLocalClients] = useState<{ id: string; name: string }[]>(initialClients);

  useEffect(() => {
    setLocalClients(initialClients);
  }, [initialClients]);

  const [formData, setFormData] = useState<ProjectFormData>({
    name: initialData?.name || "",
    project_type: initialData?.project_type || "building",
    client_id: initialData?.client_id || "",
    site_location: initialData?.site_location || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    description: initialData?.description || "",
    start_date: initialData?.start_date || "",
    status: initialData?.status || "planning",
    quotation_language: initialData?.quotation_language || "en",
  });

  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationDetected, setLocationDetected] = useState<ReverseGeocodeResult | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  // Inline Client Creation State
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientCreating, setClientCreating] = useState(false);
  const [clientSuccessMsg, setClientSuccessMsg] = useState<string | null>(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice("Geolocation is not supported by your browser. Please enter location manually.");
      return;
    }
    setLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setLocationDetected(res);
          setLocationConfirmed(false);
          // Pre-fill location fields
          setFormData((prev) => ({
            ...prev,
            site_location: prev.site_location || res.display_name,
            city: res.city || prev.city,
            state: res.state || prev.state,
          }));
        } catch (err: any) {
          setLocationNotice("Could not resolve location address. Please enter location manually.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationNotice("Location permission was denied. You can manually enter city and state below.");
        } else {
          setLocationNotice("Unable to detect device location. Please enter your project site manually.");
        }
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInlineClientSubmit = async (clientData: ClientFormData) => {
    if (!currentOrg?.id) return;
    setClientCreating(true);
    setError(null);
    try {
      const created = await api.createClient(currentOrg.id, clientData);
      const newEntry = { id: created.id, name: created.name };
      setLocalClients((prev) => [newEntry, ...prev]);
      setFormData((prev) => ({ ...prev, client_id: created.id }));
      if (onClientCreated) {
        onClientCreated(newEntry);
      }
      setShowAddClientModal(false);
      setClientSuccessMsg(`Client "${created.name}" created and linked to this project.`);
      setTimeout(() => setClientSuccessMsg(null), 4000);
    } catch (err: any) {
      throw err;
    } finally {
      setClientCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError("Project name is required.");
      return;
    }
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "Failed to save project.");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {clientSuccessMsg && (
          <div className="p-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{clientSuccessMsg}</span>
          </div>
        )}

        {/* Project Name */}
        <div>
          <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.nameLabel")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={t("projects.namePlaceholder")}
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari"
          />
        </div>

        {/* Project Type & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1 font-devanagari">
              {t("projects.typeLabel")}
            </label>
            <select
              name="project_type"
              value={formData.project_type}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari bg-white"
            >
              <option value="building">{t("projectType.building")}</option>
              <option value="road">{t("projectType.road")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1 font-devanagari">
              {t("projects.statusLabel")}
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari bg-white"
            >
              <option value="planning">{t("status.planning")}</option>
              <option value="in_progress">{t("status.in_progress")}</option>
              <option value="completed">{t("status.completed")}</option>
              <option value="archived">{t("status.archived")}</option>
            </select>
          </div>
        </div>

        {/* Client Selection with Inline "+ Add New Client" */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider font-devanagari">
                {t("projects.clientLabel")}{" "}
                <span className="text-[11px] font-normal text-[#64748B] lowercase">
                  ({t("common.optional") || "optional"})
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddClientModal(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#102F57] hover:text-[#0B213E] hover:underline"
              >
                <Plus className="w-3 h-3 text-[#F7931E]" />
                <span>{t("clients.addClientInline") || "+ Add New Client"}</span>
              </button>
            </div>
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari bg-white"
            >
              <option value="">-- {t("projects.noClientYet") || "No client yet (can add later)"} --</option>
              {localClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1 font-devanagari">
              {t("projects.quotationLangLabel")}
            </label>
            <select
              name="quotation_language"
              value={formData.quotation_language}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari bg-white"
            >
              <option value="en">English (Official BOQ)</option>
              <option value="mr">मराठी (दरपत्रक)</option>
              <option value="hi">हिन्दी (कोटेशन)</option>
            </select>
          </div>
        </div>

        {/* Location Detection & Confirmation (Site Location) */}
        <div className="p-3.5 bg-[#F3F6FA] border border-[#DCE4EE] rounded-xl space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-[#102F57] block font-heading">
                {t("projects.locationHeader") || "Construction Site Location & Regional Pricing"}
              </span>
              <span className="text-[11px] text-[#64748B]">
                {t("projects.locationSubtext") ||
                  "The confirmed construction site location determines regional PWD/CPWD material rates."}
              </span>
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#102F57]/30 text-[#102F57] hover:bg-[#EEF3F9] transition active:scale-95 shrink-0 shadow-2xs"
            >
              {locating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F7931E]" />
                  <span>{t("projects.locating") || "Detecting Location..."}</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-[#F7931E]" />
                  <span>{t("projects.useCurrentLocation") || "Use My Current Location"}</span>
                </>
              )}
            </button>
          </div>

          {locationNotice && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{locationNotice}</span>
            </div>
          )}

          {locationDetected && (
            <div className="p-3 bg-white border border-[#DCE4EE] rounded-lg space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-[#102F57] block">
                    {t("projects.detectedAddress") || "Detected Site Address:"}
                  </span>
                  <span className="text-[#64748B] text-[11px] block mt-0.5">
                    {locationDetected.display_name}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-[#263445]">
                    {locationDetected.city && (
                      <span className="px-2 py-0.5 bg-[#EEF3F9] rounded border border-[#DCE4EE]">
                        City: <strong>{locationDetected.city}</strong>
                      </span>
                    )}
                    {locationDetected.district && (
                      <span className="px-2 py-0.5 bg-[#EEF3F9] rounded border border-[#DCE4EE]">
                        District: <strong>{locationDetected.district}</strong>
                      </span>
                    )}
                    {locationDetected.state && (
                      <span className="px-2 py-0.5 bg-[#EEF3F9] rounded border border-[#DCE4EE]">
                        State: <strong>{locationDetected.state}</strong>
                      </span>
                    )}
                    {locationDetected.pincode && (
                      <span className="px-2 py-0.5 bg-[#EEF3F9] rounded border border-[#DCE4EE]">
                        PIN: <strong>{locationDetected.pincode}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {!locationConfirmed ? (
                  <button
                    type="button"
                    onClick={() => setLocationConfirmed(true)}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#102F57] text-white rounded-md hover:bg-[#0c2444] shrink-0"
                  >
                    {t("projects.confirmSiteLocation") || "Confirm Site Location"}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t("projects.confirmed") || "Confirmed"}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Site Address / Landmark Input */}
          <div>
            <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1 font-devanagari">
              {t("projects.siteLocationLabel") || "Site Address / Plot # / Landmark"}
            </label>
            <input
              type="text"
              name="site_location"
              value={formData.site_location}
              onChange={handleChange}
              placeholder={t("projects.siteLocationPlaceholder") || "e.g., Plot 42, Sector 18, MIDC Industrial Area"}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari bg-white"
            />
          </div>

          {/* City & State Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1 font-devanagari">
                {t("projects.cityLabel") || "City / District"}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Pune, Mumbai, Nagpur"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1 font-devanagari">
                {t("projects.stateLabel") || "State"}
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Maharashtra, Karnataka"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari bg-white"
              />
            </div>
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.startDateLabel")}
          </label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.descriptionLabel")}
          </label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            placeholder={t("projects.descriptionPlaceholder")}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE4EE]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary font-devanagari"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary font-devanagari"
          >
            {loading ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>

      {/* Inline Add Client Modal */}
      <Modal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        title={t("clients.createTitle") || "Add New Client"}
      >
        <ClientForm
          onSubmit={handleInlineClientSubmit}
          onCancel={() => setShowAddClientModal(false)}
          loading={clientCreating}
        />
      </Modal>
    </>
  );
}
