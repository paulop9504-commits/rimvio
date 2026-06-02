import assert from "node:assert/strict";
import {
  buildGoogleSheetsEmbedUrl,
  isGoogleSheetsUrl,
  parseGoogleSheetsUrl,
  resolveGoogleSheetsEmbed,
} from "../lib/integrations/google-sheets-embed";

const sample =
  "https://docs.google.com/spreadsheets/d/1abcDEF123ghiJKL456/edit#gid=987654321";

assert.equal(isGoogleSheetsUrl(sample), true);

const parsed = parseGoogleSheetsUrl(sample);
assert.ok(parsed);
assert.equal(parsed!.spreadsheetId, "1abcDEF123ghiJKL456");
assert.equal(parsed!.gid, "987654321");

const edit = resolveGoogleSheetsEmbed(sample, "edit");
assert.ok(edit?.embedUrl.includes("/edit"));
assert.ok(edit?.embedUrl.includes("rm=embedded"));
assert.ok(edit?.embedUrl.includes("gid=987654321"));

const preview = buildGoogleSheetsEmbedUrl({
  spreadsheetId: "abc",
  gid: "1",
  mode: "preview",
});
assert.ok(preview.includes("/preview"));

assert.equal(isGoogleSheetsUrl("https://example.com"), false);

console.log("test-google-sheets-embed: ok");
