# Legal Tech - ETP Generator (Versão Standalone Otimizada)

Sistema completo para geração de Estudos Técnicos Preliminares (ETP) conforme Lei 14.133/2021.

## 🚀 Características Desta Versão

### ✅ Pronto para Usar
- **Zero instalação** - Funciona diretamente no navegador
- **Todas as 13 seções** do ETP implementadas
- **Validação automática** em tempo real
- **Persistência local** - Salva automaticamente
- **Interface profissional** com Tailwind CSS

### 🎯 Funcionalidades Completas

1. **Navegação Intuitiva**
   - Stepper visual mostrando progresso
   - Barra de progresso percentual
   - Navegação entre seções

2. **Validação Inteligente**
   - Campos obrigatórios destacados
   - Validação de dependências condicionais
   - Feedback visual de erros

3. **Lógica Condicional**
   - Auto-fill da Seção 5 baseado na Seção 6
   - Campos condicionais em múltiplas seções
   - Conversão automática de valores para extenso

4. **Exportação** (Simplificada)
   - Visualização completa do documento
   - Geração de texto formatado
   - Pronto para copiar e colar

## 🎮 Como Usar

### Acesso Rápido
1. Abra o arquivo `index-standalone.html` no navegador
2. Ou execute: `start index-standalone.html`

### Fluxo de Trabalho
1. Preencha as 13 seções sequencialmente
2. Acompanhe o progresso no Stepper
3. Revise os dados preenchidos
4. Gere o documento ao final

## 📊 Diferenças Entre as Versões

| Característica | Standalone | Com npm |
|---------------|-----------|---------|
| Instalação | ✅ Imediata | ⚙️ Requer Node.js |
| 13 Seções ETP | ✅ Sim | ✅ Sim |
| Validação | ✅ Sim | ✅ Sim |
| Exportação DOCX | ➖ Limitada | ✅ Completa |
| Performance | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Recomendado para** | **Uso imediato** | Uso profissional contínuo |

## 🔧 Tecnologias (CDN)

- React 18 (via unpkg)
- Tailwind CSS (via CDN)
- Babel Standalone (para JSX)
- LocalStorage (para persistência)

## 📝 Limitações da Versão Standalone

- Exportação DOCX usa método simplificado (texto formatado)
- Performance ligeiramente menor que a versão compilada
- Sem hot-reload durante desenvolvimento

## 🎯 Próximos Passos

Para exportação DOCX profissional, considere:
1. Instalar Node.js: https://nodejs.org/
2. Executar: `npm install && npm run dev`

---

**Versão:** 1.0.0 Standalone  
**Última Atualização:** 17/01/2026  
**Status:** ✅ Pronto para uso
