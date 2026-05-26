"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  descricao: string
  labelConfirmar?: string
  labelCancelar?: string
  variante?: "destrutivo" | "padrao"
  onConfirmar: () => void
}

export function AlertDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  labelConfirmar = "Confirmar",
  labelCancelar = "Cancelar",
  variante = "destrutivo",
  onConfirmar,
}: AlertDialogProps) {
  function handleConfirmar() {
    onConfirmar()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labelCancelar}
          </Button>
          <Button
            variant={variante === "destrutivo" ? "destructive" : "default"}
            onClick={handleConfirmar}
          >
            {labelConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
