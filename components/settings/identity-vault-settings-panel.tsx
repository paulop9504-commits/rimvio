"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { copy } from "@/lib/copy/human-ko";
import { IDENTITY_VAULT_KEYS } from "@/lib/identity-vault/vault-keys";
import { readIdentityVaultBundleClient } from "@/lib/identity-vault/read-identity-vault-bundle-client";
import { upsertIdentityVaultObjectClient } from "@/lib/identity-vault/write-identity-vault-object-client";
import type {
  ContactChannelPayload,
  PassportDocumentPayload,
  TravelerProfilePayload,
} from "@/lib/identity-vault/types";
import { mapVaultWriteErrorCopy } from "@/lib/vault/map-vault-write-error-copy";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 w-full rounded-xl border-0 bg-[#f5f5f7] px-3 text-[13px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3]/25";

type IdentityVaultSettingsPanelProps = {
  className?: string;
  onSaved?: () => void;
};

/** Settings > 여행 신원 — default pool only (no RRN). */
export function IdentityVaultSettingsPanel({
  className,
  onSaved,
}: IdentityVaultSettingsPanelProps) {
  const iv = copy.identityVault;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPassport, setShowPassport] = useState(false);

  const [givenNameRoman, setGivenNameRoman] = useState("");
  const [familyNameRoman, setFamilyNameRoman] = useState("");
  const [legalNameKo, setLegalNameKo] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationalityIso2, setNationalityIso2] = useState("KR");
  const [phoneE164, setPhoneE164] = useState("");
  const [email, setEmail] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [passportCountry, setPassportCountry] = useState("KR");

  const load = useCallback(async () => {
    const bundle = await readIdentityVaultBundleClient();
    if (bundle.traveler) {
      setGivenNameRoman(bundle.traveler.givenNameRoman);
      setFamilyNameRoman(bundle.traveler.familyNameRoman);
      setLegalNameKo(bundle.traveler.legalNameKo ?? "");
      setDateOfBirth(bundle.traveler.dateOfBirth);
      setNationalityIso2(bundle.traveler.nationalityIso2);
    }
    if (bundle.contact) {
      setPhoneE164(bundle.contact.phoneE164);
      setEmail(bundle.contact.email);
    }
    if (bundle.passport) {
      setPassportNumber(bundle.passport.passportNumber);
      setPassportExpiry(bundle.passport.expiryDate);
      setPassportCountry(bundle.passport.issuingCountryIso2);
      setShowPassport(true);
    }
  }, []);

  useEffect(() => {
    void load()
      .catch(() => {
        toast.error(iv.loadFailed);
      })
      .finally(() => setLoading(false));
  }, [load, iv.loadFailed]);

  const toastWriteError = (error: string) => {
    toast.error(
      mapVaultWriteErrorCopy(error, {
        saveFailed: iv.saveFailed,
        saveNeedLogin: iv.saveNeedLogin,
        saveVaultUnavailable: iv.saveVaultUnavailable,
      }),
    );
  };

  const save = async () => {
    if (
      !givenNameRoman.trim() ||
      !familyNameRoman.trim() ||
      !dateOfBirth.trim() ||
      !phoneE164.trim() ||
      !email.trim()
    ) {
      toast.error(iv.saveMissingRequired);
      return;
    }

    setBusy(true);
    try {
      const traveler: TravelerProfilePayload = {
        version: 1,
        givenNameRoman: givenNameRoman.trim().toUpperCase(),
        familyNameRoman: familyNameRoman.trim().toUpperCase(),
        legalNameKo: legalNameKo.trim() || undefined,
        dateOfBirth: dateOfBirth.trim(),
        nationalityIso2: nationalityIso2.trim().toUpperCase() || "KR",
      };
      const contact: ContactChannelPayload = {
        version: 1,
        phoneE164: phoneE164.trim(),
        email: email.trim(),
      };

      const travelerResult = await upsertIdentityVaultObjectClient({
        objectKey: IDENTITY_VAULT_KEYS.travelerProfile,
        kind: "identity_traveler_profile",
        payload: traveler,
      });
      if (!travelerResult.ok) {
        toastWriteError(travelerResult.error);
        return;
      }

      const contactResult = await upsertIdentityVaultObjectClient({
        objectKey: IDENTITY_VAULT_KEYS.contact,
        kind: "identity_contact",
        payload: contact,
      });
      if (!contactResult.ok) {
        toastWriteError(contactResult.error);
        return;
      }

      if (showPassport && passportNumber.trim() && passportExpiry.trim()) {
        const passport: PassportDocumentPayload = {
          version: 1,
          passportNumber: passportNumber.trim().toUpperCase(),
          issuingCountryIso2: passportCountry.trim().toUpperCase() || "KR",
          expiryDate: passportExpiry.trim(),
        };
        const passportResult = await upsertIdentityVaultObjectClient({
          objectKey: IDENTITY_VAULT_KEYS.passport,
          kind: "identity_passport",
          payload: passport,
        });
        if (!passportResult.ok) {
          toastWriteError(passportResult.error);
          return;
        }
      }

      toast.success(iv.saveDone);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection
      title={iv.settingsTitle}
      description={iv.settingsHint}
      className={cn(className)}
    >
      {loading ? (
        <p className="text-[12px] text-[#86868b]">{iv.loading}</p>
      ) : (
        <div className="space-y-3" data-identity-vault-settings>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-[#6e6e73]">
                {iv.familyNameLabel}
              </span>
              <input
                className={inputClass}
                value={familyNameRoman}
                onChange={(event) => setFamilyNameRoman(event.target.value)}
                autoComplete="family-name"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-[#6e6e73]">
                {iv.givenNameLabel}
              </span>
              <input
                className={inputClass}
                value={givenNameRoman}
                onChange={(event) => setGivenNameRoman(event.target.value)}
                autoComplete="given-name"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-[#6e6e73]">
              {iv.legalNameKoLabel}
            </span>
            <input
              className={inputClass}
              value={legalNameKo}
              onChange={(event) => setLegalNameKo(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-[#6e6e73]">
                {iv.dateOfBirthLabel}
              </span>
              <input
                type="date"
                className={inputClass}
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-[#6e6e73]">
                {iv.nationalityLabel}
              </span>
              <input
                className={inputClass}
                value={nationalityIso2}
                onChange={(event) => setNationalityIso2(event.target.value)}
                maxLength={2}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-[#6e6e73]">
              {iv.phoneLabel}
            </span>
            <input
              className={inputClass}
              value={phoneE164}
              onChange={(event) => setPhoneE164(event.target.value)}
              inputMode="tel"
              autoComplete="tel"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-[#6e6e73]">
              {iv.emailLabel}
            </span>
            <input
              className={inputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
            />
          </label>

          <button
            type="button"
            className="text-[12px] font-medium text-[#0071e3]"
            onClick={() => setShowPassport((value) => !value)}
          >
            {showPassport ? iv.passportSectionHide : iv.passportSectionShow}
          </button>

          {showPassport ? (
            <div className="space-y-2 rounded-xl bg-[#fbfbfd] p-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">
                  {iv.passportNumberLabel}
                </span>
                <input
                  className={inputClass}
                  value={passportNumber}
                  onChange={(event) => setPassportNumber(event.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-[#6e6e73]">
                    {iv.passportExpiryLabel}
                  </span>
                  <input
                    type="date"
                    className={inputClass}
                    value={passportExpiry}
                    onChange={(event) => setPassportExpiry(event.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-[#6e6e73]">
                    {iv.passportCountryLabel}
                  </span>
                  <input
                    className={inputClass}
                    value={passportCountry}
                    onChange={(event) => setPassportCountry(event.target.value)}
                    maxLength={2}
                  />
                </label>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy}
            className="w-full rounded-xl bg-[#0071e3] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            onClick={() => void save()}
          >
            {busy ? "…" : iv.saveCta}
          </button>
        </div>
      )}
    </SettingsSection>
  );
}
