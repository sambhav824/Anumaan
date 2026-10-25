"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Users,
  Calculator,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Building,
  Car,
} from "lucide-react";
import { useTranslation } from "../../../context/I18nContext";
import { useOrg } from "../../../context/OrgContext";
import { api } from "../../../lib/api";
import { Modal } from "../../../components/Modal";
import { ProjectForm, ProjectFormData } from "../../../components/ProjectForm";
import { ClientForm, ClientFormData } from "../../../components/ClientForm";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();

  const [metrics, setMetrics] = useState({
    total_projects: 0,
    active_projects: 0,
    draft_estimates: 0,
    pending_quotations: 0,
    accepted_quotations: 0,
    total_clients: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Action Modals
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const loadDashboardData = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const [metricsData, projectsData, clientsData] = await Promise.all([
        api.getDashboardMetrics(currentOrg.id).catch(() => ({
          total_projects: 0,
          active_projects: 0,
          draft_estimates: 0,
          pending_quotations: 0,
          accepted_quotations: 0,
          total_clients: 0,
        })),
        api.listProjects(currentOrg.id, { limit: 5 }).catch(() => []),
        api.listClients(currentOrg.id).catch(() => []),
      ]);

      setMetrics(metricsData);
      setRecentProjects(projectsData);
      setClients(clientsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentOrg?.id]);

  const handleCreateProject = async (data: ProjectFormData) => {
    if (!currentOrg?.id) return;
    setModalLoading(true);
    try {
      await api.createProject(currentOrg.id, data);
      setShowCreateProjectModal(false);
      await loadDashboardData();
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddClient = async (data: ClientFormData) => {
    if (!currentOrg?.id) return;
    setModalLoading(true);
    try {
      await api.createClient(currentOrg.id, data);
      setShowAddClientModal(false);
      await loadDashboardData();
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-anumaan-border-light">
        <div>
          <h1 className="text-2xl font-bold text-anumaan-charcoal-900 font-devanagari">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-anumaan-charcoal-500 font-devanagari mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddClientModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-anumaan-border bg-white text-anumaan-charcoal-800 text-sm font-medium hover:bg-anumaan-beige-50 transition-colors font-devanagari"
          >
            <Plus className="w-4 h-4 text-anumaan-gold-600" />
            <span>{t("dashboard.addClientQuick")}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateProjectModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-anumaan-charcoal-900 text-white text-sm font-medium hover:bg-anumaan-charcoal-800 transition-colors shadow-xs font-devanagari"
          >
            <Plus className="w-4 h-4 text-anumaan-gold-500" />
            <span>{t("dashboard.createProjectQuick")}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="p-5 rounded-xl bg-white border border-anumaan-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-anumaan-charcoal-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider font-devanagari">
              {t("dashboard.totalProjects")}
            </span>
            <div className="p-2 rounded-lg bg-anumaan-gold-50 text-anumaan-gold-600">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-anumaan-charcoal-900 font-sans">
              {metrics.total_projects}
            </div>
            <p className="text-xs text-anumaan-charcoal-500 font-devanagari mt-1">
              {metrics.active_projects} {t("dashboard.activeProjects")}
            </p>
          </div>
        </div>

        {/* Total Clients */}
        <div className="p-5 rounded-xl bg-white border border-anumaan-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-anumaan-charcoal-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider font-devanagari">
              {t("dashboard.totalClients")}
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-anumaan-charcoal-900 font-sans">
              {metrics.total_clients}
            </div>
            <p className="text-xs text-anumaan-charcoal-500 font-devanagari mt-1">
              {t("clients.title")}
            </p>
          </div>
        </div>

        {/* Draft Estimates (Real 0 with Coming Soon indicator) */}
        <div className="p-5 rounded-xl bg-white border border-anumaan-border shadow-xs flex flex-col justify-between opacity-85">
          <div className="flex items-center justify-between text-anumaan-charcoal-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider font-devanagari">
              {t("dashboard.draftEstimates")}
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-anumaan-charcoal-400 font-sans">
              0
            </div>
            <p className="text-xs text-anumaan-charcoal-400 font-devanagari mt-1">
              {t("nav.comingSoon")} (Phase 2)
            </p>
          </div>
        </div>

        {/* Quotations (Pending & Accepted Real 0) */}
        <div className="p-5 rounded-xl bg-white border border-anumaan-border shadow-xs flex flex-col justify-between opacity-85">
          <div className="flex items-center justify-between text-anumaan-charcoal-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider font-devanagari">
              {t("dashboard.pendingQuotations")}
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-anumaan-charcoal-400 font-sans">
              0
            </div>
            <p className="text-xs text-anumaan-charcoal-400 font-devanagari mt-1">
              {t("nav.comingSoon")} (Phase 2)
            </p>
          </div>
        </div>
      </div>

      {/* Recent Projects Table / Section */}
      <div className="bg-white rounded-xl border border-anumaan-border shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-anumaan-border-light flex items-center justify-between">
          <h2 className="text-base font-semibold text-anumaan-charcoal-900 font-devanagari">
            {t("dashboard.recentProjects")}
          </h2>
          <Link
            href="/projects"
            className="text-xs font-semibold text-anumaan-gold-600 hover:text-anumaan-gold-700 flex items-center gap-1 font-devanagari"
          >
            <span>{t("dashboard.viewAllProjects")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-anumaan-beige-100 flex items-center justify-center text-anumaan-charcoal-400">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-anumaan-charcoal-900 font-devanagari">
              {t("dashboard.emptyProjectsTitle")}
            </h3>
            <p className="text-xs text-anumaan-charcoal-500 font-devanagari max-w-sm mx-auto mt-1 mb-4">
              {t("dashboard.emptyProjectsSubtitle")}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateProjectModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-anumaan-charcoal-900 text-white text-xs font-semibold hover:bg-anumaan-charcoal-800 transition-colors font-devanagari"
            >
              <Plus className="w-3.5 h-3.5 text-anumaan-gold-500" />
              <span>{t("dashboard.createProjectQuick")}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-anumaan-border-light bg-anumaan-beige-50/50 text-xs font-semibold uppercase tracking-wider text-anumaan-charcoal-500 font-devanagari">
                  <th className="px-6 py-3">{t("projects.nameLabel")}</th>
                  <th className="px-6 py-3">{t("projects.typeLabel")}</th>
                  <th className="px-6 py-3">{t("projects.clientLabel")}</th>
                  <th className="px-6 py-3">{t("projects.statusLabel")}</th>
                  <th className="px-6 py-3 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-anumaan-border-light">
                {recentProjects.map((p) => {
                  const isRoad = p.project_type === "road";
                  return (
                    <tr key={p.id} className="hover:bg-anumaan-beige-50/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-anumaan-charcoal-900 font-devanagari">
                        {p.name}
                        {p.site_location && (
                          <span className="block text-xs font-normal text-anumaan-charcoal-400">
                            {p.site_location}, {p.city}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-anumaan-beige-100 text-anumaan-charcoal-700 font-devanagari">
                          {isRoad ? <Car className="w-3 h-3 text-amber-600" /> : <Building className="w-3 h-3 text-blue-600" />}
                          {t(`projectType.${p.project_type}`)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-anumaan-charcoal-600 font-devanagari">
                        {p.client_name || "—"}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium font-devanagari ${
                          p.status === "in_progress"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : p.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.status === "archived"
                            ? "bg-gray-100 text-gray-700 border border-gray-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {t(`status.${p.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/projects`}
                          className="text-xs font-semibold text-anumaan-gold-600 hover:text-anumaan-gold-700 font-devanagari"
                        >
                          {t("common.viewDetails")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Action: Create Project Modal */}
      <Modal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        title={t("projects.createNew")}
        maxWidth="lg"
      >
        <ProjectForm
          clients={clients}
          onSubmit={handleCreateProject}
          onCancel={() => setShowCreateProjectModal(false)}
          loading={modalLoading}
        />
      </Modal>

      {/* Quick Action: Add Client Modal */}
      <Modal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        title={t("clients.createNew")}
        maxWidth="md"
      >
        <ClientForm
          onSubmit={handleAddClient}
          onCancel={() => setShowAddClientModal(false)}
          loading={modalLoading}
        />
      </Modal>
    </div>
  );
}
