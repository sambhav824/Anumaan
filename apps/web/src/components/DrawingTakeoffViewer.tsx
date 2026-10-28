"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Ruler,
  Square,
  Hash,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Check,
  AlertTriangle,
  Layers,
  Trash2,
  BookOpen,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/context/I18nContext";
import {
  Point2D,
  ScaleCalibration,
  calibrateDrawingScale,
  calculateRealLength,
  calculateRealArea,
  calculatePixelDistance,
  deriveConstructionQuantities,
} from "@/lib/takeoffCalculations";
import {
  api,
  DrawingDetail,
  DrawingMeasurementItem,
  Estimate,
} from "@/lib/api";
import { formatIndianCurrency } from "@/lib/calculations";

interface DrawingTakeoffViewerProps {
  organizationId: string;
  projectId: string;
  drawing: DrawingDetail;
  estimates: Estimate[];
  onDrawingUpdated?: (updated: DrawingDetail) => void;
  onBack?: () => void;
}

type ToolMode = "pan" | "calibrate" | "length" | "area" | "count";

export default function DrawingTakeoffViewer({
  organizationId,
  projectId,
  drawing,
  estimates,
  onDrawingUpdated,
  onBack,
}: DrawingTakeoffViewerProps) {
  const { t } = useTranslation();

  // Navigation & Page State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = Math.max(drawing.pages_count || 1, 1);

  // Viewport Transform State
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tool Selection
  const [activeTool, setActiveTool] = useState<ToolMode>("pan");
  const [activeCountCategory, setActiveCountCategory] = useState<string>("Door D1");

  // Calibration State for Current Page
  const pageCalibrations = (drawing.scale_calibrations || {}) as Record<string, ScaleCalibration>;
  const currentCalibration: ScaleCalibration | null = pageCalibrations[String(currentPage)] || null;

  // Active Drawing Work-in-Progress Points
  const [activePoints, setActivePoints] = useState<Point2D[]>([]);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<Point2D | null>(null);

  // Calibration Dialog
  const [showCalibrateModal, setShowCalibrateModal] = useState<boolean>(false);
  const [calibrateDistance, setCalibrateDistance] = useState<string>("5.0");
  const [calibrateUnit, setCalibrateUnit] = useState<"m" | "ft" | "mm" | "in">("m");
  const [pendingCalibrationPoints, setPendingCalibrationPoints] = useState<[Point2D, Point2D] | null>(null);

  // Transfer to Estimate Dialog
  const [selectedMeasurementForTransfer, setSelectedMeasurementForTransfer] = useState<DrawingMeasurementItem | null>(null);
  const [targetEstimateId, setTargetEstimateId] = useState<string>(estimates[0]?.id || "");
  const [transferCategory, setTransferCategory] = useState<
    "flooring" | "slab_concrete" | "wall_plaster" | "brickwork" | "excavation" | "item_count"
  >("flooring");
  const [thicknessM, setThicknessM] = useState<number>(0.125);
  const [heightM, setHeightM] = useState<number>(3.0);
  const [wastagePct, setWastagePct] = useState<number>(5.0);
  const [unitRate, setUnitRate] = useState<number>(850);
  const [transferring, setTransferring] = useState<boolean>(false);
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string | null>(null);

  // Measurements List
  const [measurements, setMeasurements] = useState<DrawingMeasurementItem[]>(drawing.measurements || []);

  // Canvas Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Natural Dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 1200, height: 800 });
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(true);
  const [fileError, setFileError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Render Base Background (PDF or Image)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingFile(true);
    setFileError(null);

    const renderDrawing = async () => {
      try {
        const fileUrl = drawing.file_url;
        if (!fileUrl) {
          throw new Error("Drawing file URL is missing.");
        }

        const isPdf = drawing.file_type?.toLowerCase().includes("pdf") ||
          drawing.file_name?.toLowerCase().endsWith(".pdf") ||
          fileUrl.startsWith("data:application/pdf");

        if (isPdf) {
          // Dynamic import of pdfjs-dist for Next.js client compatibility
          const pdfjsLib = await import("pdfjs-dist");
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          }

          const loadingTask = pdfjsLib.getDocument(fileUrl);
          const pdfDoc = await loadingTask.promise;
          if (isCancelled) return;

          const page = await pdfDoc.getPage(currentPage);
          if (isCancelled) return;

          const viewport = page.getViewport({ scale: 1.5 });
          const baseCanvas = baseCanvasRef.current;
          if (!baseCanvas) return;

          baseCanvas.width = viewport.width;
          baseCanvas.height = viewport.height;
          setNaturalSize({ width: viewport.width, height: viewport.height });

          const context = baseCanvas.getContext("2d");
          if (!context) return;

          await page.render({ canvasContext: context, viewport }).promise;
        } else {
          // Standard Raster Image (PNG, JPG, Blueprint)
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = fileUrl;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to load drawing image."));
          });
          if (isCancelled) return;

          const baseCanvas = baseCanvasRef.current;
          if (!baseCanvas) return;

          baseCanvas.width = img.naturalWidth || 1200;
          baseCanvas.height = img.naturalHeight || 800;
          setNaturalSize({ width: baseCanvas.width, height: baseCanvas.height });

          const context = baseCanvas.getContext("2d");
          if (context) {
            context.drawImage(img, 0, 0, baseCanvas.width, baseCanvas.height);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Error rendering drawing sheet:", err);
          setFileError(err.message || "Failed to render drawing page.");
        }
      } finally {
        if (!isCancelled) setIsLoadingFile(false);
      }
    };

    renderDrawing();

    return () => {
      isCancelled = true;
    };
  }, [drawing.file_url, drawing.file_type, drawing.file_name, currentPage]);

  // ---------------------------------------------------------------------------
  // 2. Draw Interactive Overlay (Measurements, Active Polygon, Pins)
  // ---------------------------------------------------------------------------
  const redrawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = naturalSize.width;
    canvas.height = naturalSize.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter measurements for current page
    const pageMeasurements = measurements.filter((m) => m.page_number === currentPage);

    // 1. Draw Saved Measurements
    pageMeasurements.forEach((m) => {
      const color = m.color || (m.measurement_type === "area" ? "#2563EB" : m.measurement_type === "length" ? "#D97706" : "#059669");

      if (m.measurement_type === "length" && m.points.length >= 2) {
        const [p1, p2] = m.points;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Endcaps
        [p1, p2].forEach((p) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Label at midpoint
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.font = "bold 13px sans-serif";
        const label = `${m.name}: ${m.calibrated_value.toFixed(2)} ${m.unit}`;
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = "rgba(16, 47, 87, 0.9)";
        ctx.fillRect(midX - textWidth / 2 - 6, midY - 14, textWidth + 12, 22);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, midX - textWidth / 2, midY + 2);
      } else if (m.measurement_type === "area" && m.points.length >= 3) {
        ctx.fillStyle = "rgba(37, 99, 235, 0.25)";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(m.points[0].x, m.points[0].y);
        for (let i = 1; i < m.points.length; i++) {
          ctx.lineTo(m.points[i].x, m.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Vertices
        m.points.forEach((p) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // Centroid Label
        const cx = m.points.reduce((acc, p) => acc + p.x, 0) / m.points.length;
        const cy = m.points.reduce((acc, p) => acc + p.y, 0) / m.points.length;
        ctx.font = "bold 13px sans-serif";
        const label = `${m.name}: ${m.calibrated_value.toFixed(2)} ${m.unit}`;
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = "rgba(16, 47, 87, 0.9)";
        ctx.fillRect(cx - textWidth / 2 - 6, cy - 14, textWidth + 12, 22);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, cx - textWidth / 2, cy + 2);
      } else if (m.measurement_type === "count") {
        m.points.forEach((p, idx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(idx + 1), p.x, p.y);
        });
      }
    });

    // 2. Draw Active Work-in-Progress Points
    if (activePoints.length > 0) {
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);

      // Connect existing points
      ctx.beginPath();
      ctx.moveTo(activePoints[0].x, activePoints[0].y);
      for (let i = 1; i < activePoints.length; i++) {
        ctx.lineTo(activePoints[i].x, activePoints[i].y);
      }

      // Guide line to cursor
      if (mouseCanvasPos) {
        ctx.lineTo(mouseCanvasPos.x, mouseCanvasPos.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circles
      activePoints.forEach((p, idx) => {
        ctx.fillStyle = idx === 0 ? "#10B981" : "#EF4444";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Live dimension tooltip near cursor
      if (mouseCanvasPos && currentCalibration && currentCalibration.isCalibrated) {
        const lastPt = activePoints[activePoints.length - 1];
        const distPx = calculatePixelDistance(lastPt, mouseCanvasPos);
        const liveDist = distPx * currentCalibration.scaleRatio;
        const liveText = `${liveDist.toFixed(2)} ${currentCalibration.unit}`;

        ctx.font = "bold 12px monospace";
        const w = ctx.measureText(liveText).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(mouseCanvasPos.x + 12, mouseCanvasPos.y - 20, w + 12, 22);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(liveText, mouseCanvasPos.x + 18, mouseCanvasPos.y - 9);
      }
    }
  }, [measurements, currentPage, naturalSize, activePoints, mouseCanvasPos, currentCalibration]);

  useEffect(() => {
    redrawOverlay();
  }, [redrawOverlay]);

  // ---------------------------------------------------------------------------
  // 3. Canvas Coordinate Mapping & Mouse Handlers
  // ---------------------------------------------------------------------------
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point2D => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = naturalSize.width / rect.width;
    const scaleY = naturalSize.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === "pan" || e.button === 1 || e.altKey) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (overlayCanvasRef.current) {
      const coords = getCanvasCoords(e as any);
      setMouseCanvasPos(coords);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // ---------------------------------------------------------------------------
  // 4. Interactive Drawing Tool Click Handlers
  // ---------------------------------------------------------------------------
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "pan") return;
    const pt = getCanvasCoords(e);

    // A. SCALE CALIBRATION TOOL
    if (activeTool === "calibrate") {
      const updated = [...activePoints, pt];
      if (updated.length === 1) {
        setActivePoints(updated);
      } else if (updated.length >= 2) {
        setActivePoints([]);
        setPendingCalibrationPoints([updated[0], updated[1]]);
        setShowCalibrateModal(true);
      }
      return;
    }

    // B. LINEAR LENGTH TOOL
    if (activeTool === "length") {
      const updated = [...activePoints, pt];
      if (updated.length === 1) {
        setActivePoints(updated);
      } else if (updated.length >= 2) {
        setActivePoints([]);
        const p1 = updated[0];
        const p2 = updated[1];
        const pixelDist = calculatePixelDistance(p1, p2);

        let realLength = pixelDist;
        let unit = "px";
        if (currentCalibration && currentCalibration.isCalibrated) {
          const res = calculateRealLength(p1, p2, currentCalibration);
          realLength = res.length;
          unit = res.unit;
        }

        const name = prompt("Enter measurement label:", `Wall Length ${measurements.filter((m) => m.measurement_type === "length").length + 1}`) || "Length";

        try {
          const newM = await api.addDrawingMeasurement(organizationId, drawing.id, {
            page_number: currentPage,
            measurement_type: "length",
            name,
            raw_pixel_value: pixelDist,
            calibrated_value: realLength,
            unit,
            points: [p1, p2],
            color: "#D97706",
          });
          const updatedList = [...measurements, newM];
          setMeasurements(updatedList);
          onDrawingUpdated?.({ ...drawing, measurements: updatedList });
        } catch (err: any) {
          alert(`Failed to save measurement: ${err.message}`);
        }
      }
      return;
    }

    // C. POLYGON AREA TOOL
    if (activeTool === "area") {
      // Check if clicking close to the starting point to complete polygon
      if (activePoints.length >= 2) {
        const startPt = activePoints[0];
        const distToStart = calculatePixelDistance(pt, startPt);
        if (distToStart < 15) {
          completeAreaMeasurement(activePoints);
          return;
        }
      }
      setActivePoints([...activePoints, pt]);
      return;
    }

    // D. ITEM COUNT TOOL
    if (activeTool === "count") {
      // Find or create count group for this category on current page
      const existing = measurements.find(
        (m) =>
          m.measurement_type === "count" &&
          m.page_number === currentPage &&
          m.count_category === activeCountCategory
      );

      if (existing) {
        const newPoints = [...existing.points, pt];
        try {
          const updatedM = await api.updateDrawingMeasurement(organizationId, drawing.id, existing.id, {
            name: `${activeCountCategory} (${newPoints.length})`,
          });
          // Update in-memory
          const updatedList = measurements.map((m) =>
            m.id === existing.id
              ? { ...m, points: newPoints, calibrated_value: newPoints.length, raw_pixel_value: newPoints.length }
              : m
          );
          setMeasurements(updatedList);
        } catch (err: any) {
          alert(`Failed to record pin: ${err.message}`);
        }
      } else {
        try {
          const newM = await api.addDrawingMeasurement(organizationId, drawing.id, {
            page_number: currentPage,
            measurement_type: "count",
            name: `${activeCountCategory} (1)`,
            raw_pixel_value: 1,
            calibrated_value: 1,
            unit: "nos",
            points: [pt],
            color: "#059669",
            count_category: activeCountCategory,
          });
          const updatedList = [...measurements, newM];
          setMeasurements(updatedList);
          onDrawingUpdated?.({ ...drawing, measurements: updatedList });
        } catch (err: any) {
          alert(`Failed to create count group: ${err.message}`);
        }
      }
    }
  };

  const completeAreaMeasurement = async (points: Point2D[]) => {
    if (points.length < 3) return;
    setActivePoints([]);

    let realArea = 0;
    let unit = "sq.px";
    if (currentCalibration && currentCalibration.isCalibrated) {
      const res = calculateRealArea(points, currentCalibration);
      realArea = res.area;
      unit = res.unit;
    }

    const name = prompt("Enter area label:", `Room Area ${measurements.filter((m) => m.measurement_type === "area").length + 1}`) || "Room Area";

    try {
      const newM = await api.addDrawingMeasurement(organizationId, drawing.id, {
        page_number: currentPage,
        measurement_type: "area",
        name,
        raw_pixel_value: realArea,
        calibrated_value: realArea,
        unit,
        points,
        color: "#2563EB",
      });
      const updatedList = [...measurements, newM];
      setMeasurements(updatedList);
      onDrawingUpdated?.({ ...drawing, measurements: updatedList });
    } catch (err: any) {
      alert(`Failed to save area measurement: ${err.message}`);
    }
  };

  const handleDoubleClick = () => {
    if (activeTool === "area" && activePoints.length >= 3) {
      completeAreaMeasurement(activePoints);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Calibration Application
  // ---------------------------------------------------------------------------
  const handleSaveCalibration = async () => {
    if (!pendingCalibrationPoints) return;
    const [p1, p2] = pendingCalibrationPoints;
    const distNum = parseFloat(calibrateDistance);
    if (isNaN(distNum) || distNum <= 0) {
      alert("Please enter a valid positive number for known distance.");
      return;
    }

    try {
      const calib = calibrateDrawingScale(p1, p2, distNum, calibrateUnit, currentPage);
      const updatedCalibrations = {
        ...pageCalibrations,
        [String(currentPage)]: calib,
      };

      await api.updateDrawing(organizationId, drawing.id, {
        scale_calibrations: updatedCalibrations,
      });

      setShowCalibrateModal(false);
      setPendingCalibrationPoints(null);
      setActiveTool("pan");

      onDrawingUpdated?.({
        ...drawing,
        scale_calibrations: updatedCalibrations,
      });
    } catch (err: any) {
      alert(`Calibration failed: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Delete Measurement
  // ---------------------------------------------------------------------------
  const handleDeleteMeasurement = async (id: string) => {
    if (!confirm(t("drawings.deleteMeasurementConfirm"))) return;
    try {
      await api.deleteDrawingMeasurement(organizationId, drawing.id, id);
      const updatedList = measurements.filter((m) => m.id !== id);
      setMeasurements(updatedList);
      onDrawingUpdated?.({ ...drawing, measurements: updatedList });
    } catch (err: any) {
      alert(`Failed to delete measurement: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // 7. Transfer to Estimate BOQ Handler
  // ---------------------------------------------------------------------------
  const handleTransferToEstimate = async () => {
    if (!selectedMeasurementForTransfer || !targetEstimateId) return;

    setTransferring(true);
    setTransferSuccessMsg(null);
    try {
      const res = await api.transferMeasurementToEstimate(
        organizationId,
        drawing.id,
        selectedMeasurementForTransfer.id,
        {
          estimate_id: targetEstimateId,
          item_category: transferCategory,
          thickness_m: thicknessM,
          height_or_depth_m: heightM,
          wastage_pct: wastagePct,
          unit_rate: unitRate,
          custom_description: `${selectedMeasurementForTransfer.name} (from Takeoff sheet p.${selectedMeasurementForTransfer.page_number})`,
        }
      );

      setTransferSuccessMsg(res.message || "Successfully transferred to Estimate BOQ!");

      // Mark measurement as transferred locally
      const updatedList = measurements.map((m) =>
        m.id === selectedMeasurementForTransfer.id
          ? { ...m, is_transferred: true, transferred_to_estimate_id: targetEstimateId }
          : m
      );
      setMeasurements(updatedList);
      onDrawingUpdated?.({ ...drawing, measurements: updatedList });

      setTimeout(() => {
        setSelectedMeasurementForTransfer(null);
        setTransferSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(`Failed to transfer to estimate: ${err.message}`);
    } finally {
      setTransferring(false);
    }
  };

  // Preview derived quantity for transfer modal
  const derivedTransferPreview = selectedMeasurementForTransfer
    ? deriveConstructionQuantities(
        {
          id: selectedMeasurementForTransfer.id,
          name: selectedMeasurementForTransfer.name,
          pageNumber: selectedMeasurementForTransfer.page_number,
          type: selectedMeasurementForTransfer.measurement_type,
          points: selectedMeasurementForTransfer.points,
          rawPixelValue: selectedMeasurementForTransfer.raw_pixel_value,
          quantity: selectedMeasurementForTransfer.calibrated_value,
          unit: selectedMeasurementForTransfer.unit as any,
        },
        {
          itemCategory: transferCategory,
          thicknessM,
          heightOrDepthM: heightM,
          wastagePct,
          unitRate,
        }
      )
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-[#0B1528] text-slate-100 overflow-hidden select-none">
      {/* TOP APPLICATION BAR */}
      <div className="h-14 bg-[#102F57] border-b border-[#24426E] px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-[#1A4175] rounded-lg transition"
              title="Back to Project"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm tracking-wide">{drawing.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A4175] text-amber-300 font-mono">
                {drawing.file_name}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center space-x-2">
              <span>{t("drawings.takeoffSubtitle")}</span>
              <span>•</span>
              {currentCalibration?.isCalibrated ? (
                <span className="text-emerald-400 font-medium inline-flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {t("drawings.calibrated")}: 1 {currentCalibration.unit} = {(1 / currentCalibration.scaleRatio).toFixed(1)} px
                </span>
              ) : (
                <span className="text-amber-400 font-medium inline-flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t("drawings.uncalibrated")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Viewport Zoom & Page Controls */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Page Selector */}
          <div className="flex items-center bg-[#0B1E38] rounded-lg border border-[#24426E] px-2 py-1 space-x-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 hover:text-white text-slate-400 disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 hover:text-white text-slate-400 disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-[#0B1E38] rounded-lg border border-[#24426E] p-0.5 space-x-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}
              className="p-1.5 hover:text-white text-slate-300 hover:bg-[#1A4175] rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="px-2 py-1 font-mono text-[11px] text-slate-200 hover:text-white"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(4.0, z + 0.15))}
              className="p-1.5 hover:text-white text-slate-300 hover:bg-[#1A4175] rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* WORKSPACE MAIN BODY: TOOLBAR + CANVAS + MEASUREMENTS DRAWER */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT VERTICAL TOOLBAR */}
        <div className="w-14 bg-[#0E2442] border-r border-[#24426E] flex flex-col items-center py-3 space-y-2 z-10">
          <button
            onClick={() => {
              setActiveTool("pan");
              setActivePoints([]);
            }}
            className={`p-2.5 rounded-xl transition ${
              activeTool === "pan"
                ? "bg-[#F7931E] text-[#102F57] shadow-lg"
                : "text-slate-300 hover:bg-[#1A4175] hover:text-white"
            }`}
            title="Pan & Move Tool (Space + Drag)"
          >
            <Move className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setActiveTool("calibrate");
              setActivePoints([]);
            }}
            className={`p-2.5 rounded-xl transition relative ${
              activeTool === "calibrate"
                ? "bg-[#F7931E] text-[#102F57] shadow-lg"
                : "text-slate-300 hover:bg-[#1A4175] hover:text-white"
            }`}
            title="Calibrate Scale (Pick 2 Points with Known Length)"
          >
            <Ruler className="w-5 h-5" />
            {!currentCalibration?.isCalibrated && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>

          <div className="w-8 h-[1px] bg-[#24426E] my-1"></div>

          <button
            onClick={() => {
              setActiveTool("length");
              setActivePoints([]);
            }}
            className={`p-2.5 rounded-xl transition ${
              activeTool === "length"
                ? "bg-[#F7931E] text-[#102F57] shadow-lg"
                : "text-slate-300 hover:bg-[#1A4175] hover:text-white"
            }`}
            title="Measure Linear Length (Walls, Beams, Perimeter)"
          >
            <Ruler className="w-5 h-5 rotate-45" />
          </button>

          <button
            onClick={() => {
              setActiveTool("area");
              setActivePoints([]);
            }}
            className={`p-2.5 rounded-xl transition ${
              activeTool === "area"
                ? "bg-[#F7931E] text-[#102F57] shadow-lg"
                : "text-slate-300 hover:bg-[#1A4175] hover:text-white"
            }`}
            title="Measure Polygon Area (Rooms, Slabs, Footings)"
          >
            <Square className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setActiveTool("count");
              setActivePoints([]);
            }}
            className={`p-2.5 rounded-xl transition ${
              activeTool === "count"
                ? "bg-[#F7931E] text-[#102F57] shadow-lg"
                : "text-slate-300 hover:bg-[#1A4175] hover:text-white"
            }`}
            title="Count Items (Doors, Windows, Columns)"
          >
            <Hash className="w-5 h-5" />
          </button>

          {activeTool === "count" && (
            <div className="pt-2 px-1 text-center space-y-1">
              {["Door D1", "Window W1", "Column C1", "Footing"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCountCategory(cat)}
                  className={`text-[9px] w-12 px-1 py-1 rounded truncate block transition ${
                    activeCountCategory === cat
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-[#1A4175] text-slate-300 hover:bg-[#235391]"
                  }`}
                  title={cat}
                >
                  {cat.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CENTER DRAWING CANVAS VIEWPORT */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 bg-[#070E1A] overflow-hidden relative cursor-crosshair flex items-center justify-center"
        >
          {/* Scale Warning Pill */}
          {!currentCalibration?.isCalibrated && (
            <div className="absolute top-3 left-4 z-10 bg-amber-900/90 border border-amber-600/70 text-amber-200 text-xs px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-lg backdrop-blur">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{t("drawings.uncalibratedWarning")}</span>
              <button
                onClick={() => {
                  setActiveTool("calibrate");
                  setActivePoints([]);
                }}
                className="underline font-bold text-white hover:text-amber-100 ml-1"
              >
                {t("drawings.calibrateScale")}
              </button>
            </div>
          )}

          {/* Active Tool Help Banner */}
          <div className="absolute bottom-3 left-4 z-10 bg-[#102F57]/90 border border-[#24426E] text-slate-200 text-xs px-3 py-1.5 rounded-lg shadow-lg backdrop-blur flex items-center space-x-2">
            <span className="font-semibold text-amber-400 capitalize">{activeTool} mode:</span>
            <span>
              {activeTool === "pan" && "Click & drag to pan viewport. Scroll or buttons to zoom."}
              {activeTool === "calibrate" && "Click Point 1, then Point 2 across a known dimension."}
              {activeTool === "length" && "Click start point, then click end point to measure line."}
              {activeTool === "area" && "Click vertices. Double-click or click start point to close polygon."}
              {activeTool === "count" && `Click on drawing to drop count pins for '${activeCountCategory}'.`}
            </span>
          </div>

          {/* File Loading Spinner */}
          {isLoadingFile && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070E1A]/80 z-20">
              <div className="w-10 h-10 border-4 border-[#24426E] border-t-amber-500 rounded-full animate-spin mb-3"></div>
              <p className="text-xs text-slate-300 font-mono">Rendering Drawing Page {currentPage}...</p>
            </div>
          )}

          {/* File Error Notice */}
          {fileError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#070E1A]/95 z-20 text-center max-w-md mx-auto">
              <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
              <h3 className="text-sm font-bold text-white">Drawing Rendering Error</h3>
              <p className="text-xs text-slate-300 mt-1">{fileError}</p>
            </div>
          )}

          {/* CANVAS STACK WITH TRANSFORM */}
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isPanning ? "none" : "transform 0.05s ease-out",
              position: "relative",
              width: naturalSize.width,
              height: naturalSize.height,
            }}
          >
            {/* Base Document Canvas */}
            <canvas
              ref={baseCanvasRef}
              className="absolute top-0 left-0 shadow-2xl bg-white"
              style={{ width: naturalSize.width, height: naturalSize.height }}
            />

            {/* Interactive Vector Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              onClick={handleCanvasClick}
              onDoubleClick={handleDoubleClick}
              className="absolute top-0 left-0"
              style={{ width: naturalSize.width, height: naturalSize.height }}
            />
          </div>
        </div>

        {/* RIGHT SIDE MEASUREMENTS DRAWER */}
        <div className="w-80 bg-[#0E2442] border-l border-[#24426E] flex flex-col z-10">
          <div className="p-3.5 border-b border-[#24426E] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                {t("drawings.measurements")} ({measurements.length})
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Page {currentPage}</span>
          </div>

          {/* Measurements List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {measurements.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400 space-y-2">
                <Ruler className="w-8 h-8 mx-auto text-slate-500 stroke-[1.5]" />
                <p className="text-xs">No measurements recorded yet.</p>
                <p className="text-[11px] text-slate-500">
                  Select a tool from the left to measure lengths, areas or count items from this drawing.
                </p>
              </div>
            ) : (
              measurements.map((m) => {
                const isCurrent = m.page_number === currentPage;
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border text-xs transition ${
                      isCurrent
                        ? "bg-[#14325A] border-[#295088]"
                        : "bg-[#0B1E38]/50 border-[#1A3860] opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-100 flex items-center space-x-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: m.color || "#F7931E" }}
                          ></span>
                          <span>{m.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Page {m.page_number} • {m.measurement_type.toUpperCase()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMeasurement(m.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded"
                        title="Delete measurement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-[#1E4374]">
                      <span className="text-base font-bold font-mono text-amber-300">
                        {m.calibrated_value.toFixed(2)}{" "}
                        <span className="text-xs font-normal text-slate-300">{m.unit}</span>
                      </span>

                      {m.is_transferred ? (
                        <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-medium flex items-center">
                          <Check className="w-3 h-3 mr-1" />
                          BOQ
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedMeasurementForTransfer(m);
                            setTransferCategory(
                              m.measurement_type === "area"
                                ? "flooring"
                                : m.measurement_type === "length"
                                ? "wall_plaster"
                                : "item_count"
                            );
                          }}
                          className="px-2.5 py-1 bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] font-bold text-[11px] rounded transition flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{t("drawings.transferToEstimate")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: SCALE CALIBRATION PROMPT */}
      {showCalibrateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#102F57] border border-[#24426E] rounded-2xl p-6 max-w-sm w-full text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-400 font-bold">
              <Ruler className="w-5 h-5" />
              <span>{t("drawings.calibrateScale")}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {t("drawings.calibratePrompt")}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">{t("drawings.knownDistance")}</label>
                <input
                  type="number"
                  step="0.01"
                  value={calibrateDistance}
                  onChange={(e) => setCalibrateDistance(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0B1E38] border border-[#24426E] rounded-lg text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  placeholder="5.0"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">{t("drawings.dimensionUnit")}</label>
                <select
                  value={calibrateUnit}
                  onChange={(e) => setCalibrateUnit(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-[#0B1E38] border border-[#24426E] rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="m">Meters (m)</option>
                  <option value="ft">Feet (ft)</option>
                  <option value="mm">Millimeters (mm)</option>
                  <option value="in">Inches (in)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setShowCalibrateModal(false);
                  setPendingCalibrationPoints(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[#1A4175] transition"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSaveCalibration}
                className="px-4 py-1.5 bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] font-bold text-xs rounded-lg transition"
              >
                {t("drawings.applyCalibration")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TRANSFER MEASUREMENT TO ESTIMATE BOQ */}
      {selectedMeasurementForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#102F57] border border-[#24426E] rounded-2xl p-6 max-w-md w-full text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#24426E] pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold">
                <Sparkles className="w-5 h-5" />
                <span>{t("drawings.transferModalTitle")}</span>
              </div>
              <button
                onClick={() => setSelectedMeasurementForTransfer(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {transferSuccessMsg ? (
              <div className="py-6 text-center space-y-2 text-emerald-400">
                <CheckCircle2 className="w-10 h-10 mx-auto" />
                <p className="font-bold text-sm">{transferSuccessMsg}</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Target Estimate */}
                <div>
                  <label className="block text-slate-300 mb-1">{t("drawings.selectEstimate")}</label>
                  <select
                    value={targetEstimateId}
                    onChange={(e) => setTargetEstimateId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B1E38] border border-[#24426E] rounded-lg text-white"
                  >
                    {estimates.map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.estimate_number} — {est.name || "Estimate"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Construction Work Category */}
                <div>
                  <label className="block text-slate-300 mb-1">{t("drawings.selectCategory")}</label>
                  <select
                    value={transferCategory}
                    onChange={(e) => setTransferCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0B1E38] border border-[#24426E] rounded-lg text-white font-medium"
                  >
                    <option value="flooring">{t("drawings.flooring")}</option>
                    <option value="slab_concrete">{t("drawings.slabConcrete")}</option>
                    <option value="wall_plaster">{t("drawings.wallPlaster")}</option>
                    <option value="brickwork">{t("drawings.brickwork")}</option>
                    <option value="excavation">{t("drawings.excavation")}</option>
                    <option value="item_count">{t("drawings.itemCount")}</option>
                  </select>
                </div>

                {/* Conditional Inputs */}
                {(transferCategory === "slab_concrete" || transferCategory === "brickwork") && (
                  <div>
                    <label className="block text-slate-300 mb-1">{t("drawings.thickness")}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={thicknessM}
                      onChange={(e) => setThicknessM(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-[#0B1E38] border border-[#24426E] rounded-lg text-white font-mono"
                    />
                  </div>
                )}

                {(transferCategory === "wall_plaster" || transferCategory === "brickwork" || transferCategory === "excavation") && (
                  <div>
                    <label className="block text-slate-300 mb-1">{t("drawings.height")}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={heightM}
                      onChange={(e) => setHeightM(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-[#0B1E38] border border-[#24426E] rounded-lg text-white font-mono"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">{t("drawings.wastage")}</label>
                    <input
                      type="number"
                      step="1"
                      value={wastagePct}
                      onChange={(e) => setWastagePct(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-[#0B1E38] border border-[#24426E] rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">{t("drawings.unitRate")}</label>
                    <input
                      type="number"
                      step="10"
                      value={unitRate}
                      onChange={(e) => setUnitRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-[#0B1E38] border border-[#24426E] rounded-lg text-white font-mono"
                    />
                  </div>
                </div>

                {/* Calculation Preview Box */}
                {derivedTransferPreview && (
                  <div className="p-3 bg-[#0B1E38] rounded-xl border border-[#24426E] space-y-1 mt-2">
                    <div className="flex justify-between text-slate-300">
                      <span>{t("drawings.calculatedQuantity")}:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {derivedTransferPreview.quantity} {derivedTransferPreview.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>{t("drawings.totalAmount")}:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatIndianCurrency(derivedTransferPreview.amount)}
                      </span>
                    </div>
                    {derivedTransferPreview.formula && (
                      <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-[#1E4374]">
                        Formula: {derivedTransferPreview.formula}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-3">
                  <button
                    onClick={() => setSelectedMeasurementForTransfer(null)}
                    disabled={transferring}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-[#1A4175] transition"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleTransferToEstimate}
                    disabled={transferring}
                    className="px-5 py-2 bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] font-bold rounded-lg transition flex items-center space-x-1.5"
                  >
                    {transferring ? (
                      <div className="w-4 h-4 border-2 border-[#102F57] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{t("drawings.transferToEstimate")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
