import assert from "node:assert/strict";

import { assessExpressCheckoutReadiness } from "../lib/payment-vault/assess-express-checkout-readiness";
import { buildPaymentDisplayLabel } from "../lib/payment-vault/build-payment-display-label";
import { validatePaymentVaultPut } from "../lib/payment-vault/validate-payment-vault-put";

function testPaymentDisplayLabel(): void {
  assert.equal(buildPaymentDisplayLabel({ method: "kakaopay" }), "카카오페이");
  assert.equal(
    buildPaymentDisplayLabel({ method: "in_app_card", cardLast4: "4242" }),
    "카드 ·••• 4242",
  );
}

function testPaymentVaultValidation(): void {
  validatePaymentVaultPut("payment_preference", {
    version: 1,
    method: "tosspay",
    displayLabelKo: "토스페이",
    savedAtIso: new Date().toISOString(),
  });

  assert.throws(() => {
    validatePaymentVaultPut("payment_preference", {
      version: 1,
      method: "invalid",
      displayLabelKo: "x",
      savedAtIso: new Date().toISOString(),
    });
  });
}

function testExpressReadiness(): void {
  const ready = assessExpressCheckoutReadiness({
    hubId: "lodging",
    identityBundle: {
      traveler: {
        version: 1,
        givenNameRoman: "YONG",
        familyNameRoman: "PARK",
        dateOfBirth: "1995-01-01",
        nationalityIso2: "KR",
      },
      contact: {
        version: 1,
        phoneE164: "+821012345678",
        email: "guest@example.com",
      },
    },
    paymentBundle: {
      preference: {
        version: 1,
        method: "kakaopay",
        displayLabelKo: "카카오페이",
        savedAtIso: new Date().toISOString(),
      },
    },
  });
  assert.equal(ready.ready, true);
  assert.equal(ready.paymentMethod, "kakaopay");

  const missingPayment = assessExpressCheckoutReadiness({
    hubId: "lodging",
    identityBundle: {
      traveler: {
        version: 1,
        givenNameRoman: "YONG",
        familyNameRoman: "PARK",
        dateOfBirth: "1995-01-01",
        nationalityIso2: "KR",
      },
      contact: {
        version: 1,
        phoneE164: "+821012345678",
        email: "guest@example.com",
      },
    },
    paymentBundle: {},
  });
  assert.equal(missingPayment.ready, false);
  assert.equal(missingPayment.paymentComplete, false);
}

testPaymentDisplayLabel();
testPaymentVaultValidation();
testExpressReadiness();

console.log("test-payment-vault: ok");
