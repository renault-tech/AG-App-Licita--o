'use server'

import { createClient } from '@/lib/supabase/server'
import { executarIAComCreditos } from '@/lib/ai/wrapper'

const BUCKET = 'documentos-base'

export type DocumentoBase = {
  id: string
  titulo: string
  descricao: string | null
  tipo_documento: string
  modalidade: string | null
  formato: string
  tamanho_bytes: number | null
  status: 'pendente' | 'analisando' | 'processado' | 'erro'
  clausulas_count: number
  erro_mensagem: string | null
  processado_em: string | null
  criado_em: string
  storage_path: string
}

export async function listarDocumentosBase(): Promise<{ success: boolean; dados?: DocumentoBase[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('documentos_base')
    .select('id, titulo, descricao, tipo_documento, modalidade, formato, tamanho_bytes, status, clausulas_count, erro_mensagem, processado_em, criado_em, storage_path')
    .order('criado_em', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, dados: data ?? [] }
}

export async function uploadDocumentoBase(formData: FormData): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if ((usuarioData as any)?.papel !== 'admin_plataforma') {
    return { success: false, error: 'Acesso negado.' }
  }

  const arquivo = formData.get('arquivo') as File | null
  const titulo = formData.get('titulo') as string
  const descricao = formData.get('descricao') as string | null
  const tipoDocumento = formData.get('tipo_documento') as string
  const modalidade = formData.get('modalidade') as string | null

  if (!arquivo || !titulo || !tipoDocumento) {
    return { success: false, error: 'Campos obrigatorios ausentes.' }
  }

  const ext = arquivo.name.split('.').pop()?.toLowerCase()
  if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
    return { success: false, error: 'Formato invalido. Use PDF, DOCX ou TXT.' }
  }

  const storagePath = `${Date.now()}_${arquivo.name.replace(/\s+/g, '_')}`
  const bytes = await arquivo.arrayBuffer()

  // Garante que o bucket existe
  await (supabase as any).storage.createBucket(BUCKET, { public: false }).catch(() => {})

  const { error: uploadError } = await (supabase as any).storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: arquivo.type, upsert: false })

  if (uploadError) return { success: false, error: `Erro no envio: ${uploadError.message}` }

  const { data: docData, error: insertError } = await (supabase as any)
    .from('documentos_base')
    .insert({
      criado_por: user.id,
      titulo: titulo.trim(),
      descricao: descricao?.trim() || null,
      tipo_documento: tipoDocumento,
      modalidade: modalidade || null,
      storage_path: storagePath,
      formato: ext,
      tamanho_bytes: arquivo.size,
      status: 'pendente',
    })
    .select('id')
    .single()

  if (insertError) return { success: false, error: insertError.message }

  return { success: true, id: docData.id }
}

