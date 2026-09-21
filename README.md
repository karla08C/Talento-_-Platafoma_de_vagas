# Talento Conecta — Plataforma de Recrutamento e Seleção

O **Talento Conecta** é uma plataforma moderna e completa voltada para processos de Recrutamento & Seleção (R&S). Desenvolvida para aproximar empresas e profissionais, ela permite que o time de RH publique vagas abertas e gerencie candidaturas, enquanto os profissionais encontram oportunidades, se cadastram e enviam seus currículos online de forma rápida e segura.

---

##  Sumário

- [Visão Geral](#-visão-geral)
- [O que a plataforma faz hoje](#-o-que-a-plataforma-faz-hoje)
- [O que ainda está em construção (Roadmap)](#-o-que-ainda-está-em-construção-roadmap)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura e Segurança de Dados](#-arquitetura-e-segurança-de-dados)
- [Como Rodar o Projeto Localmente](#-como-rodar-o-projeto-localmente)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Scripts Disponíveis](#-scripts-disponíveis)

---

##  Visão Geral

A plataforma foi arquitetada como uma Single Page Application (SPA) com Server-Side Rendering (SSR) híbrido utilizando **TanStack Start**, **React 19** e **Supabase**. O objetivo central é fornecer uma experiência fluida para os candidatos e uma estrutura robusta e segura para os recrutadores.

---

##  O Que a Plataforma Faz Hoje:

Atualmente, o fluxo principal de atração e candidatura está **100% funcional**:

### 1. Portal Público de Vagas e Filtros Avançados

- **Identidade Visual Laranja:** Design moderno e acolhedor com paleta em tons quentes de laranja e âmbar, gradientes elegantes e sombras suaves.
- **Busca por Cargo e Localização:** Barra de pesquisa dupla com campos dedicados para cargo/tecnologia e cidade/estado/região, com sugestões rápidas de cidades.
- **Filtro por Modalidade de Trabalho:** Seletores para vagas **Remoto**, **Híbrido** e **Presencial** com ícones informativos.
- **Filtro por Regime de Contratação:** Filtro ágil por **CLT**, **PJ** e **Estágio**.
- **Filtro por Departamento:** Seleção por área de atuação (_Tecnologia_, _Recursos Humanos_, _Dados_, _Marketing_, etc.).
- **Tags de Filtros Ativos e Limpeza Rápida:** Exibição dinâmica dos filtros aplicados com remoção individual (`✕`) e botão de reset geral.
- **Cards Informativos:** Apresentação clara com badges estilizadas de modalidade, regime de contratação, senioridade, faixa salarial e data de publicação.

### 2. Detalhes da Vaga (`/vagas/:jobId`)

- Página individual para cada vaga com descrição completa das atribuições e requisitos técnicos/comportamentais.
- Identificação da modalidade de trabalho (Remoto, Híbrido, Presencial).
- Botão de inscrição direta com verificação de autenticação prévia.

### 3. Sistema de Autenticação e Sessão (`/auth`)

- **Cadastro de Candidato:** Formulário com validação rígida via Zod (nome completo, e-mail e senha de no mínimo 8 caracteres).
- **Login:** Autenticação segura por e-mail e senha gerenciada pelo Supabase Auth.
- **Login Social (OAuth):** Integração nativa para login direto com conta Google.
- **Redirecionamento Inteligente:** Candidatos não logados que tentam se inscrever em uma vaga são enviados para o login e, ao autenticarem, retornam automaticamente à vaga em questão.
- **Perfil de Acesso Inicial:** Todo novo usuário cadastrado recebe automaticamente o papel de `candidate` via gatilho (_trigger_) no banco de dados.

### 4. Formulário de Candidatura e Envio de Currículo

- Formulário validado com campos de contato (nome, e-mail, telefone) e carta de apresentação de até 2.000 caracteres.
- **Upload de Currículo:** Aceita arquivos nos formatos `.pdf`, `.doc` e `.docx` de até 10 MB.
- **Armazenamento em Nuvem:** Os currículos são enviados diretamente para o bucket seguro `resumes` no Supabase Storage, isolados na pasta do respectivo candidato (`{userId}/{jobId}-{timestamp}.ext`).
- **Prevenção de Duplicidade:** O sistema valida no banco e na interface se o candidato já se inscreveu na vaga, bloqueando submissões repetidas.

---

## O Que Ainda Está em Construção (Roadmap)

Os seguintes módulos e funcionalidades estão planejados ou em desenvolvimento:

### 1. Painel do Candidato — Minhas Candidaturas (`/minhas-candidaturas`)

- [ ] Listagem de todas as vagas em que o candidato se inscreveu.
- [ ] Acompanhamento do status da candidatura em tempo real:
  - `received` (Recebido)
  - `screening` (Em triagem)
  - `interview` (Entrevista)
  - `offer` (Proposta)
  - `rejected` (Não selecionado)
- [ ] Visualização do currículo enviado e opção de cancelar candidatura.

### 2. Painel Administrativo do RH (`/rh`)

- [ ] **Gestão de Vagas:**
  - Formulário completo para criar novas oportunidades (título, departamento, tipo de contrato, salário, requisitos).
  - Edição de vagas existentes.
  - Encerramento manual de vagas (`open` ➔ `closed`).
- [ ] **Gestão de Candidaturas (Funil de R&S):**
  - Lista e visualização em colunas (estilo Kanban) dos candidatos inscritos por vaga.
  - Leitura das cartas de apresentação e download dos currículos armazenados.
  - Alteração de etapas do processo seletivo do candidato.
  - Registro de notas e avaliações internas sobre cada candidato.

### 3. Perfil do Usuário (`/perfil`)

- [ ] Edição dos dados cadastrais (telefone, cidade, link do LinkedIn e portfólio).
- [ ] Possibilidade de salvar um currículo padrão para candidaturas rápidas.

### 4. Comunicação e Notificações

- [ ] Disparo de e-mails transacionais notificando o candidato sobre o recebimento da inscrição.
- [ ] Notificação automática quando o status da candidatura for alterado pelo RH.

---

##  Tecnologias Utilizadas

O projeto utiliza um ecossistema moderno, rápido e com tipagem estática ponta a ponta:

| Camada                      | Tecnologia                                                                           | Finalidade                                                        |
| --------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Frontend**                | [React 19](https://react.dev)                                                        | Biblioteca para construção de interfaces reativas                 |
| **Framework & Router**      | [TanStack Start](https://tanstack.com/start) & [Router](https://tanstack.com/router) | Roteamento baseado em arquivos com tipagem estática e suporte SSR |
| **Gerenciamento de Estado** | [TanStack Query v5](https://tanstack.com/query)                                      | Cache, sincronização e busca de dados assíncronos                 |
| **Estilização**             | [Tailwind CSS v4](https://tailwindcss.com)                                           | Estilização utilitária moderna e responsiva                       |
| **Componentes de UI**       | [Radix UI](https://www.radix-ui.com) / Shadcn UI                                     | Primitivos de acessibilidade (Diálogos, Abas, Cards, etc.)        |
| **Ícones**                  | [Lucide React](https://lucide.dev)                                                   | Ícones vetoriais leves e consistentes                             |
| **Validação**               | [Zod](https://zod.dev)                                                               | Validação rigorosa de esquemas de formulários                     |
| **Feedback**                | [Sonner](https://sonner.emilkowal.ski/)                                              | Notificações tipo _toast_ elegantes                               |
| **Backend & Banco**         | [Supabase](https://supabase.com)                                                     | PostgreSQL, Autenticação JWT, Storage e RLS                       |
| **Build & Bundler**         | [Vite 8](https://vite.dev)                                                           | Compilação e servidor de desenvolvimento ultrarrápido             |
| **Gerenciador de Pacotes**  | [Bun](https://bun.sh) / [npm](https://www.npmjs.com)                                 | Instalação e execução de dependências                             |

---

## 🔒 Arquitetura e Segurança de Dados

O banco de dados PostgreSQL no Supabase conta com **Row Level Security (RLS)** ativo em todas as tabelas:

- **`jobs`**: Leitura pública para vagas abertas (`status = 'open'`); inserção, edição e exclusão restritas a usuários com papel `hr` ou `admin`.
- **`applications`**: Candidatos podem visualizar e gerenciar apenas suas próprias inscrições; recrutadores (`hr`) têm permissão para visualizar todas.
- **`profiles` & `user_roles`**: Perfis atrelados a `auth.users`, com funções de checagem seguras (`is_hr()`, `has_role()`).
- **`storage.objects` (bucket `resumes`)**: Upload restrito a usuários autenticados em sua própria pasta (`auth.uid()`); leitura permitida apenas ao próprio candidato e aos recrutadores autorizados.

---

## Como Rodar o Projeto Localmente

### Pré-requisitos

- **Node.js** (versão 20 ou superior) ou **Bun** (versão 1.1 ou superior).
- Uma conta no **Supabase** (ou instância local do Supabase).

### Passo a Passo

1. **Clone o repositório:**

   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd recruit-sparkle-one
   ```

2. **Configure as Variáveis de Ambiente:**
   Crie ou edite o arquivo `.env` na raiz do projeto:

   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-publica
   ```

3. **Instale as dependências:**
   Com **Bun**:

   ```bash
   bun install
   ```

   _Ou com **npm**:_

   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento:**
   Com **Bun**:

   ```bash
   bun run dev
   ```

   _Ou com **npm**:_

   ```bash
   npm run dev
   ```

5. **Acesse no navegador:**
   Abra [http://localhost:8080](http://localhost:8080).

---

##  Scripts Disponíveis

| Comando                           | Descrição                                                     |
| --------------------------------- | ------------------------------------------------------------- |
| `npm run dev` / `bun run dev`     | Inicia o servidor Vite em modo de desenvolvimento             |
| `npm run build` / `bun run build` | Compila o bundle otimizado para produção                      |
| `npm run preview`                 | Executa localmente o bundle compilado para validação          |
| `npm run lint`                    | Executa o ESLint para verificar padrões e problemas no código |
| `npm run format`                  | Executa o Prettier para formatar todos os arquivos do projeto |

---

Desenvolvido para conectar talentos às melhores oportunidades profissionais.
