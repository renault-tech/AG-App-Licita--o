// Prompt para extrair a lista de itens de um texto de "Modelo de Proposta" /
// Termo de Referencia / Anexo de itens. Guardrail: extrai apenas o que esta no
// texto; nunca inventa itens, quantidades ou unidades; ignora marca e precos.

export function buildPromptExtrairItens(texto: string): string {
  const recorte = texto.slice(0, 24000) // limite de seguranca de tamanho
  return `<tarefa>
Voce recebe o texto bruto de uma lista de itens de um processo licitatorio
(ex: Anexo "Modelo de Proposta Comercial", Termo de Referencia). Extraia a lista
de itens a serem cotados.
</tarefa>

<regras>
- Retorne SOMENTE um array JSON valido, sem texto antes ou depois, sem markdown.
- Cada elemento: {"numero": number, "descricao": string, "unidade": string|null, "quantidade": number|null}.
- "numero" e o numero do item na lista (1, 2, 3...). Se nao houver, numere sequencialmente.
- "descricao" e a descricao completa do item, sem quebras de linha redundantes.
- "unidade" e a unidade de fornecimento (ex: UND, CX, PCT, LT, FRASCO). null se ausente.
- "quantidade" e a quantidade. null se ausente.
- IGNORE colunas de Marca, Valor Unitario, Valor Total e qualquer preco. NUNCA inclua precos.
- NAO invente itens. Extraia apenas os que aparecem no texto.
- Una descricoes quebradas em multiplas linhas em uma unica string.
</regras>

<texto>
${recorte}
</texto>

Responda apenas com o array JSON.`
}
