import assert from "node:assert/strict";
import {
  assertNoResidentIdInDefaultPool,
  buildHubBookingIdentity,
  hubIdentitySlotRequirements,
  hubSupportsIdentityPrefill,
  isLegalSensitiveIdHub,
  isResidentIdLike,
  maskPassportNumber,
  IDENTITY_VAULT_KEYS,
} from "../lib/identity-vault";
import type { IdentityVaultBundle } from "../lib/identity-vault/types";
import { createReserveActionWithIdentity } from "../lib/globe/resource/emit-hub-action-with-identity";

const bundle: IdentityVaultBundle = {
  traveler: {
    version: 1,
    legalNameKo: "김민지",
    givenNameRoman: "MINJI",
    familyNameRoman: "KIM",
    dateOfBirth: "1992-04-12",
    gender: "F",
    nationalityIso2: "KR",
  },
  passport: {
    version: 1,
    passportNumber: "M12345678",
    issuingCountryIso2: "KR",
    expiryDate: "2030-12-31",
  },
  contact: {
    version: 1,
    phoneE164: "+821012345678",
    email: "minji@example.com",
  },
};

assert.ok(hubSupportsIdentityPrefill("flight"));
assert.ok(!hubSupportsIdentityPrefill("eatery"));
assert.equal(hubIdentitySlotRequirements("lodging").length, 2);
assert.equal(isLegalSensitiveIdHub("flight"), false);

const flight = buildHubBookingIdentity({ hubId: "flight", bundle });
assert.equal(flight.complete, true);
assert.equal(flight.identityRefs.passportKey, IDENTITY_VAULT_KEYS.passport);
assert.equal(flight.formFields.passportNumber, "M12345678");
assert.ok(flight.maskedLabelKo.includes("M12345678") === false);
assert.ok(flight.maskedLabelKo.includes(maskPassportNumber("M12345678")));

const rentalBundle: IdentityVaultBundle = {
  ...bundle,
  driverLicense: {
    version: 1,
    licenseNumber: "12-34-567890-12",
    issuingCountryIso2: "KR",
  },
};
const rental = buildHubBookingIdentity({ hubId: "rental_car", bundle: rentalBundle });
assert.equal(rental.complete, true);
assert.ok(rental.formFields.driverLicenseNumber);

const lodgingOnly: IdentityVaultBundle = { traveler: bundle.traveler, contact: bundle.contact };
const lodging = buildHubBookingIdentity({ hubId: "lodging", bundle: lodgingOnly });
assert.equal(lodging.complete, true);
assert.equal(lodging.formFields.passportNumber, undefined);

let rrnRejected = false;
try {
  assertNoResidentIdInDefaultPool({ note: "주민번호 900101-1234567" }, "traveler");
} catch {
  rrnRejected = true;
}
assert.equal(rrnRejected, true);
assert.ok(isResidentIdLike("900101-1234567"));

const { action } = createReserveActionWithIdentity({
  hubId: "flight",
  identityBundle: bundle,
  contextEventId: "ec-test",
  resourceId: "res-lodging-1",
  payload: {
    slot: { start: "2026-07-18", end: "2026-07-21" },
    guestCount: 2,
  },
});
assert.equal(action.type, "reserve");
if (action.type === "reserve") {
  assert.equal(action.payload.identityRefs?.passportKey, IDENTITY_VAULT_KEYS.passport);
  assert.equal(
    (action.payload as { passportNumber?: string }).passportNumber,
    undefined,
    "no passport plaintext on action payload",
  );
}

console.log("test-identity-vault: ok");
