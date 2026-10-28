"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/context/OrgContext";
import { useTranslation } from "@/context/I18nContext";
import { api, DrawingDetail, Estimate } from "@/lib/api";
import DrawingTakeoffViewer from "@/components/DrawingTakeoffViewer";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TakeoffWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrg();
  const { t } = useTranslation();

  const projectId = params?.id as string;
  const drawingId = params?.drawingId as string;

  const [drawing, setDrawing] = useState<DrawingDetail | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg?.id || !projectId || !drawingId) return;

    let isCancelled = false;
    const loadTakeoffData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [drawingData, estimatesData] = await Promise.all([
          api.getDrawingDetail(currentOrg.id, drawingId),
          api.listEstimates(currentOrg.id, { project_id: projectId }),
        ]);

        if (isCancelled) return;
        setDrawing(drawingData);
        setEstimates(estimatesData);
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || "Failed to load drawing data.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadTakeoffData();

    return () => {
      isCancelled = true;
    };
  }, [currentOrg?.id, projectId, drawingId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#64748B] space-y-3">
        <div className="w-10 h-10 border-4 border-[#DCE4EE] border-t-[#102F57] rounded-full animate-spin"></div>
        <p className="text-sm font-medium">{t("common.loading") || "Loading Drawing & Takeoff..."}</p>
      </div>
    );
  }

  if (error || !drawing || !currentOrg) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-rose-900">Drawing Not Found</h2>
          <p className="text-xs text-rose-700">{error || "The requested drawing could not be loaded."}</p>
          <Link
            href={`/projects/${projectId}?step=2`}
            className="inline-flex items-center px-4 py-2 bg-[#102F57] hover:bg-[#0c2444] text-white rounded-lg text-xs font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DrawingTakeoffViewer
      organizationId={currentOrg.id}
      projectId={projectId}
      drawing={drawing}
      estimates={estimates}
      onDrawingUpdated={(updated) => setDrawing(updated)}
      onBack={() => router.push(`/projects/${projectId}?step=2`)}
    />
  );
}
