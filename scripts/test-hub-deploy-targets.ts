import assert from "node:assert/strict";
import {
  formatDeployUtterance,
  parseDeployTargetsFromUtterance,
  wantsDeployUtterance,
} from "../lib/hub/dev/hub-deploy-targets";

assert.equal(wantsDeployUtterance("배포해"), true);
assert.deepEqual(parseDeployTargetsFromUtterance("배포해"), []);
assert.deepEqual(parseDeployTargetsFromUtterance("전부 배포"), ["personal", "main"]);
assert.deepEqual(parseDeployTargetsFromUtterance("배포해 personal"), ["personal"]);
assert.deepEqual(parseDeployTargetsFromUtterance("배포해 main"), ["main"]);
assert.deepEqual(parseDeployTargetsFromUtterance("우리쪽 배포"), ["main"]);
assert.equal(formatDeployUtterance(["personal", "main"]), "전부 배포");
assert.equal(formatDeployUtterance(["main"]), "배포해 main");

console.log("test-hub-deploy-targets: ok");
