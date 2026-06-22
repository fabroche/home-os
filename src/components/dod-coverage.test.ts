import { describe, it, expect } from "vitest";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Enforcement del DoD (ver docs/transversal/calidad-y-pruebas.md): todo componente
 * visual co-loca su **Story** (`*.stories.tsx`) y su **Test RTL** (`*.test.tsx|ts`).
 *
 * El test falla si:
 *  - un componente NO tiene story/test y NO está en la deuda trackeada → créalos
 *    (o, si es deuda consciente, añádelo a DEUDA_STORY / DEUDA_TEST con su porqué).
 *  - un componente de una deuda YA tiene el artefacto → quítalo de la lista
 *    (mantiene la deuda honesta: solo puede decrecer).
 *
 * Objetivo: que no se vuelva a "terminar" un módulo sin lo que pide el DoD.
 */

const ROOT = join(process.cwd(), "src", "components");

// Sin componente visual (lógica/datos/providers): no requieren story.
const SIN_STORY_NA = new Set(["layout/nav-items", "theme/theme-provider"]);
// Sin comportamiento útil que testear (providers): no requieren test propio.
const SIN_TEST_NA = new Set(["theme/theme-provider"]);

// Deudas DoD: vacías. El test impide reintroducirlas sin dejar rastro.
const DEUDA_STORY = new Set<string>([]);
const DEUDA_TEST = new Set<string>([]);

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
    testTsx: p.replace(/\.tsx$/, ".test.tsx"),
    testTs: p.replace(/\.tsx$/, ".test.ts"),
  }));

describe("DoD · cobertura de stories de Storybook", () => {
  it("descubre los componentes del repo", () => {
    expect(componentes.length).toBeGreaterThan(10);
  });

  for (const c of componentes) {
    if (SIN_STORY_NA.has(c.key)) continue;
    const tiene = existsSync(c.story);
    it(`${c.key}: story presente o deuda trackeada`, () => {
      if (tiene) {
        expect(DEUDA_STORY.has(c.key), `"${c.key}" ya tiene story: quítalo de DEUDA_STORY.`).toBe(
          false,
        );
      } else {
        expect(
          DEUDA_STORY.has(c.key),
          `"${c.key}" no tiene story (DoD). Crea ${c.key}.stories.tsx o añádelo a DEUDA_STORY.`,
        ).toBe(true);
      }
    });
  }
});

describe("DoD · cobertura de tests RTL", () => {
  for (const c of componentes) {
    if (SIN_TEST_NA.has(c.key)) continue;
    const tiene = existsSync(c.testTsx) || existsSync(c.testTs);
    it(`${c.key}: test presente o deuda trackeada`, () => {
      if (tiene) {
        expect(DEUDA_TEST.has(c.key), `"${c.key}" ya tiene test: quítalo de DEUDA_TEST.`).toBe(
          false,
        );
      } else {
        expect(
          DEUDA_TEST.has(c.key),
          `"${c.key}" no tiene test (DoD). Crea ${c.key}.test.tsx o añádelo a DEUDA_TEST.`,
        ).toBe(true);
      }
    });
  }
});
