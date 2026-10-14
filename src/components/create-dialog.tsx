"use client";
import { useEffect, useRef } from "react";
export function CreateDialog({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="create-heading"
      onClose={onClose}
      onCancel={onClose}
    >
      {children}
    </dialog>
  );
}
