import assert from "node:assert/strict";
import { isPalantirOntologyDevSurfaceEnabled } from "../lib/globe/spatial-semantic/palantir-ontology-dev-surface";

const originalNodeEnv = process.env.NODE_ENV;
const originalFlag = process.env.NEXT_PUBLIC_RIMVIO_PALANTIR_ONTOLOGY_DEV;

try {
  process.env.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_RIMVIO_PALANTIR_ONTOLOGY_DEV = "1";
  assert.equal(isPalantirOntologyDevSurfaceEnabled(), false, "hidden in production");

  process.env.NODE_ENV = "development";
  process.env.NEXT_PUBLIC_RIMVIO_PALANTIR_ONTOLOGY_DEV = "";
  assert.equal(isPalantirOntologyDevSurfaceEnabled(), false, "hidden without dev flag");

  process.env.NEXT_PUBLIC_RIMVIO_PALANTIR_ONTOLOGY_DEV = "1";
  assert.equal(isPalantirOntologyDevSurfaceEnabled(), true, "visible in dev with flag");
} finally {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalFlag === undefined) {
    delete process.env.NEXT_PUBLIC_RIMVIO_PALANTIR_ONTOLOGY_DEV;
  } else {
    process.env.NEXT_PUBLIC_RIMVIO_PALANTIR_ONTOLOGY_DEV = originalFlag;
  }
}

console.log("test-palantir-ontology-dev-surface: ok");
