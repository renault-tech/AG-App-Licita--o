'use client'

import { createContext, useContext } from 'react'

export interface OrgBranding {
  cor_primaria:  string
  brasao_url:    string | null
  nome:          string | null
  secretarias:   { id: string; nome: string }[]
}

export const DEFAULT_BRANDING: OrgBranding = {
  cor_primaria: '#112239',
  brasao_url:   null,
  nome:         null,
  secretarias:  [],
}

interface AuthBrandingContextValue {
  branding:           OrgBranding
  setBrandingByOrgId: (orgId: string) => Promise<void>
}

export const AuthBrandingContext = createContext<AuthBrandingContextValue>({
  branding:           DEFAULT_BRANDING,
  setBrandingByOrgId: async () => {},
})

export function useAuthBranding() {
  return useContext(AuthBrandingContext)
}
