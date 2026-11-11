import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  MapPin,
  Lock,
  ShieldCheck,
  Phone,
  MessageSquare,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Search,
  ChevronDown,
  Building2,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import {
  COUNTRY_CATALOG,
  getCountryFlagEmoji,
  getCountryByCode,
  getCountryName,
  getRegionsForCountry,
  validateAndNormalizePhone,
  maskE164PhoneNumber,
  formatLocationSummary,
  type ContactMethodPreference,
  type LocationVisibilityMode,
  type PickupAddressVisibility,
  type StructuredPhysicalAddress,
  type PhysicalEligibilityResult,
  type AuthorizedBookingContactResponse,
} from '../lib/location/countryLocationEngine';
import type { MarketplaceListing, ProviderProfile } from '../lib/security/policyEngine';
import type { OnChainBooking } from '../lib/near/escrowStateMachine';

// 1. Dynamic Country Flag Component (Never Hardcoded)
export const CountryFlag: React.FC<{
  countryCode?: string | null;
  className?: string;
  showCodeFallback?: boolean;
}> = ({ countryCode, className = 'text-base', showCodeFallback = false }) => {
  const flag = getCountryFlagEmoji(countryCode);
  return (
    <span
      className={`inline-flex items-center gap-1 select-none ${className}`}
      title={countryCode ? `${getCountryName(countryCode)} (${countryCode.toUpperCase()})` : 'Global'}
      aria-label={countryCode ? getCountryName(countryCode) : 'Global'}
    >
      <span>{flag}</span>
      {showCodeFallback && countryCode && (
        <span className="text-[10px] font-mono uppercase opacity-75">{countryCode}</span>
      )}
    </span>
  );
};

// 2. Country + Region + City Badge Component
export const CountryBadge: React.FC<{
  countryCode?: string | null;
  countryName?: string | null;
  regionName?: string | null;
  cityName?: string | null;
  pickupArea?: string | null;
  compact?: boolean;
  className?: string;
}> = ({
  countryCode,
  countryName,
  regionName,
  cityName,
  pickupArea,
  compact = false,
  className = '',
}) => {
  if (!countryCode) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00EC97]/10 border border-[#00EC97]/25 text-[#00EC97] text-xs font-medium ${className}`}
      >
        <Globe className="w-3.5 h-3.5" />
        <span>Global Digital Availability</span>
      </span>
    );
  }

  const resolvedName = countryName || getCountryName(countryCode);
  const flag = getCountryFlagEmoji(countryCode);
  const summary = compact
    ? [resolvedName, cityName || regionName].filter(Boolean).join(' · ')
    : formatLocationSummary({
        countryCode,
        countryName: resolvedName,
        regionName,
        cityName: pickupArea || cityName,
      });

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C2230] border border-white/10 text-[#E6EDF7] text-xs font-medium ${className}`}
    >
      <span className="text-sm leading-none">{flag}</span>
      <span className="truncate">{summary}</span>
    </span>
  );
};

