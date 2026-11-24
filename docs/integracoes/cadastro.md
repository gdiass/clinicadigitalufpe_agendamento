# Integração com o Cadastro (Time 01)

A Agenda precisa de dados de pacientes, profissionais, serviços e clínicas, que pertencem ao microsserviço Cadastro (Time 01). Enquanto a API do Cadastro não existe, o backend usa dados fictícios. Para trocar pela API real, basta mudar uma variável de ambiente.

## Como funciona

O backend nunca chama o Cadastro diretamente. Ele pede os dados a uma interface, `CadastroProvider`, e o módulo escolhe qual implementação entregar:

| Arquivo | Papel |
| :--- | :--- |
| `apps/api/src/cadastro/cadastro.provider.ts` | Interface `CadastroProvider`, tipos dos dados e o token de injeção `CADASTRO_PROVIDER_TOKEN` |
| `apps/api/src/cadastro/cadastro.mock.ts` | Implementação com dados fictícios (Semana 06) |
| `apps/api/src/cadastro/cadastro.http.ts` | Implementação que chamará `CADASTRO_API_URL`. Hoje lança `NotImplementedException` (HTTP 501) |
| `apps/api/src/cadastro/cadastro.module.ts` | Escolhe a implementação lendo `CADASTRO_PROVIDER` |
| `apps/api/src/cadastro/cadastro.controller.ts` | Rotas de leitura expostas para as telas |

## Variáveis de ambiente

| Variável | Valores | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `CADASTRO_PROVIDER` | `mock` ou `http` | `mock` | Escolhe a implementação. Qualquer outro valor impede a API de iniciar |
| `CADASTRO_API_URL` | URL | (vazia) | Endereço da API do Cadastro. Só é usada com `CADASTRO_PROVIDER=http` |

Trocar de `mock` para `http` não exige mudança no front-end, que usa apenas o cliente gerado por `pnpm api:generate`.

## Rotas expostas pela Agenda

Todas exigem autenticação via Shell, como as demais rotas.

| Rota | Descrição |
| :--- | :--- |
| `GET /api/v1/cadastro/profissionais` | Lista os profissionais (filtros da T01 e T09) |
| `GET /api/v1/cadastro/servicos` | Lista os serviços (filtros da T01 e T09) |
| `GET /api/v1/cadastro/clinicas` | Lista as clínicas (filtros da T01 e T09) |

A busca de paciente não tem rota nesta tarefa. Ela será exposta na DS-17, usando `buscarPacientes(termo)` e `obterPaciente(id)`, que já existem na interface.

## Campos que esperamos do Time 01

**[VALIDAR COM TIME 01]**: os campos abaixo são a nossa suposição do mínimo necessário. O contrato real ainda não foi publicado.

**Paciente**

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| `id` | UUID | sim | Identificador usado como chave lógica em `agendamentos.paciente_id` |
| `nome` | texto | sim | Usado na busca por nome parcial |
| `dataNascimento` | texto `AAAA-MM-DD` | sim | Ajuda a distinguir homônimos. Formato a confirmar |
| `cns` | texto | não | Cartão Nacional de Saúde. Nem todo paciente tem |

**Profissional, Serviço e Clínica**

| Campo | Tipo | Obrigatório |
| :--- | :--- | :--- |
| `id` | UUID | sim |
| `nome` | texto | sim |

Perguntas em aberto para o Time 01:
- A API vai paginar as listas de profissionais, serviços e clínicas?
- Como a busca de paciente trata acentos, homônimos e termos curtos?
- Como a Agenda se autentica na API do Cadastro?
- O que a API devolve quando um id não existe (404 ou lista vazia)?

## Dados fictícios (mock)

Os UUIDs são os mesmos do seed da DS-61 (`apps/api/prisma/seed.mjs`), para que as referências entre Agenda e Cadastro fiquem consistentes em desenvolvimento.

| Entidade | UUID |
| :--- | :--- |
| Clínica Digital UFPE | `00000000-0000-4000-a000-000000000001` |
| Fisioterapia (serviço) | `00000000-0000-4000-a000-000000000002` |
| Dra. Ana Lima | `00000000-0000-4000-a000-000000000010` |
| Dr. Rui Costa | `00000000-0000-4000-a000-000000000011` |
| Carlos Souza Teste | `00000000-0000-4000-a000-000000000020` |
| Luana Teste Silva | `00000000-0000-4000-a000-000000000021` |
| Maria Teste Oliveira | `00000000-0000-4000-a000-000000000022` |
| Maria Teste Oliveira (homônima, só no mock) | `00000000-0000-4000-a000-000000000023` |

O seed guarda apenas os UUIDs. Os nomes da clínica e do serviço, as datas de nascimento, os números de CNS e a paciente homônima foram inventados no mock. A homônima existe só para testar a busca e não aparece em nenhum agendamento do seed.