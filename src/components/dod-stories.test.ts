import { describe, it, expect } from "vitest";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Enforcement del DoD (ver docs/transversal/calidad-y-pruebas.md): todo componente
 * visual debe co-locar su Story de Storybook (`*.stories.tsx`). Este test falla si:
 *  - un componente NO tiene story y NO está en la deuda trackeada → añade la story
 *    (o, si es deuda consciente, agrégalo a DEUDA_STORY con su porqué).
 *  - un componente de DEUDA_STORY YA tiene story → quítalo de la lista (mantiene la
 *    deuda honesta y obliga a vaciarla conforme se cierra).
 *
 * Objetivo: que no se vuelva a "terminar" un módulo sin las stories del DoD.
 */

const ROOT = join(process.cwd(), "src", "components");

// Módulos SIN componente visual (lógica/datos/providers): no requieren story.
const SIN_STORY_NA = new Set(["layout/nav-items", "theme/theme-provider"]);

// Deuda DoD conocida: componentes visuales aún sin story. Vaciar al cerrarla.
// ✅ Saldada por completo: todos los componentes visuales tienen story co-locada.
const DEUDA_STORY = new Set<string>([]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const componentes = walk(ROOT)
  .filter((p) => p.endsWith(".tsx") && !p.endsWith(".stories.tsx") && !p.endsWith(".test.tsx"))
  .map((p) => ({
    key: relative(ROOT, p).replace(/\\/g, "/").replace(/\.tsx$/, ""),
    story: p.replace(/\.tsx$/, ".stories.tsx"),
  }));

describe("DoD · cobertura de stories de Storybook", () => {
  it("descubre los componentes del repo", () => {
    expect(componentes.length).toBeGreaterThan(10);
  });

  for (const c of componentes) {
    if (SIN_STORY_NA.has(c.key)) continue;
    const tieneStory = existsSync(c.story);

    it(`${c.key}: story presente o deuda trackeada`, () => {
      if (tieneStory) {
        expect(
          DEUDA_STORY.has(c.key),
          `"${c.key}" ya tiene story: quítalo de DEUDA_STORY en dod-stories.test.ts.`,
        ).toBe(false);
      } else {
        expect(
          DEUDA_STORY.has(c.key),
          `"${c.key}" no tiene story (DoD). Crea ${c.key}.stories.tsx o, si es deuda consciente, añádelo a DEUDA_STORY.`,
        ).toBe(true);
      }
    });
  }
});
