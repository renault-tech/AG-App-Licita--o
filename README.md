# Legal Tech - ETP & TR Generator

Plataforma profissional para geração de documentos de licitação conforme Lei 14.133/2021.

## 📋 Sobre o Projeto

Sistema web para criação de **Estudos Técnicos Preliminares (ETP)** e **Termos de Referência (TR)** de forma estruturada, com validação automática e exportação em formatos DOCX e PDF.

## 🚀 Tecnologias

-React 18+ com Vite
- **Tailwind CSS** para estilização
- **Zustand** para gerenciamento de estado
- **docx** para exportação DOCX
- **jspdf** para exportação PDF
- **Lucide React** para ícones

## 📦 Instalação

Como o npm não está disponível no sistema, as dependências precisarão ser instaladas manualmente ou o projeto pode ser aberto diretamente se todas as dependências estiverem no `package.json`.

Se o npm estiver disponível:

```bash
npm install
npm run dev
```

## 🎯 Funcionalidades

### Módulo ETP (Implementado)
- ✅ **13 Seções Estruturadas** com navegação intuitiva
- ✅ **Validação em Tempo Real** de campos obrigatórios
- ✅ **Stepper Visual** mostrando progresso
- ✅ **Lógica Condicional** complexa entre seções
- ✅ **Auto-fill Inteligente** (Seção 5 baseada em Seção 6)
- ✅ **Conversão Automática** de valores para extenso
- ✅ **Tooltips Contextuais** em cada campo
- ✅ **Persistência Local** (salva automaticamente no navegador)
- ✅ **Exportação DOCX** formatada profissionalmente
- 🔄 **Exportação PDF** (em desenvolvimento)

### Módulo TR
- 🔜 Em desenvolvimento

## 📖 Estrutura das Seções

1. **Identificação** - Dados básicos da contratação
2. **Dados do Processo** - Descrição da necessidade
3. **Requisitos** - Subcontratação, sustentabilidade, garantia
4. **Alternativas** - Análise de opções
5. **Descrição da Solução** - Detalhamento da escolha
6. **Modalidade** - Tipo de licitação e julgamento
7. **Valores** - Estimativa financeira
8. **Resultados** - Objetivos esperados
9. **Providências** - Ações necessárias
10. **Correlatas** - Outras contratações relacionadas
11. **Impactos Ambientais** - Avaliação de impactos
12. **Viabilidade** - Conclusão de viabilidade
13. **Análise de Risco** - Identificação e mitigação

## 🎨 Interface

- Design moderno e profissional
- Cores governamentais (azul e verde)
- Cards informativos em cada seção
- Feedback visual de validação
- Responsivo (desktop, tablet, mobile)

## 📄 Exportação

Os documentos gerados seguem padrões profissionais:
- Formatação Arial/Times, tamanho 12
- Texto justificado
- Cabeçalhos estruturados
- Lógica condicional (campos opcionais não aparecem se vazios)

## 🔧 Como Usar

1. Abra o arquivo `index.html` no navegador
2. Escolha "Estudo Técnico Preliminar (ETP)"
3. Preencha as 13 seções sequencialmente
4. Acompanhe seu progresso no Stepper
5. Ao finalizar, clique em "Exportar DOCX"

## 📝 Licença

Desenvolvido em conformidade com a Lei 14.133/2021 - Nova Lei de Licitações.

---

**Versão:** 1.0.0  
**Última Atualização:** Janeiro 2026
