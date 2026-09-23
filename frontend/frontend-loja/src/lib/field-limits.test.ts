import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Trava de regressão: todo campo de texto dos formulários públicos precisa de
// maxLength (espelha o Back — ver lib/field-limits.ts).
const NON_TEXT = new Set(["checkbox", "radio", "date", "time", "file", "hidden", "number", "submit"]);

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.") ? [path] : [];
  });
}

describe("limites de caracteres nos formulários", () => {
  it("todo <input> de texto e <textarea> tem maxLength", () => {
    const files = tsxFiles(join(process.cwd(), "src"));
    expect(files.length).toBeGreaterThan(5);
    const offenders: string[] = [];
    for (const file of files) {
      // comentários de linha não contam (podem citar <input> em texto corrido)
      const source = readFileSync(file, "utf8").replace(/^\s*\/\/.*$/gm, "");
      for (const match of source.matchAll(/<(input|textarea)\b([\s\S]*?)\/?>/g)) {
        const attrs = match[2] ?? "";
        const type = /\btype="([\w-]+)"/.exec(attrs)?.[1] ?? (match[1] === "textarea" ? "textarea" : "text");
        if (NON_TEXT.has(type) || /maxLength/.test(attrs)) continue;
        offenders.push(`${file}:${source.slice(0, match.index).split("\n").length}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
