/**
 * Stub de `server-only` para os testes unitários.
 *
 * O pacote real está instalado, mas o seu entry point normal LANÇA um erro
 * de propósito — só a condição de resolução `react-server` (que o Next usa,
 * e que um script pode pedir com `node --conditions=react-server`) devolve o
 * módulo vazio. O Vitest não corre com essa condição, por isso sem este
 * stub qualquer teste que importe, mesmo indiretamente, um módulo marcado
 * como server-only falharia logo na importação.
 */
export {};
