# Issue 3 — Evidência de testes e benchmark

Executado em 2026-10-06, com Node.js 18+ e sem dependências externas.

## Testes

Comando: `node tests/test_node.js` (a partir de `ranking-consensus/`)

Resultado: **8 passaram / 0 falharam (8 testes)**.

Os testes incluem oráculos de força bruta, permutações até `n=7` para inversões,
permutações de rankings até `n=6` para Kendall-Tau, casos `+1`, `-1`, `0`,
`n < 2`, duplicatas, entradas inválidas e verificação do exit code do runner.

## Benchmark

Comando: `node scripts/run_benchmark.js`

Dados determinísticos, execução local:

```text
Benchmark de contagem de inversões (dados determinísticos)
n     | Merge ms   | força-bruta ms    | razão (força-bruta/Merge)
------|------------|-------------------|--------------------
 1000 |      1.192 |             4.324 |               3.63x
 2000 |      1.388 |             5.910 |               4.26x
 5000 |      1.814 |    limited/not run |      limited/not run
10000 |      4.042 |    limited/not run |      limited/not run
20000 |      6.270 |    limited/not run |      limited/not run
```

O benchmark agora apresenta os dois algoritmos na mesma linha por tamanho. A força
bruta foi limitada a `n=2000` (menor que 2 s nesta execução), enquanto Merge foi
medido de `n=1000` a `n=20000`. Para tamanhos maiores, a tabela registra
explicitamente `limited/not run`; a razão só é calculada quando os dois
tempos existem. Os valores de entrada são determinísticos; os tempos variam conforme
a máquina e a carga do processo.

## Evidência da correção da Issue 3

- `node --check scripts/run_benchmark.js`: passou.
- `node scripts/run_benchmark.js`: passou e produziu a tabela comparativa acima.
- `git diff --check`: passou.
