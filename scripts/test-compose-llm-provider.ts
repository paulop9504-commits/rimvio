#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { composeLlmProvider } from "../lib/llm/compose-llm-provider";

const originalCompose = process.env.COMPOSE_LLM_PROVIDER;
const originalGemini = process.env.GEMINI_API_KEY;
const originalOpenAi = process.env.OPENAI_API_KEY;

function restore() {
  if (originalCompose === undefined) {
    delete process.env.COMPOSE_LLM_PROVIDER;
  } else {
    process.env.COMPOSE_LLM_PROVIDER = originalCompose;
  }
  if (originalGemini === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGemini;
  }
  if (originalOpenAi === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAi;
  }
}

try {
  delete process.env.COMPOSE_LLM_PROVIDER;
  process.env.GEMINI_API_KEY = "test";
  process.env.OPENAI_API_KEY = "test";
  assert.equal(composeLlmProvider(), "gemini");

  process.env.COMPOSE_LLM_PROVIDER = "openai";
  assert.equal(composeLlmProvider(), "openai");

  delete process.env.GEMINI_API_KEY;
  assert.equal(composeLlmProvider(), "openai");

  console.log("test-compose-llm-provider: ok");
} finally {
  restore();
}