// 3. Searchable Country Select Component
export const CountrySelect: React.FC<{
  value: string;
  onChange: (countryCode: string, countryName: string) => void;
  label?: string;
  disabled?: boolean;
  helperText?: string;
  id?: string;
}> = ({ value, onChange, label = 'Country', disabled = false, helperText, id }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCountry = useMemo(() => getCountryByCode(value), [value]);
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRY_CATALOG;
    return COUNTRY_CATALOG.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="relative">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-left text-sm text-[#F5F8FF] transition hover:border-[#00EC97]/40 focus:outline-none focus:border-[#00EC97] ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <span className="flex items-center gap-2.5 truncate">
            <span className="text-lg leading-none">{getCountryFlagEmoji(value)}</span>
            <span className="font-medium">
              {selectedCountry ? selectedCountry.name : getCountryName(value)}
            </span>
            {value && (
              <span className="text-[11px] font-mono text-[#9BA8C0] px-1.5 py-0.5 rounded bg-white/5">
                {value.toUpperCase()}
              </span>
            )}
          </span>
          <ChevronDown className="w-4 h-4 text-[#9BA8C0] shrink-0" />
        </button>

        {open && !disabled && (
          <div className="absolute z-40 mt-1.5 w-full rounded-xl bg-[#141821] border border-white/15 shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-white/10 flex items-center gap-2 bg-[#0B0E14]">
              <Search className="w-3.5 h-3.5 text-[#9BA8C0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or ISO code..."
                className="w-full bg-transparent text-xs text-[#F5F8FF] placeholder-[#9BA8C0]/60 focus:outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
              {filteredCountries.map((country) => {
                const isSelected = country.code === value?.toUpperCase();
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      onChange(country.code, country.name);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs transition hover:bg-white/5 ${
                      isSelected ? 'bg-[#00EC97]/15 text-[#00EC97] font-semibold' : 'text-[#F5F8FF]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{getCountryFlagEmoji(country.code)}</span>
                      <span>{country.name}</span>
                    </span>
                    <span className="font-mono text-[11px] text-[#9BA8C0]">
                      {country.code} · {country.dialCode}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {helperText && <p className="mt-1 text-[11px] text-[#9BA8C0]">{helperText}</p>}
    </div>
  );
};

// 4. Region / State / Province Select Component
export const RegionSelect: React.FC<{
  countryCode: string;
  value: string;
  onChange: (region: string) => void;
  label?: string;
  disabled?: boolean;
}> = ({ countryCode, value, onChange, label = 'Region / State / Province', disabled = false }) => {
  const regions = useMemo(() => getRegionsForCountry(countryCode), [countryCode]);
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    if (value && regions.length > 0 && !regions.includes(value)) {
      setCustomMode(false);
    }
  }, [countryCode, regions, value]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0]">
          {label}
        </label>
        {regions.length > 0 && (
          <button
            type="button"
            onClick={() => setCustomMode((p) => !p)}
            className="text-[11px] text-[#00EC97] hover:underline"
          >
            {customMode ? 'Select from list' : 'Enter custom region'}
          </button>
        )}
      </div>
      {regions.length > 0 && !customMode ? (
        <select
          disabled={disabled}
          value={regions.includes(value) ? value : regions[0] || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
        >
          {!value && <option value="">Select region...</option>}
          {regions.map((reg) => (
            <option key={reg} value={reg}>
              {reg}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Oromia, Nairobi County, Zurich"
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm text-[#F5F8FF] placeholder-[#9BA8C0]/50 focus:outline-none focus:border-[#00EC97]"
        />
      )}
    </div>
  );
};

// 5. International Phone Input Component (supports phoneCountryCode independent of profile country — TEST 14)
export const InternationalPhoneInput: React.FC<{
  phoneNumber: string;
  phoneCountryCode: string;
  onChange: (nextPhone: string, nextPhoneCountryCode: string) => void;
  label?: string;
}> = ({
  phoneNumber,
  phoneCountryCode,
  onChange,
  label = 'International Phone Number (Private Until Booking Acceptance)',
}) => {
  const selectedPhoneCountry = useMemo(
    () => getCountryByCode(phoneCountryCode) || getCountryByCode('ET')!,
    [phoneCountryCode]
  );

  const validation = useMemo(() => {
    if (!phoneNumber.trim()) return null;
    return validateAndNormalizePhone(phoneNumber, phoneCountryCode);
  }, [phoneNumber, phoneCountryCode]);

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5">
        {label}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-5">
          <select
            aria-label="Phone calling code country"
            value={selectedPhoneCountry.code}
            onChange={(e) => {
              const nextCode = e.target.value;
              const nextDef = getCountryByCode(nextCode);
              // If phone input is empty or only has a dial prefix, update prefix smoothly
              if (!phoneNumber.trim() && nextDef) {
                onChange(`${nextDef.dialCode} `, nextCode);
              } else {
                onChange(phoneNumber, nextCode);
              }
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-xs text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
          >
            {COUNTRY_CATALOG.map((c) => (
              <option key={c.code} value={c.code}>
                {getCountryFlagEmoji(c.code)} {c.name} ({c.dialCode})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-7 relative">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => onChange(e.target.value, selectedPhoneCountry.code)}
            placeholder={selectedPhoneCountry.examplePhone}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm font-mono text-[#F5F8FF] placeholder-[#9BA8C0]/50 focus:outline-none focus:border-[#00EC97]"
          />
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {validation ? (
          validation.valid ? (
            <span className="text-[#00EC97] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Normalized E.164: <strong className="font-mono">{validation.normalizedE164}</strong> ·
              Public mask:{' '}
              <strong className="font-mono">
                {maskE164PhoneNumber(validation.normalizedE164)}
              </strong>
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {validation.error}
            </span>
          )
        ) : (
          <span className="text-[#9BA8C0] flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#00EC97]" />
            Masked on public profile ({selectedPhoneCountry.dialCode} ••• ••• 567). Shared only with
            accepted booking counterparties.
          </span>
        )}
      </div>
    </div>
  );
};

// 6. Contact Preference Selector Component
export const ContactPreferenceSelector: React.FC<{
  selected: ContactMethodPreference[];
  onChange: (next: ContactMethodPreference[]) => void;
}> = ({ selected, onChange }) => {
  const options: { id: ContactMethodPreference; label: string; desc: string }[] = [
    { id: 'IN_APP', label: 'In-App Booking Chat', desc: 'Encrypted booking thread' },
    { id: 'WHATSAPP', label: 'WhatsApp', desc: 'Unlocked after acceptance' },
    { id: 'PHONE_CALL', label: 'Phone Call', desc: 'Unlocked after acceptance' },
    { id: 'EMAIL', label: 'Email', desc: 'Coordinations & receipts' },
  ];

  const toggle = (id: ContactMethodPreference) => {
    if (selected.includes(id)) {
      const next = selected.filter((item) => item !== id);
      onChange(next.length > 0 ? next : ['IN_APP']);
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5">
        Preferred Contact Channels (After Booking Acceptance)
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`p-2.5 rounded-xl border text-left transition ${
                active
                  ? 'bg-[#00EC97]/12 border-[#00EC97]/50 text-[#F5F8FF]'
                  : 'bg-[#0B0E14] border-white/10 text-[#9BA8C0] hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{opt.label}</span>
                {active && <Check className="w-3.5 h-3.5 text-[#00EC97]" />}
              </div>
              <div className="text-[10px] opacity-75 mt-0.5">{opt.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 7. Screen G — Contact Privacy Settings Panel
export const ContactPrivacySettings: React.FC<{
  locationVisibility: LocationVisibilityMode;
  contactSharingEnabled: boolean;
  onChangeLocationVisibility: (mode: LocationVisibilityMode) => void;
  onChangeContactSharing: (enabled: boolean) => void;
}> = ({
  locationVisibility,
  contactSharingEnabled,
  onChangeLocationVisibility,
  onChangeContactSharing,
}) => {
  return (
    <div className="rounded-xl bg-[#0B0E14]/90 border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00EC97]">
        <ShieldCheck className="w-4 h-4" />
        <span>Contact & Location Privacy Controls</span>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#E6EDF7]">
        <input
          type="checkbox"
          checked={locationVisibility !== 'COUNTRY_ONLY'}
          onChange={(e) =>
            onChangeLocationVisibility(
              e.target.checked ? 'COUNTRY_REGION_CITY' : 'COUNTRY_ONLY'
            )
          }
          className="mt-0.5 accent-[#00EC97]"
        />
        <span>
          <strong>Show country, region, and city on public profile</strong>
          <span className="block text-[11px] text-[#9BA8C0]">
            Helps local borrowers and lenders verify same-country physical handover eligibility.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#E6EDF7]">
        <input type="checkbox" checked={true} readOnly className="mt-0.5 accent-[#00EC97]" />
        <span>
          <strong>Hide exact residential pickup address until booking acceptance</strong>
          <span className="block text-[11px] text-[#9BA8C0]">
            Enforced by default for private listings. Only city/pickup area is shown publicly.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#E6EDF7]">
        <input
          type="checkbox"
          checked={contactSharingEnabled}
          onChange={(e) => onChangeContactSharing(e.target.checked)}
          className="mt-0.5 accent-[#00EC97]"
        />
        <span>
          <strong>Share phone number / WhatsApp after booking acceptance</strong>
          <span className="block text-[11px] text-[#9BA8C0]">
            Your phone number stays masked publicly and is only disclosed to your accepted booking
            counterparty.
          </span>
        </span>
      </label>
    </div>
  );
};

// 8. Screen A — User Profile Location & Contact Card (with Inline Editor)
export const LocationCard: React.FC<{
  profile?: ProviderProfile;
  walletAccountId: string;
  isOwnProfile?: boolean;
  onProfileUpdated?: (updated: ProviderProfile) => void;
}> = ({ profile, walletAccountId, isOwnProfile = true, onProfileUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName || walletAccountId.split('.')[0]);
  const [countryCode, setCountryCode] = useState(profile?.countryCode || 'ET');
  const [regionName, setRegionName] = useState(profile?.regionName || 'Oromia');
  const [cityName, setCityName] = useState(profile?.cityName || 'Adama');
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    profile?.phoneCountryCode || profile?.countryCode || 'ET'
  );
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '+251911234567');
  const [preferredContactMethods, setPreferredContactMethods] = useState<ContactMethodPreference[]>(
    profile?.preferredContactMethods || ['IN_APP', 'WHATSAPP']
  );
  const [contactSharingEnabled, setContactSharingEnabled] = useState(
    profile?.contactSharingEnabled ?? true
  );
  const [locationVisibility, setLocationVisibility] = useState<LocationVisibilityMode>(
    profile?.locationVisibility || 'COUNTRY_REGION_CITY'
  );

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || walletAccountId.split('.')[0]);
      setCountryCode(profile.countryCode || 'ET');
      setRegionName(profile.regionName || 'Oromia');
      setCityName(profile.cityName || 'Adama');
      setPhoneCountryCode(profile.phoneCountryCode || profile.countryCode || 'ET');
      if (profile.phoneNumber) setPhoneNumber(profile.phoneNumber);
      setPreferredContactMethods(profile.preferredContactMethods || ['IN_APP', 'WHATSAPP']);
      setContactSharingEnabled(profile.contactSharingEnabled ?? true);
      setLocationVisibility(profile.locationVisibility || 'COUNTRY_REGION_CITY');
    }
  }, [profile, walletAccountId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessBanner(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAccountId,
          displayName,
          bio: profile?.bio || 'Verified NEAR BorrowBond member.',
          countryCode,
          regionName,
          cityName,
          phoneNumber,
          phoneCountryCode,
          preferredContactMethods,
          contactSharingEnabled,
          locationVisibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update location & contact settings');
      }
      if (onProfileUpdated && data.profile) {
        onProfileUpdated(data.profile);
      }
      const pausedCount = data.countryChangeProtection?.flaggedListingIds?.length || 0;
      setSuccessBanner(
        pausedCount > 0
          ? `Location updated to ${getCountryName(countryCode)}. ${pausedCount} physical listing(s) paused pending location review.`
          : `Saved location (${getCountryName(countryCode)} · ${regionName} · ${cityName}) & contact preferences.`
      );
      setEditing(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const maskedPhone =
    profile?.phoneNumberMasked ||
    maskE164PhoneNumber(profile?.phoneNumber || phoneNumber || '+251911234567');

  const methodLabels: Record<ContactMethodPreference, string> = {
    IN_APP: 'In-app chat',
    WHATSAPP: 'WhatsApp',
    PHONE_CALL: 'Phone call',
    EMAIL: 'Email',
  };

  return (
    <div
      data-testid="profile-location-contact-card"
      className="rounded-2xl bg-[#141821] border border-white/10 p-5 shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#00EC97]/12 border border-[#00EC97]/30 flex items-center justify-center text-lg">
            <CountryFlag countryCode={profile?.countryCode || countryCode} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F8FF]">
              Location & Contact
            </h3>
            <p className="text-xs text-[#9BA8C0]">
              Determines same-country physical borrowing eligibility & post-acceptance handover
            </p>
          </div>
        </div>

        {isOwnProfile && !editing && (
          <button
            type="button"
            data-testid="edit-location-contact-btn"
            onClick={() => {
              setEditing(true);
              setSuccessBanner(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#00EC97] transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Location & Contact</span>
          </button>
        )}
      </div>

      {successBanner && (
        <div className="mt-3 p-3 rounded-xl bg-[#00EC97]/12 border border-[#00EC97]/30 text-xs text-[#00EC97] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {!editing ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-[#9BA8C0]">Country:</span>
              <span className="font-semibold text-[#F5F8FF] flex items-center gap-1.5">
                <CountryFlag countryCode={profile?.countryCode || countryCode} />
                <span>{profile?.countryName || getCountryName(countryCode)}</span>
                <span className="text-[10px] font-mono text-[#9BA8C0] bg-white/5 px-1.5 py-0.5 rounded">
                  {(profile?.countryCode || countryCode).toUpperCase()}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-[#9BA8C0]">Region:</span>
              <span className="font-semibold text-[#F5F8FF]">
                {profile?.regionName || regionName || 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-[#9BA8C0]">City:</span>
              <span className="font-semibold text-[#F5F8FF]">
                {profile?.cityName || cityName || 'Not set'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-[#9BA8C0]">Phone:</span>
              <span className="font-mono text-[#F5F8FF] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#00EC97]" />
                <span>{maskedPhone}</span>
                <span className="text-[10px] text-[#9BA8C0] font-sans">
                  (shared after booking acceptance)
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-[#9BA8C0]">Preferred Contact:</span>
              <span className="font-semibold text-[#00EC97]">
                {(profile?.preferredContactMethods || preferredContactMethods)
                  .map((m) => methodLabels[m] || m)
                  .join(' / ')}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-[#9BA8C0]">Physical Marketplace Policy:</span>
              <span className="text-[#E6EDF7] font-medium">
                Same-country ({profile?.countryName || getCountryName(countryCode)})
              </span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CountrySelect
              label="Registered Country"
              value={countryCode}
              onChange={(code) => {
                setCountryCode(code);
                const defaultRegs = getRegionsForCountry(code);
                if (defaultRegs.length > 0) {
                  setRegionName(defaultRegs[0]);
                }
              }}
            />
            <RegionSelect
              countryCode={countryCode}
              value={regionName}
              onChange={setRegionName}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5">
                City / Municipality
              </label>
              <input
                type="text"
                required
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="e.g. Adama, Nairobi, Zurich"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
              />
            </div>
          </div>

          <InternationalPhoneInput
            phoneNumber={phoneNumber}
            phoneCountryCode={phoneCountryCode}
            onChange={(nextPhone, nextPhoneCountry) => {
              setPhoneNumber(nextPhone);
              setPhoneCountryCode(nextPhoneCountry);
            }}
          />

          <ContactPreferenceSelector
            selected={preferredContactMethods}
            onChange={setPreferredContactMethods}
          />

          <ContactPrivacySettings
            locationVisibility={locationVisibility}
            contactSharingEnabled={contactSharingEnabled}
            onChangeLocationVisibility={setLocationVisibility}
            onChangeContactSharing={setContactSharingEnabled}
          />

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#9BA8C0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="save-location-contact-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00EC97] hover:bg-[#00EC97]/90 text-[#04080E] text-xs font-bold transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Location & Contact'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// 9. Screen B — Physical Listing Location & Pickup Address Form
export interface PhysicalListingLocationFormState {
  countryCode: string;
  regionName: string;
  cityName: string;
  pickupArea: string;
  street: string;
  buildingName: string;
  postalCode: string;
  pickupVisibility: PickupAddressVisibility;
  publicAddressConfirmed: boolean;
  pickupInstructions: string;
}

export const AddressForm: React.FC<{
  value: PhysicalListingLocationFormState;
  lenderProfile?: ProviderProfile;
  onChange: (next: PhysicalListingLocationFormState) => void;
}> = ({ value, lenderProfile, onChange }) => {
  const lenderCountry = (lenderProfile?.countryCode || 'ET').toUpperCase();
  const countryMismatchWithProfile =
    Boolean(value.countryCode) && value.countryCode.toUpperCase() !== lenderCountry;

  const formattedFullAddress = [
    value.street,
    value.buildingName,
    value.pickupArea,
    value.cityName,
    value.regionName,
    value.postalCode,
    getCountryName(value.countryCode),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      data-testid="physical-listing-location-form"
      className="rounded-2xl bg-[#101520] border border-[#00EC97]/25 p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#00EC97]" />
          <div>
            <h4 className="text-sm font-bold text-[#F5F8FF]">
              Physical Item Location & Pickup Address
            </h4>
            <p className="text-xs text-[#9BA8C0]">
              Physical items enforce same-country borrowing. Borrowers must be in the same country
              as your profile and listing.
            </p>
          </div>
        </div>
        <CountryBadge
          countryCode={value.countryCode}
          regionName={value.regionName}
          cityName={value.cityName}
          pickupArea={value.pickupArea}
        />
      </div>

      {countryMismatchWithProfile && (
        <div
          data-testid="lender-country-mismatch-warning"
          className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-amber-300">Lender & Listing Country Must Match</strong>
            Your physical listing must be located in the same country as your registered profile (
            {getCountryFlagEmoji(lenderCountry)} {getCountryName(lenderCountry)}). Update your
            profile or listing location before publishing.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CountrySelect
          label="Item Country *"
          value={value.countryCode}
          onChange={(code) => {
            const regs = getRegionsForCountry(code);
            onChange({
              ...value,
              countryCode: code,
              regionName: regs[0] || value.regionName,
            });
          }}
        />
        <RegionSelect
          label="Region / State / Province *"
          countryCode={value.countryCode}
          value={value.regionName}
          onChange={(regionName) => onChange({ ...value, regionName })}
        />
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5">
            City *
          </label>
          <input
            type="text"
            value={value.cityName}
            onChange={(e) => onChange({ ...value, cityName: e.target.value })}
            placeholder="e.g. Adama"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5">
            Pickup Area / Neighborhood (Shown Publicly) *
          </label>
          <input
            type="text"
            value={value.pickupArea}
            onChange={(e) => onChange({ ...value, pickupArea: e.target.value })}
            placeholder="e.g. Adama Central / Bole Medhanialem"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5">
            Street / Pickup Address *
          </label>
          <input
            type="text"
            value={value.street}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            placeholder="e.g. Kebele 04, Ras Mekonnen Avenue"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5">
            Building / Landmark (Optional)
          </label>
          <input
            type="text"
            value={value.buildingName}
            onChange={(e) => onChange({ ...value, buildingName: e.target.value })}
            placeholder="e.g. Rift Valley Innovation Hub, Suite 204"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5">
            Postal Code (Optional)
          </label>
          <input
            type="text"
            value={value.postalCode}
            onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
            placeholder="e.g. 1888"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-1.5">
            Pickup Instructions *
          </label>
          <input
            type="text"
            value={value.pickupInstructions}
            onChange={(e) => onChange({ ...value, pickupInstructions: e.target.value })}
            placeholder="Bring government ID & verify QR serial"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/12 text-sm text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
          />
        </div>
      </div>

      {/* Pickup Address Visibility Control */}
      <div className="pt-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#9BA8C0] mb-2">
          Pickup Address Visibility
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                pickupVisibility: 'PRIVATE',
                publicAddressConfirmed: false,
              })
            }
            className={`p-3.5 rounded-xl border text-left transition ${
              value.pickupVisibility === 'PRIVATE'
                ? 'bg-[#00EC97]/12 border-[#00EC97] text-[#F5F8FF]'
                : 'bg-[#0B0E14] border-white/10 text-[#9BA8C0] hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#00EC97]" />
                Private Until Booking Is Accepted (Recommended)
              </span>
              {value.pickupVisibility === 'PRIVATE' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#00EC97] text-[#04080E] font-bold">
                  Default
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#9BA8C0] mt-1">
              Show Country, Region, City, and Pickup Area publicly. Reveal exact street/building
              address only after you accept a booking.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                pickupVisibility: 'PUBLIC',
              })
            }
            className={`p-3.5 rounded-xl border text-left transition ${
              value.pickupVisibility === 'PUBLIC'
                ? 'bg-sky-500/15 border-sky-400 text-[#F5F8FF]'
                : 'bg-[#0B0E14] border-white/10 text-[#9BA8C0] hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                Public Pickup Location (Store / Campus / Collection Point)
              </span>
            </div>
            <p className="text-[11px] text-[#9BA8C0] mt-1">
              Display the full pickup address on the public listing page. Use only for commercial
              studios, campuses, or public desks.
            </p>
          </button>
        </div>

        {value.pickupVisibility === 'PUBLIC' && (
          <label className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-sky-500/10 border border-sky-400/30 cursor-pointer text-xs text-sky-100">
            <input
              type="checkbox"
              checked={value.publicAddressConfirmed}
              onChange={(e) =>
                onChange({ ...value, publicAddressConfirmed: e.target.checked })
              }
              className="mt-0.5 accent-[#00EC97]"
            />
            <span>
              <strong>
                I confirm this is a public or approved pickup point and safe to display publicly.
              </strong>
              <span className="block text-[11px] text-sky-200/80">
                Never publish a private residential home address as a public pickup location.
              </span>
            </span>
          </label>
        )}
      </div>

      {/* Live Address Disclosure Preview */}
      <div className="rounded-xl bg-[#0B0E14] border border-white/10 p-3.5 text-xs space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#9BA8C0]">
          Live Marketplace Location Preview
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[#9BA8C0]">Public Listing Card & Page:</span>
          <span className="font-semibold text-[#F5F8FF]">
            {getCountryFlagEmoji(value.countryCode)} {getCountryName(value.countryCode)} ·{' '}
            {value.regionName || 'Region'} · {value.cityName || 'City'}
            {value.pickupArea ? ` (${value.pickupArea})` : ''}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[#9BA8C0]">Exact Pickup Address Before Acceptance:</span>
          {value.pickupVisibility === 'PUBLIC' && value.publicAddressConfirmed ? (
            <span className="font-mono text-sky-300">
              {formattedFullAddress || 'Enter street address'} (Public Pickup Point)
            </span>
          ) : (
            <span className="text-[#00EC97] font-medium flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Shared after booking acceptance
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// 10. Same-Country Indicator Pill
export const SameCountryIndicator: React.FC<{
  listing: MarketplaceListing;
  eligibility: PhysicalEligibilityResult;
}> = ({ listing, eligibility }) => {
  if (listing.resourceType === 'DIGITAL') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-semibold">
        <Globe className="w-3.5 h-3.5" />
        <span>Global Digital Access · Instant Escrow Token</span>
      </span>
    );
  }

  if (eligibility.eligible) {
    return (
      <span
        data-testid="same-country-eligible-badge"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00EC97]/15 border border-[#00EC97]/35 text-[#00EC97] text-xs font-semibold"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>
          Eligible in Your Country ({getCountryFlagEmoji(listing.countryCode)}{' '}
          {listing.countryName || getCountryName(listing.countryCode)})
        </span>
      </span>
    );
  }

  return (
    <span
      data-testid="same-country-restricted-badge"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold"
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>
        Same-Country Only ({getCountryFlagEmoji(listing.countryCode)}{' '}
        {listing.countryName || getCountryName(listing.countryCode)})
      </span>
    </span>
  );
};

// 11. Screen E — Country Mismatch Alert Component
export const CountryMismatchAlert: React.FC<{
  eligibility: PhysicalEligibilityResult;
  listing: MarketplaceListing;
  onExploreEligiblePhysical?: () => void;
  onExploreDigital?: () => void;
  onUpdateProfileLocation?: () => void;
}> = ({
  eligibility,
  listing,
  onExploreEligiblePhysical,
  onExploreDigital,
  onUpdateProfileLocation,
}) => {
  if (eligibility.eligible) return null;

  return (
    <div
      data-testid="country-mismatch-alert"
      className="rounded-2xl bg-amber-500/12 border-2 border-amber-500/40 p-5 space-y-3.5 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-300" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-amber-200">{eligibility.title}</h4>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">
              Your Country: {getCountryFlagEmoji(eligibility.borrowerCountryCode)}{' '}
              {eligibility.borrowerCountryName || 'Unset'} vs Item:{' '}
              {getCountryFlagEmoji(eligibility.listingCountryCode)}{' '}
              {eligibility.listingCountryName || 'Unset'}
            </span>
          </div>
          <p className="text-xs text-amber-100/90 leading-relaxed">{eligibility.message}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {onExploreEligiblePhysical && (
          <button
            type="button"
            onClick={onExploreEligiblePhysical}
            className="px-3.5 py-2 rounded-xl bg-[#00EC97] text-[#04080E] text-xs font-bold hover:bg-[#00EC97]/90 transition"
          >
            Explore eligible physical listings
          </button>
        )}
        {onExploreDigital && (
          <button
            type="button"
            onClick={onExploreDigital}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[#F5F8FF] text-xs font-semibold border border-white/15 transition"
          >
            Explore digital resources
          </button>
        )}
        {onUpdateProfileLocation && (
          <button
            type="button"
            onClick={onUpdateProfileLocation}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-400/30 transition"
          >
            Update profile location
          </button>
        )}
      </div>
    </div>
  );
};

// 12. Screen D — Physical Listing Detail Page Location & Pickup Section
export const PhysicalListingLocation: React.FC<{
  listing: MarketplaceListing;
  lenderProfile?: ProviderProfile;
  eligibility: PhysicalEligibilityResult;
}> = ({ listing, lenderProfile, eligibility }) => {
  if (listing.resourceType === 'DIGITAL') {
    return (
      <div className="rounded-2xl bg-[#141821] border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#00EC97] flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span>Global Digital Access & Delivery</span>
          </h3>
          <CountryBadge />
        </div>
        <p className="text-xs text-[#9BA8C0] leading-relaxed">
          This digital resource is accessible worldwide with no country restrictions. Temporary
          scoped credentials are issued automatically once the provider accepts your escrow
          agreement.
        </p>
      </div>
    );
  }

  const isPublicAddress =
    listing.pickupVisibility === 'PUBLIC' && Boolean(listing.publicAddressConfirmed);
  const countryCode = listing.countryCode || lenderProfile?.countryCode || 'ET';
  const countryName = listing.countryName || getCountryName(countryCode);
  const regionName = listing.regionName || lenderProfile?.regionName || 'Oromia';
  const cityName = listing.cityName || lenderProfile?.cityName || 'Adama';
  const pickupArea = listing.pickupArea || `${cityName} Central`;

  const methodLabels: Record<ContactMethodPreference, string> = {
    IN_APP: 'In-app chat',
    WHATSAPP: 'WhatsApp',
    PHONE_CALL: 'Phone call',
    EMAIL: 'Email',
  };
  const preferredMethodsText = (
    lenderProfile?.preferredContactMethods || ['IN_APP', 'WHATSAPP']
  )
    .map((m) => methodLabels[m] || m)
    .join(' / ');

  return (
    <div
      data-testid="physical-listing-location-card"
      className="rounded-2xl bg-[#141821] border border-white/10 p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#00EC97]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F8FF]">
            Location & Pickup
          </h3>
        </div>
        <SameCountryIndicator listing={listing} eligibility={eligibility} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#0B0E14] border border-white/8 flex items-center justify-between">
          <span className="text-[#9BA8C0]">Country:</span>
          <span className="font-semibold text-[#F5F8FF] flex items-center gap-1.5">
            <CountryFlag countryCode={countryCode} />
            <span>{countryName}</span>
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#0B0E14] border border-white/8 flex items-center justify-between">
          <span className="text-[#9BA8C0]">Region:</span>
          <span className="font-semibold text-[#F5F8FF]">{regionName}</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0B0E14] border border-white/8 flex items-center justify-between">
          <span className="text-[#9BA8C0]">City:</span>
          <span className="font-semibold text-[#F5F8FF]">{cityName}</span>
        </div>

        <div className="p-3 rounded-xl bg-[#0B0E14] border border-white/8 flex items-center justify-between">
          <span className="text-[#9BA8C0]">Pickup Area:</span>
          <span className="font-semibold text-[#F5F8FF]">{pickupArea}</span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-white/10 space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[#9BA8C0] font-medium">Exact Pickup Address:</span>
          {isPublicAddress && listing.pickupAddress ? (
            <span
              data-testid="public-pickup-address-value"
              className="font-semibold text-sky-300 flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{listing.pickupAddress}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-200">
                Public Pickup Point
              </span>
            </span>
          ) : (
            <span
              data-testid="private-pickup-address-locked"
              className="font-semibold text-[#00EC97] flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Shared after booking acceptance</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
          <span className="text-[#9BA8C0] font-medium">Preferred Contact:</span>
          <span className="text-[#E6EDF7] font-medium">
            {preferredMethodsText} after booking acceptance
          </span>
        </div>
      </div>
    </div>
  );
};

// 13. Screen F — Booking Contact & Pickup Card After Acceptance
export const BookingContactCard: React.FC<{
  booking: OnChainBooking;
  callerWallet: string;
}> = ({ booking, callerWallet }) => {
  const [contactData, setContactData] = useState<AuthorizedBookingContactResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [inAppMessageText, setInAppMessageText] = useState('');
  const [sentMessageNotice, setSentMessageNotice] = useState<string | null>(null);

  const isParticipant = callerWallet === booking.borrower || callerWallet === booking.lender;
  const isPostAcceptance = [
    'ACCEPTED',
    'HANDOVER_PENDING',
    'ACTIVE',
    'RETURN_REQUESTED',
    'DISPUTED',
    'COMPLETED',
    'REFUNDED',
  ].includes(booking.status);

  useEffect(() => {
    if (!isParticipant || !isPostAcceptance) {
      setContactData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/bookings/${encodeURIComponent(booking.bookingId)}/contact-details?callerWallet=${encodeURIComponent(
        callerWallet
      )}`
    )
      .then((r) => r.json())
      .then((json: AuthorizedBookingContactResponse) => {
        if (!cancelled) {
          setContactData(json);
        }
      })
      .catch(() => {
        if (!cancelled) setContactData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [booking.bookingId, booking.status, callerWallet, isParticipant, isPostAcceptance]);

  if (!isParticipant) return null;

  if (!isPostAcceptance) {
    return (
      <div
        data-testid="booking-contact-locked-card"
        className="rounded-2xl bg-[#141821] border border-white/10 p-4 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-[#00EC97]" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F8FF]">
              Pickup & Contact Details Locked
            </h4>
            <p className="text-xs text-[#9BA8C0]">
              Exact pickup address and direct phone/WhatsApp contact unlock automatically once the
              lender accepts booking <span className="font-mono">{booking.bookingId}</span>.
            </p>
          </div>
        </div>
        <CountryFlag countryCode={booking.listingCountryCode || booking.lenderCountryCode || 'ET'} />
      </div>
    );
  }

  const counterparty = contactData?.counterparty;
  const pickup = contactData?.pickupLocation;
  const cleanDigits = counterparty?.phoneNumber?.replace(/[^\d]/g, '') || '';

  return (
    <div
      data-testid="booking-contact-unlocked-card"
      className="rounded-2xl bg-gradient-to-br from-[#141C2B] to-[#0F1520] border border-[#00EC97]/35 p-5 space-y-4 shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#00EC97]/15 border border-[#00EC97]/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#00EC97]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#F5F8FF]">
              Pickup & Contact Details (Booking Accepted)
            </h4>
            <p className="text-xs text-[#9BA8C0]">
              Authorized counterparty coordination for booking{' '}
              <span className="font-mono text-[#00EC97]">{booking.bookingId}</span>
            </p>
          </div>
        </div>

        <CountryBadge
          countryCode={pickup?.countryCode || counterparty?.countryCode || booking.listingCountryCode}
          countryName={pickup?.countryName || counterparty?.countryName}
          regionName={pickup?.regionName || counterparty?.regionName}
          cityName={pickup?.cityName || counterparty?.cityName}
        />
      </div>

      {loading ? (
        <div className="text-xs text-[#9BA8C0] py-3">
          Loading authorized pickup & contact details...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-[#0B0E14]/90 border border-white/10 p-3.5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#00EC97]">
                {counterparty?.role === 'LENDER' ? 'Lender Details' : 'Borrower Details'}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9BA8C0]">Name & Wallet:</span>
                <span className="font-semibold text-[#F5F8FF]">
                  {counterparty?.displayName} ({counterparty?.walletAccountId})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9BA8C0]">Location:</span>
                <span className="font-medium text-[#E6EDF7]">
                  {getCountryFlagEmoji(counterparty?.countryCode)} {counterparty?.countryName} ·{' '}
                  {counterparty?.regionName} · {counterparty?.cityName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9BA8C0]">Phone / WhatsApp:</span>
                {counterparty?.phoneNumber ? (
                  <span
                    data-testid="unlocked-counterparty-phone"
                    className="font-mono font-bold text-[#00EC97] flex items-center gap-1.5"
                  >
                    <span>{counterparty.phoneNumber}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(counterparty.phoneNumber || '');
                        setCopiedPhone(true);
                        setTimeout(() => setCopiedPhone(false), 1800);
                      }}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#9BA8C0]"
                      title="Copy phone number"
                    >
                      {copiedPhone ? (
                        <Check className="w-3 h-3 text-[#00EC97]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </span>
                ) : (
                  <span className="text-[#9BA8C0]">In-app coordination only</span>
                )}
              </div>
            </div>

            {pickup && (
              <div className="rounded-xl bg-[#0B0E14]/90 border border-white/10 p-3.5 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#00EC97]">
                  Authorized Pickup Location
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#9BA8C0] shrink-0">Pickup Address:</span>
                  <span
                    data-testid="unlocked-pickup-address"
                    className="font-semibold text-[#F5F8FF] text-right"
                  >
                    {pickup.exactPickupAddress}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#9BA8C0] shrink-0">Pickup Area:</span>
                  <span className="text-[#E6EDF7] text-right">
                    {pickup.pickupArea}, {pickup.cityName}, {pickup.regionName}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#9BA8C0] shrink-0">Instructions:</span>
                  <span className="text-[#9BA8C0] text-right">{pickup.pickupInstructions}</span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Contact & Pickup Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowFullModal((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00EC97] text-[#04080E] text-xs font-bold hover:bg-[#00EC97]/90 transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message</span>
            </button>

            {counterparty?.phoneNumber && (
              <>
                <a
                  href={`tel:${counterparty.phoneNumber}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-[#F5F8FF] transition"
                >
                  <Phone className="w-3.5 h-3.5 text-[#00EC97]" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${cleanDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-xs font-semibold text-emerald-300 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowFullModal((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#E6EDF7] transition"
            >
              <Navigation className="w-3.5 h-3.5 text-[#00EC97]" />
              <span>View authorized pickup details</span>
            </button>
          </div>

          {showFullModal && (
            <div className="rounded-xl bg-[#0B0E14] border border-white/15 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#00EC97]">
                  Direct Handover Coordination Message to {counterparty?.displayName}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFullModal(false)}
                  className="text-[#9BA8C0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {pickup?.structuredAddress && (
                <div className="text-[11px] text-[#9BA8C0] bg-white/5 p-2.5 rounded-lg font-mono">
                  Structured Pickup Record: {pickup.structuredAddress.street}
                  {pickup.structuredAddress.buildingName
                    ? ` · ${pickup.structuredAddress.buildingName}`
                    : ''}{' '}
                  · {pickup.structuredAddress.neighborhood || pickup.pickupArea} ·{' '}
                  {pickup.structuredAddress.city}, {pickup.structuredAddress.region}{' '}
                  {pickup.structuredAddress.postalCode || ''} ({pickup.countryCode})
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inAppMessageText}
                  onChange={(e) => setInAppMessageText(e.target.value)}
                  placeholder="Coordinate handover time or confirm serial check..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#141821] border border-white/10 text-xs text-[#F5F8FF] focus:outline-none focus:border-[#00EC97]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!inAppMessageText.trim()) return;
                    setSentMessageNotice(
                      `Sent to ${counterparty?.displayName}: "${inAppMessageText.trim()}"`
                    );
                    setInAppMessageText('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#00EC97] text-[#04080E] text-xs font-bold"
                >
                  Send
                </button>
              </div>
              {sentMessageNotice && (
                <div className="text-[11px] text-[#00EC97] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{sentMessageNotice}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
