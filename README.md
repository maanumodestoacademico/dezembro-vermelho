# Dezembro Vermelho · Unileão (pesquisa)

Site estático (GitHub Pages) + banco e login no Supabase (gratuito).
Layout do V2, com login individual, painel administrativo e exportação em CSV.

## Como funciona
- **Participante**: cria conta (nome, campus, curso, faixa etária, e-mail, senha, consentimento), joga e vê só os próprios resultados.
- **Administrador**: vê todos os participantes e resultados, exporta CSV, sorteia entre quem concluiu um jogo e publica o conteúdo editado dos jogos.
- Cada registro fica ligado ao `user_id` de quem jogou. O banco bloqueia (RLS) o acesso aos dados de outras pessoas.

## Passo a passo
1. Crie um projeto em https://supabase.com.
2. **SQL Editor**: cole e rode `supabase/schema.sql`.
3. **Authentication > URL Configuration**: em *Site URL* coloque o endereço do GitHub Pages (ex.: `https://usuario.github.io/dezembro-vermelho/`). Mantenha a confirmação de e-mail ligada.
4. **Project Settings > API**: copie *Project URL* e a chave *anon public* para `assets/config.js`.
5. Crie um repositório no GitHub, envie estes arquivos e ative **Settings > Pages** (branch `main`, pasta `/root`).
6. Abra o site, crie sua conta e confirme o e-mail. No SQL Editor rode:
   `update public.profiles set role = 'admin' where email = 'seu@email.com';`
   Saia e entre de novo: aparece o item **Administração** no menu.
7. Teste com 2 contas de participante: cada uma deve ver só os próprios resultados.

## Antes de coletar dados reais
- Submeta o projeto ao Comitê de Ética (CEP) e coloque o link do TCLE em `config.js`.
- Dados pessoais seguem a LGPD: peça exclusão pelo painel do Supabase (Authentication > Users > excluir; os resultados somem junto).
- Planos gratuitos do Supabase têm limites de e-mails de confirmação por hora; para muitos cadastros simultâneos, configure um SMTP próprio.

## Limitações conhecidas
- Pontuação e tempo são calculados no navegador (um usuário técnico poderia forjar valores).
- Edições dos jogos feitas pelo admin ficam no navegador dele até clicar em **Publicar jogos**.
- Recuperação de senha: use *Authentication > Users > Send password recovery* no Supabase.
