'use client'

import { useEffect } from 'react'
import { useTheme, type ThemeName } from '@/lib/theme/provider'

interface OrgThemeApplicatorProps {
  temaOrg: ThemeName
}

/**
 * Aplica o tema padrao da organizacao quando o usuario nao tem preferencia
 * salva em localStorage (primeiro acesso no dispositivo).
 * Se o usuario ja tiver escolhido um tema, o localStorage prevalece.
 */
export function OrgThemeApplicator({ temaOrg }: OrgThemeApplicatorProps) {
  const { setTheme } = useTheme()

  useEffect(() => {
    const savedTheme = localStorage.getItem('licita-theme') as ThemeName | null
    if (!savedTheme) {
      setTheme(temaOrg)
    }
  }, [temaOrg, setTheme])

  return null
}
