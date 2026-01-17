# 🚀 Guia de Instalação - Node.js e Execução do Projeto

## ⚠️ Situação Atual

Você abriu o arquivo `standalone.html` e viu a mensagem: *"A versão standalone está sendo preparada..."*

**Motivo:** A versão standalone tem apenas a página inicial. Para acessar **todas as 13 seções do ETP**, você precisa executar a versão completa com npm.

---

## 📥 Passo 1: Instalar Node.js (inclui npm)

### Option A: Download Direto (RECOMENDADO)

1. **Acesse:** https://nodejs.org/
2. **Baixe** a versão **LTS** (Long Term Support) - botão verde grande
3. **Execute** o instalador baixado
4. **Durante a instalação:**
   - ✅ Aceite todas as opções padrão
   - ✅ Marque a opção "Automatically install necessary tools" (se aparecer)
5. **Reinicie** o PowerShell/Terminal após a instalação

### Option B: Usando Winget (se disponível)

```powershell
winget install OpenJS.NodeJS.LTS
```

---

## ✅ Passo 2: Verificar Instalação

Após instalar, **abra um NOVO PowerShell** e execute:

```powershell
node --version
npm --version
```

Você deve ver algo como:
```
v20.11.0
10.2.4
```

---

## 🎯 Passo 3: Executar o Projeto

Navegue até a pasta do projeto e instale as dependências:

```powershell
cd "g:\Meu Drive\Projetos IA\Apps\AG App Licitação"
npm install
```

Isso vai instalar todas as bibliotecas necessárias (React, Tailwind, Zustand, etc.)

**Aguarde:** Pode demorar 2-5 minutos dependendo da internet.

---

## 🚀 Passo 4: Iniciar o Servidor

Após a instalação das dependências:

```powershell
npm run dev
```

Você verá algo como:

```
  VITE v5.1.0  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

O navegador deve abrir automaticamente em `http://localhost:3000`

---

## 🎉 Pronto!

Agora você terá acesso à **versão completa** com:

- ✅ **13 Seções do ETP** totalmente funcionais
- ✅ **Stepper visual** de progresso
- ✅ **Validação automática** de campos
- ✅ **Lógica condicional** entre seções
- ✅ **Auto-fill inteligente**
- ✅ **Conversão para extenso**
- ✅ **Exportação DOCX**
- ✅ **Persistência automática**

---

## 🔧 Solução de Problemas

### "npm install" falha

**Solução 1:** Limpe o cache
```powershell
npm cache clean --force
npm install
```

**Solução 2:** Use --force
```powershell
npm install --force
```

### Porta 3000 já em uso

O Vite automaticamente usará outra porta (3001, 3002, etc.)

### Erro de permissão

Execute o PowerShell como Administrador

---

## 📊 Comparação das Versões

| Recurso | standalone.html | Versão npm (Completa) |
|---------|----------------|----------------------|
| Instalação | ✅ Imediata | ⚙️ Requer Node.js |
| Todas 13 seções ETP | ❌ Não | ✅ **Sim** |
| Validação automática | ❌ Não | ✅ **Sim** |
| Exportação DOCX | ❌ Não | ✅ **Sim** |
| Stepper visual | ❌ Não | ✅ **Sim** |
| Performance | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 💡 Dica Rápida

Se você já tiver o Node.js instalado em outro computador, pode simplesmente:

1. Copiar a pasta `node_modules` (após rodar `npm install` lá)
2. Colar na pasta do projeto neste computador
3. Executar `npm run dev`

---

## 📞 Precisa de Ajuda?

Se encontrar algum erro durante a instalação, me avise! Posso ajudar a resolver.

---

**Próximo comando:** `node --version` (para verificar se instalou)
