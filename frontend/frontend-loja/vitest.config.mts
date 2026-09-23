import path from "node:path";
import { defineConfig } from "vitest/config";

// Sem isso, testes que carregam um módulo real (não mockado) com import "@/..."
// (ex.: back-client.test.ts) falham com "Cannot find package '@/...'" — os
// testes existentes nunca bateram nisso porque sempre mockavam esses módulos
// por inteiro em vez de carregar a cadeia real. Mesmo alias de tsconfig.json.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
