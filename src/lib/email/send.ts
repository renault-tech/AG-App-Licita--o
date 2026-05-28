'use server'

import { Resend } from 'resend'

const FROM    = process.env.RESEND_FROM_EMAIL  ?? 'noreply@licitaia.com.br'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://licitaia.com.br'

export async function enviarConvitePrefeitura({
  email,
  nomePrefeitura,
  municipio,
  estado,
  token,
}: {
  email: string
  nomePrefeitura?: string
  municipio?: string
  estado?: string
  token: string
}): Promise<{ success: boolean; error?: string }> {
  const link = `${APP_URL}/cadastro/convite/${token}`
  const org  = nomePrefeitura ?? (municipio ? `${municipio}${estado ? ` (${estado})` : ''}` : 'sua prefeitura')

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="font-family:system-ui,sans-serif;background:#f4f4f5;margin:0;padding:32px 0;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">
        <div style="background:#112239;padding:28px 32px;">
          <p style="color:#fff;font-size:22px;font-weight:700;margin:0;letter-spacing:-0.5px;">LicitaIA</p>
          <p style="color:#8ca9c7;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px;">Plataforma de Licitacoes</p>
        </div>
        <div style="padding:32px;">
          <h2 style="font-size:18px;font-weight:700;color:#112239;margin:0 0 12px;">Voce foi convidado para cadastrar ${org} na plataforma LicitaIA.</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Clique no botao abaixo para concluir o registro. O link e valido por <strong>7 dias</strong>.
          </p>
          <a href="${link}" style="display:inline-block;background:#112239;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;">
            Cadastrar Prefeitura
          </a>
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;line-height:1.5;">
            Se o botao nao funcionar, copie e cole este link no navegador:<br>
            <span style="word-break:break-all;">${link}</span>
          </p>
        </div>
        <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">
            Este e-mail foi enviado pela plataforma LicitaIA. Caso nao reconheca este convite, ignore esta mensagem.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return { success: false, error: 'RESEND_API_KEY nao configurada.' }
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from:    FROM,
      to:      email,
      subject: `Convite para cadastrar ${org} no LicitaIA`,
      html,
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar e-mail.' }
  }
}
