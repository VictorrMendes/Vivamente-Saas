import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Next 16 gera/sobrescreve um CLAUDE.md automaticamente; no Windows (FS
  // case-insensitive) isso colide com o CLAUDE.MD real do projeto. Desativado.
  agentRules: false,
  turbopack: {
    // @vivamente/design é um `file:../design` fora desta pasta — Turbopack só
    // resolve módulos dentro do root, então precisa subir até o pai comum.
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