export async function analisarDocumentoBase(documentoId: string): Promise<{ success: boolean; clausulas?: number; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: doc } = await (supabase as any)
    .from('documentos_base')
    .select('*')
    .eq('id', documentoId)
    .maybeSingle()

  if (!doc) return { success: false, error: 'Documento nao encontrado.' }
  if (doc.status === 'analisando') return { success: false, error: 'Analise ja em andamento.' }

  // Marcar como analisando
  await (supabase as any)
    .from('documentos_base')
    .update({ status: 'analisando' })
    .eq('id', documentoId)

  try {
    // Baixar o arquivo do Storage
    const { data: fileData, error: downloadError } = await (supabase as any).storage
      .from(BUCKET)
      .download(doc.storage_path)

    if (downloadError) throw new Error(`Falha ao baixar arquivo: ${downloadError.message}`)

    const buffer = Buffer.from(await (fileData as Blob).arrayBuffer())
    let conteudoTexto = ''

    if (doc.formato === 'txt') {
      conteudoTexto = buffer.toString('utf-8')
    } else if (doc.formato === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      conteudoTexto = result.value
    } else if (doc.formato === 'pdf') {
      // pdf-parse e CommonJS, require e a forma correta de importar
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
      const result = await pdfParse(buffer)
      conteudoTexto = result.text
    }

    if (!conteudoTexto.trim()) throw new Error('Nao foi possivel extrair texto do arquivo.')

    // Limitar para nao exceder contexto da IA
    const textoParaAnalise = conteudoTexto.slice(0, 12000)

    const TIPO_LABEL: Record<string, string> = {
      dfd: 'DFD (Documento de Formalizacao da Demanda)',
      etp: 'ETP (Estudo Tecnico Preliminar)',
      tr: 'Termo de Referencia',
      edital: 'Edital de Licitacao',
      parecer: 'Parecer Juridico',
      mapa_riscos: 'Mapa de Riscos',
      geral: 'documento licitatorio',
    }

    const prompt = `Voce e um especialista em licitacoes publicas brasileiras (Lei 14.133/21).

Analise o seguinte ${TIPO_LABEL[doc.tipo_documento] ?? 'documento'} e extraia clausulas e textos reutilizaveis para uma base de conhecimento.

<documento>
${textoParaAnalise}
</documento>

Extraia de 3 a 15 clausulas relevantes. Para cada clausula, identifique:
- tipo_campo: nome do campo/secao (ex: objeto, justificativa_necessidade, requisitos_contratacao, fundamentacao, modelo_execucao, etc.)
- texto: o texto da clausula, limpo e em linguagem institucional formal conforme Lei 14.133/21
- aplicavel_para: tipo de documento mais adequado (dfd, etp, tr, edital, geral)

Responda APENAS com JSON valido neste formato exato, sem texto adicional:
{
  "clausulas": [
    {
      "tipo_campo": "nome_do_campo",
      "texto": "texto da clausula...",
      "aplicavel_para": "tr"
    }
  ]
}`

    const resIA = await executarIAComCreditos({ prompt, tipoAcao: 'gerar_documento', temperature: 0.1 })
    if (!resIA.success) throw new Error(resIA.error)
    const textoJSON = resIA.texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let clausulas: Array<{ tipo_campo: string; texto: string; aplicavel_para: string }> = []
    try {
      const parsed = JSON.parse(textoJSON)
      clausulas = Array.isArray(parsed.clausulas) ? parsed.clausulas : []
    } catch {
      throw new Error('IA retornou formato invalido.')
    }

    // Inserir clausulas extraidas em clausulas_padrao com fonte = upload_admin
    let inseridas = 0
    for (const c of clausulas) {
      if (!c.tipo_campo || !c.texto) continue
      const docAlvo = c.aplicavel_para && ['dfd', 'etp', 'tr'].includes(c.aplicavel_para)
        ? c.aplicavel_para
        : doc.tipo_documento === 'geral' ? 'tr' : doc.tipo_documento

      if (!['dfd', 'etp', 'tr'].includes(docAlvo)) continue

      await (supabase as any)
        .from('clausulas_padrao')
        .upsert({
          tipo_campo: c.tipo_campo,
          documento: docAlvo,
          modalidade: doc.modalidade ?? null,
          texto_template: c.texto.trim(),
          variaveis: [],
          ativo: true,
          fonte: 'upload_admin',
          documento_base_id: documentoId,
        }, {
          onConflict: 'documento,tipo_campo,modalidade,categoria_objeto',
          ignoreDuplicates: false,
        })
      inseridas++
    }

    await (supabase as any)
      .from('documentos_base')
      .update({
        status: 'processado',
        conteudo_extraido: conteudoTexto.slice(0, 5000),
        clausulas_count: inseridas,
        processado_em: new Date().toISOString(),
      })
      .eq('id', documentoId)

    return { success: true, clausulas: inseridas }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
    await (supabase as any)
      .from('documentos_base')
      .update({ status: 'erro', erro_mensagem: msg })
      .eq('id', documentoId)
    return { success: false, error: msg }
  }
}

export async function excluirDocumentoBase(documentoId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: doc } = await (supabase as any)
    .from('documentos_base')
    .select('storage_path')
    .eq('id', documentoId)
    .maybeSingle()

  if (!doc) return { success: false, error: 'Documento nao encontrado.' }

  await (supabase as any).storage.from(BUCKET).remove([doc.storage_path])
  await (supabase as any).from('documentos_base').delete().eq('id', documentoId)

  return { success: true }
}