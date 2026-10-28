"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Edit2,
  Archive,
  Building,
  Car,
  Calendar,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "../../../context/I18nContext";
import { useOrg } from "../../../context/OrgContext";
import { api } from "../../../lib/api";
import { Modal } from "../../../components/Modal";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { ProjectForm, ProjectFormData } from "../../../components/ProjectForm";

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [archivingProject, setArchivingProject] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const [projList, clientList] = await Promise.all([
        api.listProjects(currentOrg.id, {
          search: search.trim() || undefined,
          project_type: selectedType || undefined,
          status: selectedStatus || undefined,
        }),
        api.listClients(currentOrg.id),
      ]);
      setProjects(projList);
      setClients(clientList);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (searchParams.get("new") === "1") {
      setShowCreateModal(true);
    }
  }, [currentOrg?.id, search, selectedType, selectedStatus, searchParams]);

  const handleCreate = async (data: ProjectFormData) => {
    if (!currentOrg?.id) return;
    setActionLoading(true);
    try {
      const created = await api.createProject(currentOrg.id, data);
      setShowCreateModal(false);
      router.push(`/projects/${created.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (data: ProjectFormData) => {
    if (!currentOrg?.id || !editingProject) return;
    setActionLoading(true);
    try {
      await api.updateProject(currentOrg.id, editingProject.id, data);
      setEditingProject(null);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!currentOrg?.id || !archivingProject) return;
    setActionLoading(true);
    try {
      await api.archiveProject(currentOrg.id, archivingProject.id);
      setArchivingProject(null);
      await loadData();
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
            {t("projects.title")}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            {t("projects.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#102F57] text-white text-sm font-semibold hover:bg-[#0c2444] transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#F7931E]" />
          <span>{t("projects.createNew")}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#DCE4EE] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[#DCE4EE] bg-[#F3F6FA] text-[#263445] focus:outline-none focus:ring-2 focus:ring-[#102F57] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label={t("common.type")}
            className="px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] bg-white text-[#263445] focus:outline-none focus:ring-2 focus:ring-[#102F57]"
          >
            <option value="">{t("common.type")}: {t("common.all")}</option>
            <option value="building">{t("projectType.building")}</option>
            <option value="road">{t("projectType.road")}</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label={t("common.status")}
            className="px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] bg-white text-[#263445] focus:outline-none focus:ring-2 focus:ring-[#102F57]"
          >
            <option value="">{t("common.status")}: {t("common.all")}</option>
            <option value="planning">{t("status.planning")}</option>
            <option value="in_progress">{t("status.in_progress")}</option>
            <option value="completed">{t("status.completed")}</option>
            <option value="archived">{t("status.archived")}</option>
          </select>
        </div>
      </div>

      {/* Projects Table / Empty State */}
      <div className="bg-white rounded-xl border border-[#DCE4EE] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#64748B]">
            {t("common.loading")}
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EEF3F9] flex items-center justify-center text-[#102F57]">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[#102F57] font-heading">
              {t("projects.emptySearch")}
            </h3>
            <p className="text-xs text-[#64748B] mt-1 mb-4">
              {t("dashboard.emptyProjectsSubtitle")}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#102F57] text-white text-xs font-semibold hover:bg-[#0c2444] transition"
            >
              <Plus className="w-3.5 h-3.5 text-[#F7931E]" />
              <span>{t("projects.createNew")}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#DCE4EE] bg-[#E8EEF5] text-xs font-semibold uppercase tracking-wider text-[#102F57]">
                  <th className="px-6 py-3.5">{t("projects.nameLabel")}</th>
                  <th className="px-6 py-3.5">{t("projects.typeLabel")}</th>
                  <th className="px-6 py-3.5">{t("projects.clientLabel")}</th>
                  <th className="px-6 py-3.5">{t("projects.locationLabel")}</th>
                  <th className="px-6 py-3.5">{t("projects.statusLabel")}</th>
                  <th className="px-6 py-3.5 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE4EE]">
                {projects.map((project) => {
                  const isRoad = project.project_type === "road";
                  const isArchived = project.status === "archived";

                  return (
                    <tr
                      key={project.id}
                      className={`hover:bg-[#F3F6FA] transition-colors ${
                        isArchived ? "opacity-60 bg-gray-50/50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-[#102F57] hover:text-[#0c2444] hover:underline block"
                        >
                          {project.name}
                        </Link>
                        {project.description && (
                          <div className="text-xs text-[#64748B] line-clamp-1 max-w-sm mt-0.5">
                            {project.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#EEF3F9] text-[#102F57]">
                          {isRoad ? (
                            <Car className="w-3.5 h-3.5 text-[#F7931E]" />
                          ) : (
                            <Building className="w-3.5 h-3.5 text-[#102F57]" />
                          )}
                          {t(`projectType.${project.project_type}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#263445]">
                        {project.client_name || "—"}
                      </td>
                      <td className="px-6 py-4 text-[#64748B] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>
                            {[project.site_location, project.city, project.state]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            project.status === "in_progress"
                              ? "bg-[#FFF6EB] text-[#B86B08] border border-[#F7931E]/30"
                              : project.status === "completed"
                              ? "bg-emerald-50 text-[#16835D] border border-emerald-200"
                              : project.status === "archived"
                              ? "bg-gray-100 text-[#64748B] border border-gray-200"
                              : "bg-[#EEF3F9] text-[#102F57] border border-[#DCE4EE]"
                          }`}
                        >
                          {t(`status.${project.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#102F57] text-white hover:bg-[#0c2444] rounded-lg transition shadow-2xs"
                          >
                            <span>Workspace</span>
                            <ExternalLink className="w-3 h-3 text-[#F7931E]" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setEditingProject(project)}
                            title={t("common.edit")}
                            className="p-1.5 rounded text-[#64748B] hover:text-[#102F57] hover:bg-[#EEF3F9] transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isArchived && (
                            <button
                              type="button"
                              onClick={() => setArchivingProject(project)}
                              title={t("common.archive")}
                              className="p-1.5 rounded text-[#64748B] hover:text-[#C62828] hover:bg-red-50 transition-colors"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t("projects.createNew")}
        maxWidth="lg"
      >
        <ProjectForm
          clients={clients}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          loading={actionLoading}
        />
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        title={t("projects.editProject")}
        maxWidth="lg"
      >
        {editingProject && (
          <ProjectForm
            initialData={editingProject}
            clients={clients}
            onSubmit={handleUpdate}
            onCancel={() => setEditingProject(null)}
            loading={actionLoading}
          />
        )}
      </Modal>

      {/* Archive Confirmation Dialog */}
      {archivingProject && (
        <ConfirmDialog
          isOpen={Boolean(archivingProject)}
          onClose={() => setArchivingProject(null)}
          onConfirm={handleArchive}
          title={t("projects.archiveConfirmTitle")}
          message={t("projects.archiveConfirmMessage", { name: archivingProject.name })}
          confirmLabel={t("projects.archiveButton")}
          isDestructive={true}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
