'use client';

import { useState, useCallback } from 'react';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({
    title: '',
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    type: 'warning'
  });
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

  const showConfirm = useCallback((
    dialogOptions: ConfirmDialogOptions,
    onConfirmCallback: () => void
  ) => {
    setOptions(dialogOptions);
    setOnConfirm(() => onConfirmCallback);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
    }
    setIsOpen(false);
    setOnConfirm(null);
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setOnConfirm(null);
  }, []);

  return {
    isOpen,
    options,
    showConfirm,
    handleConfirm,
    handleCancel
  };
};
