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
            isDestructive ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-anumaan-charcoal-700 font-devanagari leading-relaxed">
          {message}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-anumaan-border-light">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 rounded-md border border-anumaan-border text-sm font-medium text-anumaan-charcoal-700 hover:bg-anumaan-beige-50 transition-colors font-devanagari"
        >
          {cancelLabel || t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors font-devanagari ${
            isDestructive
              ? "bg-red-600 hover:bg-red-700"
              : "bg-anumaan-charcoal-900 hover:bg-anumaan-charcoal-800"
          }`}
        >
          {loading ? t("common.loading") : confirmLabel || t("common.confirm")}
        </button>
      </div>
    </Modal>
  );
}
