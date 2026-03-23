

## Plano: Inserir credenciais Supabase diretamente no código

Como a anon key é uma chave pública (segura para o frontend), vamos inserir as credenciais diretamente no arquivo `src/integrations/supabase/client.ts`.

### Alteração

**Arquivo:** `src/integrations/supabase/client.ts`

- Substituir a leitura de `import.meta.env` por valores fixos:
  - `SUPABASE_URL` = `https://supabase.projautomacao.com.br`
  - `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE`
- Remover a validação de variáveis de ambiente (o `if` com `throw`)
- Manter o `createClient` e export iguais

Isso resolve o problema de não conseguir configurar as environment variables na plataforma, já que a anon key é pública e segura para ficar no código frontend.

