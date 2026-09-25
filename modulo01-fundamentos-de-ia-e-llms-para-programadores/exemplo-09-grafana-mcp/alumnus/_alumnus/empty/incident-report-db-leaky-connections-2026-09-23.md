# Relatório do incidente: DB Leaky Connections

Janela analisada: **23/09/2026, 15:59–16:14 BRT**  
Serviço: `alumnus_app_7fa2`  
Endpoint: `GET /students/db-leaky-connections`

## Resumo

| Telemetria | Evidência |
|---|---|
| Prometheus | Aproximadamente **446 respostas 500** e **nenhuma 200** na janela; duração média dos erros de **1001,96 ms** |
| Loki | Erros contínuos, aproximadamente a cada 2 segundos: `timeout exceeded when trying to connect` |
| Tempo | Traces com duração de **~1003–1005 ms**, status 500 e exceção no handler |
| Stack trace | `pg-pool/index.js:45:11` → `main.ts:52:20` → `main.ts:84:24` |
| Diagnóstico | Pool esgotado porque conexões adquiridas não são devolvidas |

## Correlação das telemetrias

O Prometheus mostra que o endpoint já estava completamente degradado durante toda a janela: 100% das requisições observadas terminaram em 500. A duração média de aproximadamente 1 segundo coincide com o timeout configurado para aquisição de conexão.

O Loki registra repetidamente:

```text
Error: timeout exceeded when trying to connect
    at node_modules/pg-pool/index.js:45:11
    at DbLeakyConnectionsScenario.createConnection (.../main.ts:52:20)
    at Object.<anonymous> (.../main.ts:84:24)
```

Os logs de conclusão confirmam respostas `500` com tempos entre aproximadamente `1000–1002 ms`.

Um trace representativo (`5b6add63cc3b407b1569a3045c1d630a`) apresenta esta hierarquia:

```text
GET (cliente undici)                         ~1004 ms — ERROR
└── GET /students/db-leaky-connections      ~1002 ms — 500
    └── request                              ~1001 ms
        └── handler                          ~1001 ms — ERROR
            └── exception: timeout exceeded when trying to connect
```

Há quatro spans no trace e três marcados como erro. Não existe span de consulta ao PostgreSQL nessa requisição porque o timeout acontece antes de uma conexão ficar disponível. Também não foi observada qualquer operação de liberação da conexão.

## Causa raiz

As primeiras conexões foram adquiridas por `pool.connect()` e permaneceram reservadas. Como o pool possui limite de duas conexões, depois de ambas vazarem todas as novas requisições esperam aproximadamente um segundo e falham.

Na versão atualmente instrumentada, os pontos reportados são:

- `main.ts:52`: tentativa de adquirir conexão.
- `main.ts:84`: chamada feita pelo handler.
- Defeito lógico: ausência de `client.release()` garantido por um bloco `finally`.

Os números `main.ts:51` e `main.ts:80` presentes na descrição do cenário parecem pertencer a outra revisão do arquivo; a telemetria atual aponta **52 e 84**.

## Correção recomendada

```typescript
const client = await this.pool.connect()

try {
  const result = await client.query(
    'SELECT * FROM students LIMIT 1'
  )

  return reply.send({ students: result.rows })
} finally {
  client.release()
}
```

A liberação deve permanecer no `finally` para ocorrer tanto em respostas bem-sucedidas quanto quando a consulta ou o envio da resposta lançar uma exceção.

## Validação pendente

A correção ainda não foi aplicada nesta investigação. Depois da alteração, deve-se executar pelo menos três requisições consecutivas e confirmar:

- respostas HTTP 200 em todas as requisições;
- desaparecimento dos timeouts do `pg-pool`;
- retorno da duração das requisições ao valor normal;
- ausência de crescimento permanente no número de conexões ocupadas.
