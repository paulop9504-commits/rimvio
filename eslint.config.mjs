import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["components/feed/**/*.{ts,tsx}"],
    rules: {
      "react/jsx-no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    rules: {
      // Sync-from-storage / prop-reset patterns are intentional in this codebase.
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/testing/*", "@/lib/testing/**"],
              message:
                "Production lib must not import lib/testing — see docs/LIB_BOUNDARIES.md",
            },
            {
              group: ["@/lib/demo/*", "@/lib/demo/**"],
              message:
                "Production lib must not import lib/demo — see docs/LIB_BOUNDARIES.md",
            },
            {
              group: ["@/lib/deos/*", "@/lib/deos/**"],
              message:
                "Production lib must not import lib/deos — see docs/LIB_BOUNDARIES.md",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "lib/globe/**/*.{ts,tsx}",
      "lib/feed/**/*.{ts,tsx}",
      "lib/peer-chat/**/*.{ts,tsx}",
      "lib/experience-bridge/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/action-chat/*", "@/lib/action-chat/**"],
              message:
                "Domain layer (globe/feed/peer) must not import action-chat — use life-read-model or API routes.",
            },
            {
              group: ["@/lib/event-os/*", "@/lib/event-os/**"],
              message:
                "Domain layer must not import event-os directly.",
            },
            {
              group: ["@/lib/surface-engine/*", "@/lib/surface-engine/**"],
              message:
                "Domain layer must not import surface-engine directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "components/globe/**/*.{ts,tsx}",
      "components/experience/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/components/field/field-sheet-provider",
              importNames: ["useFieldSheet"],
              message:
                "Globe → Field must use openFieldDashboardIngress() from @/lib/nav/field-dashboard-ingress — not useFieldSheet().",
            },
            {
              name: "@/lib/nav/field-dashboard-ingress",
              importNames: [
                "openFieldDashboardFromBottomNav",
                "openFieldTradesIngress",
                "openFieldDiscoveryIngress",
                "openFieldMineIngress",
              ],
              message:
                "Globe → Field must call openFieldDashboardIngress() only — use presets from app-nav, not Globe surfaces.",
            },
            {
              name: "@/lib/nav/field-sheet-bridge",
              importNames: ["dispatchOpenFieldSheet"],
              message:
                "Globe → Field must use openFieldDashboardIngress() from @/lib/nav/field-dashboard-ingress.",
            },
            {
              name: "@/components/market/market-alignment-surface",
              importNames: ["MarketAlignmentSurface"],
              message:
                "Full handshake pipeline is Field-only. Use MarketAlignmentSummary on Globe/Feed.",
            },
            {
              name: "@/lib/feed/ingest-globe-context-capture",
              importNames: ["ingestGlobeContextFromText", "ingestGlobeContextFromFiles"],
              message:
                "Globe UI must use dispatchContextRun() or commitTextContextIngress() — not direct ingest.",
            },
            {
              name: "@/lib/globe/intent-supply/run-globe-map-intent-supply",
              importNames: ["runGlobeMapIntentSupply"],
              message:
                "Globe UI must use dispatchContextRun() — not direct map intent supply.",
            },
            {
              name: "@/lib/experience-run",
              importNames: ["resolveExperienceRunTurn"],
              message:
                "Globe UI must use dispatchContextRun({ surface: 'capture_sheet' }) — not direct experience run.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["components/field/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/components/globe/globe-market-intent-wizard-sheet",
              message:
                "Listing wizard is Field-owned. Open via openFieldDashboardIngress({ tab: 'mine' }).",
            },
            {
              name: "@/components/market/market-alignment-surface",
              importNames: ["MarketAlignmentSurface"],
              message:
                "Use MarketTradeProgressCard in Field trades tab — not Globe alignment surface.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
