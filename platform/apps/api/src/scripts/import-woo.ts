#!/usr/bin/env tsx
/**
 * CLI runner:  pnpm --filter @ft/api tsx src/scripts/import-woo.ts [MAX]
 */
import { runFullWooImport } from "../services/woo-importer";

const max = Number(process.argv[2] ?? 1500);

runFullWooImport({ maxProducts: max, triggeredBy: "cli" })
  .then((stats) => {
    console.log("OK", stats);
    process.exit(0);
  })
  .catch((e) => {
    console.error("FAIL", e);
    process.exit(1);
  });
