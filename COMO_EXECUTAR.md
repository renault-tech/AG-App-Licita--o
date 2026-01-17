# Como Executar o Projeto

Você tem **duas opções** para executar o Legal Tech - ETP & TR Generator:

## Opção 1: Versão Standalone (RECOMENDADA PARA TESTE RÁPIDO) ✅

### Vantagens:
- ✅ **Funciona imediatamente** sem instalação
- ✅ Não precisa de npm ou Node.js
- ✅ Abre diretamente no navegador

### Como usar:
1. Abra o arquivo [standalone.html](file:///g:/Meu%20Drive/Projetos%20IA/Apps/AG%20App%20Licitação/standalone.html) em qualquer navegador moderno
2. Ou execute: `start standalone.html` no terminal

### Limitações atuais:
- ⚠️ Apenas a página Home está implementada na versão standalone
- ⚠️ Módulo ETP completo requer a Opção 2

---

## Opção 2: Versão Completa com React + Vite (VERSÃO PROFISSIONAL) 🚀

### Vantagens:
- ✅ **Todas as 13 seções do ETP** completas
- ✅ Exportação DOCX funcional
- ✅ Performance otimizada
- ✅ Hot reload durante desenvolvimento

### Pré-requisitos:
1. Instalar **Node.js** (que inclui o npm): https://nodejs.org/

### Como usar:

```bash
# 1. Instalar dependências (primeira vez)
npm install

# 2. Executar em modo desenvolvimento
npm run dev

# 3. Abrir no navegador
# O Vite abrirá automaticamente em http://localhost:3000
```

### Estrutura da Versão Completa:

```
src/
├── components/
│   ├── sections/          # 13 Seções do ETP
│   │   ├── Section01_Identificacao.jsx
│   │   ├── Section02_DadosProcesso.jsx
│   │   ├── Section03_Requisitos.jsx
│   │   ├── Section04_Alternativas.jsx
│   │   ├── Section05_DescricaoSolucao.jsx
│   │   ├── Section06_Modalidade.jsx
│   │   ├── Section07_Valores.jsx
│   │   ├── Section08_Resultados.jsx
│   │   ├── Section09_Providencias.jsx
│   │   ├── Section10_Correlatas.jsx
│   │   ├── Section11_Impactos.jsx
│   │   ├── Section12_Viabilidade.jsx
│   │   └── Section13_Riscos.jsx
│   ├── navigation/        # Stepper e ProgressBar
│   └── forms/            # Componentes de formulário
├── store/                # Zustand state management
├── utils/                # Exportação e conversão
└── pages/                # Home e ETPModule
```

---

## 🎯 Funcionalidades Disponíveis

### Versão Standalone (standalone.html)
- [x] Página Home profissional
- [x] Design responsivo
- [ ] Módulo ETP (em desenvolvimento)

### Versão Completa (npm run dev)
- [x] **13 Seções do ETP** totalmente funcionais
- [x] **Validação automática** de campos obrigatórios
- [x] **Stepper visual** com progresso
- [x] **Lógica condicional** entre seções
- [x] **Auto-fill inteligente** (Seção 5 ← Seção 6)
- [x] **Conversão numérica** para extenso
- [x] **Persistência** no navegador (localStorage)
- [x] **Exportação DOCX** formatada
- [ ] Exportação PDF (em desenvolvimento)
- [ ] Módulo TR (planejado)

---

## 🔧 Resolução de Problemas

### "npm não reconhecido"
**Solução:** Instale o Node.js de https://nodejs.org/

### "Porta 3000 já em uso"
**Solução:** O Vite usará outra porta automaticamente (ex: 3001)

### Erro ao instalar dependências
**Solução:** Execute `npm install --force`

---

## 📖 Documentação Adicional

- [README.md](file:///g:/Meu%20Drive/Projetos%20IA/Apps/AG%20App%20Licitação/README.md) - Documentação completa do projeto
- [Walkthrough](file:///C:/Users/danre/.gemini/antigravity/brain/597fe782-fe01-43b3-a83e-8c2a5e1037fc/walkthrough.md) - Detalhes da implementação
- [Implementation Plan](file:///C:/Users/danre/.gemini/antigravity/brain/597fe782-fe01-43b3-a83e-8c2a5e1037fc/implementation_plan.md) - Arquitetura técnica

---

## ✨ Status

| Aspecto | Standalone | Versão Completa |
|---------|-----------|----------------|
| **Instalação** | ✅ Instantânea | ⚙️ Requer npm |
| **Módulo ETP** | 🔄 Em dev | ✅ Completo |
| **Exportação** | ❌ N/A | ✅ DOCX |
| **Performance** | ⚡ Boa | ⚡⚡ Excelente |
| **Recomendado para** | Teste rápido | Uso profissional |

---

**Última Atualização:** 17/01/2026  
**Versão:** 1.0.0
