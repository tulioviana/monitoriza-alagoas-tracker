import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { usePlan } from '@/contexts/PlanContext'
import { Badge } from '@/components/ui/badge'
import { Lock } from 'lucide-react'

interface ExportButtonProps {
  onExport: () => void
  isExporting?: boolean
  disabled?: boolean
  className?: string
  label?: string
  icon?: React.ReactNode
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const ExportButton = ({
  onExport,
  isExporting = false,
  disabled = false,
  className,
  label = "Exportar para Excel",
  icon,
  variant = "outline",
  size = "default"
}: ExportButtonProps) => {
  const handleExport = () => {
    if (!isExporting && !disabled) {
      onExport()
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting}
      variant={variant}
      size={size}
      className={cn(
        "transition-all duration-200",
        isExporting && "cursor-not-allowed opacity-70",
        className
      )}
    >
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        icon || <FileSpreadsheet className="mr-2 h-4 w-4" />
      )}
      {isExporting ? "Exportando..." : label}
    </Button>
  )
}

interface ExportDropdownProps {
  onExportExcel: () => void
  isExporting?: boolean
  disabled?: boolean
  className?: string
  resultCount?: number
}

export const ExportDropdown = ({
  onExportExcel,
  isExporting = false,
  disabled = false,
  className,
  resultCount = 0
}: ExportDropdownProps) => {
  const { isPro } = usePlan()

  if (!isPro) {
    return (
      <Button
        variant="outline"
        size="default"
        disabled
        className={cn(
          "transition-all duration-200",
          className,
          "relative pr-8"
        )}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Exportar
        <Badge
          variant="secondary"
          className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white flex items-center gap-1"
        >
          PRO <Lock className="h-2.5 w-2.5" />
        </Badge>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="default"
          disabled={disabled || isExporting || resultCount === 0}
          className={cn(
            "transition-all duration-200",
            className
          )}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-1 h-4 w-4" />
          )}
          {isExporting ? "Exportando..." : "Exportar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={onExportExcel}
          disabled={isExporting || resultCount === 0}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>Excel (.xlsx)</span>
            <span className="text-xs text-muted-foreground">
              {resultCount} resultado{resultCount !== 1 ? 's' : ''}
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}