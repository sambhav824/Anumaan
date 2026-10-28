"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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
      const created = await api.createProject(currentOrg.id, data);
      setShowCreateProjectModal(false);
      router.push(`/projects/${created.id}`);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE4EE]">
        <div>
          <h1 className="text-2xl font-bold text-[#102F57] font-devanagari">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-[#64748B] font-devanagari mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddClientModal(true)}
            className="btn-secondary font-devanagari"
          >
            <Plus className="w-4 h-4 text-[#F7931E]" />
            <span>{t("dashboard.addClientQuick")}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateProjectModal(true)}
            className="btn-primary font-devanagari"
          >
            <Plus className="w-4 h-4 text-[#F7931E]" />
            <span>{t("dashboard.createProjectQuick")}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCE4EE] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider font-devanagari text-[#102F57]">
              {t("dashboard.totalProjects")}
            </span>
            <div className="p-2 rounded-xl bg-[#EEF3F9] text-[#102F57]">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#102F57] font-sans">
              {metrics.total_projects}
            </div>
            <p className="text-xs text-[#64748B] font-devanagari mt-1">
              {metrics.active_projects} {t("dashboard.activeProjects")}
            </p>
          </div>
        </div>

        {/* Total Clients */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCE4EE] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider font-devanagari text-[#102F57]">
              {t("dashboard.totalClients")}
            </span>
            <div className="p-2 rounded-xl bg-[#FFF6EB] text-[#F7931E]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#102F57] font-sans">
              {metrics.total_clients}
            </div>
            <p className="text-xs text-[#64748B] font-devanagari mt-1">
              {t("clients.title")}
            </p>
          </div>
        </div>

        {/* Estimates & BOQ */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCE4EE] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider font-devanagari text-[#102F57]">
              {t("dashboard.draftEstimates")}
            </span>
            <div className="p-2 rounded-xl bg-[#FEF7EB] text-[#B86B08]">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#102F57] font-sans">
              {metrics.draft_estimates}
            </div>
            <p className="text-xs text-[#64748B] font-devanagari mt-1">
              Active Project BOQs
            </p>
          </div>
        </div>

        {/* Quotations */}
        <div className="p-5 rounded-2xl bg-white border border-[#DCE4EE] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider font-devanagari text-[#102F57]">
              {t("dashboard.pendingQuotations")}
            </span>
            <div className="p-2 rounded-xl bg-[#EBF6F1] text-[#16835D]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#102F57] font-sans">
              {metrics.pending_quotations + (metrics.accepted_quotations || 0)}
            </div>
            <p className="text-xs text-[#64748B] font-devanagari mt-1">
              {metrics.accepted_quotations || 0} Accepted Proposals
            </p>
          </div>
        </div>
      </div>

      {/* Recent Projects Table / Section */}
      <div className="bg-white rounded-2xl border border-[#DCE4EE] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#DCE4EE] flex items-center justify-between bg-white">
          <h2 className="text-base font-bold text-[#102F57] font-devanagari">
            {t("dashboard.recentProjects")}
          </h2>
          <Link
            href="/projects"
            className="text-xs font-bold text-[#102F57] hover:text-[#F7931E] flex items-center gap-1 font-devanagari transition-colors"
          >
            <span>{t("dashboard.viewAllProjects")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EEF3F9] flex items-center justify-center text-[#102F57]">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#102F57] font-devanagari">
              {t("dashboard.emptyProjectsTitle")}
            </h3>
            <p className="text-xs text-[#64748B] font-devanagari max-w-sm mx-auto mt-1 mb-4">
              {t("dashboard.emptyProjectsSubtitle")}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateProjectModal(true)}
              className="btn-primary font-devanagari"
            >
              <Plus className="w-3.5 h-3.5 text-[#F7931E]" />
              <span>{t("dashboard.createProjectQuick")}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#DCE4EE] bg-[#E8EEF5] text-xs font-bold uppercase tracking-wider text-[#102F57] font-devanagari">
                  <th className="px-6 py-3.5">{t("projects.nameLabel")}</th>
                  <th className="px-6 py-3.5">{t("projects.typeLabel")}</th>
                  <th className="px-6 py-3.5">{t("projects.clientLabel")}</th>
                  <th className="px-6 py-3.5">{t("projects.statusLabel")}</th>
                  <th className="px-6 py-3.5 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE4EE]">
                {recentProjects.map((p) => {
                  const isRoad = p.project_type === "road";
                  return (
                    <tr key={p.id} className="hover:bg-[#F3F6FA]/70 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-[#263445] font-devanagari">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-bold text-[#102F57] hover:underline block"
                        >
                          {p.name}
                        </Link>
                        {p.site_location && (
                          <span className="block text-xs font-normal text-[#64748B]">
                            {p.site_location}, {p.city}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#EEF3F9] text-[#102F57] font-devanagari">
                          {isRoad ? <Car className="w-3 h-3 text-[#F7931E]" /> : <Building className="w-3 h-3 text-[#102F57]" />}
                          {t(`projectType.${p.project_type}`)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-[#64748B] font-devanagari">
                        {p.client_name || "—"}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium font-devanagari ${
                          p.status === "in_progress"
                            ? "bg-[#FEF7EB] text-[#B86B08] border border-[#FCD6A8]"
                            : p.status === "completed"
                            ? "bg-[#EBF6F1] text-[#16835D] border border-[#B5E3CE]"
                            : p.status === "archived"
                            ? "bg-[#F1F5F9] text-[#64748B] border border-[#DCE4EE]"
                            : "bg-[#EEF3F9] text-[#102F57] border border-[#DCE4EE]"
                        }`}>
                          {t(`status.${p.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/projects/${p.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#102F57] text-white hover:bg-[#0c2444] rounded-lg transition shadow-2xs font-devanagari"
                        >
                          <span>Workspace ➔</span>
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
