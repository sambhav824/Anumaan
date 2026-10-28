"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { useTranslation } from "../context/I18nContext";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDestructive = false,
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex items-start gap-4 mb-6">
        <div
          className={`p-2.5 rounded-full flex-shrink-0 ${
            isDestructive ? "bg-[#FDF2F2] text-[#C62828]" : "bg-[#FEF7EB] text-[#B86B08]"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-[#263445] font-devanagari leading-relaxed">
          {message}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE4EE]">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="btn-secondary font-devanagari"
        >
          {cancelLabel || t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`${isDestructive ? "btn-destructive" : "btn-primary"} font-devanagari`}
        >
          {loading ? t("common.loading") : confirmLabel || t("common.confirm")}
        </button>
      </div>
    </Modal>
  );
}
