// Country-Aware Physical Marketplace, ISO 3166-1 Alpha-2 Eligibility Engine,
// Dynamic Country Flags, International E.164 Phone Validator, and Role-Aware Contact Privacy Engine.

import type { MarketplaceListing, ProviderProfile } from '../security/policyEngine';
import type { OnChainBooking } from '../near/escrowStateMachine';

export type ContactMethodType = 'WHATSAPP' | 'PHONE_CALL' | 'IN_APP' | 'EMAIL';
export type ContactMethodPreference = ContactMethodType;

export type PickupAddressVisibility = 'PRIVATE' | 'PUBLIC';

export interface StructuredPickupAddress {
  street: string;
  buildingName?: string;
  neighborhood?: string;
  city: string;
  region: string;
  postalCode?: string;
  countryCode: string;
  countryName?: string;
}

export type StructuredPhysicalAddress = StructuredPickupAddress;

export interface LocationVisibilitySettings {
  countryPublic: boolean;
  regionPublic: boolean;
  cityPublic: boolean;
  exactAddressPrivate: boolean;
}

export type LocationVisibilityMode =
  | 'COUNTRY_REGION_CITY'
  | 'COUNTRY_REGION'
  | 'COUNTRY_ONLY'
  | LocationVisibilitySettings;

export interface CountryMetadata {
  code: string; // Canonical ISO 3166-1 alpha-2 uppercase (e.g. 'ET', 'KE', 'CH')
  name: string; // Full English name (e.g. 'Ethiopia', 'Kenya', 'Switzerland')
  dialCode: string; // E.164 country calling prefix (e.g. '+251')
  phoneMinDigits: number; // Subscriber number min digits (excluding dialCode)
  phoneMaxDigits: number; // Subscriber number max digits (excluding dialCode)
  examplePhone?: string;
  regions: string[]; // First-level administrative divisions (regions/states/provinces/cantons)
}

export const COUNTRY_CATALOG: CountryMetadata[] = [
  {
    code: 'ET',
    name: 'Ethiopia',
    dialCode: '+251',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '911 234 567',
    regions: [
      'Oromia',
      'Addis Ababa',
      'Amhara',
      'Tigray',
      'Sidama',
      'Somali',
      'Afar',
      'South Ethiopia',
      'Central Ethiopia',
      'Southwest Ethiopia',
      'Benishangul-Gumuz',
      'Gambela',
      'Harari',
      'Dire Dawa',
    ],
  },
  {
    code: 'KE',
    name: 'Kenya',
    dialCode: '+254',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '712 345 678',
    regions: [
      'Nairobi',
      'Mombasa',
      'Kiambu',
      'Nakuru',
      'Kisumu',
      'Uasin Gishu',
      'Machakos',
      'Kajiado',
      'Kilifi',
      'Nyeri',
    ],
  },
  {
    code: 'CH',
    name: 'Switzerland',
    dialCode: '+41',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '79 123 45 67',
    regions: [
      'Zurich',
      'Geneva',
      'Basel-Stadt',
      'Bern',
      'Vaud',
      'Zug',
      'Lucerne',
      'St. Gallen',
      'Ticino',
      'Aargau',
    ],
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    phoneMinDigits: 10,
    phoneMaxDigits: 10,
    examplePhone: '415 555 2671',
    regions: [
      'California',
      'New York',
      'Texas',
      'Washington',
      'Massachusetts',
      'Florida',
      'Illinois',
      'Colorado',
      'Georgia',
      'Virginia',
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    phoneMinDigits: 10,
    phoneMaxDigits: 10,
    examplePhone: '7700 900077',
    regions: [
      'Greater London',
      'South East',
      'North West',
      'Scotland',
      'West Midlands',
      'East of England',
      'South West',
      'Wales',
      'Yorkshire and the Humber',
      'Northern Ireland',
    ],
  },
  {
    code: 'NG',
    name: 'Nigeria',
    dialCode: '+234',
    phoneMinDigits: 10,
    phoneMaxDigits: 10,
    examplePhone: '803 123 4567',
    regions: [
      'Lagos',
      'Federal Capital Territory (Abuja)',
      'Rivers',
      'Oyo',
      'Kano',
      'Enugu',
      'Kaduna',
      'Ogun',
      'Delta',
      'Anambra',
    ],
  },
  {
    code: 'ZA',
    name: 'South Africa',
    dialCode: '+27',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '82 123 4567',
    regions: [
      'Gauteng',
      'Western Cape',
      'KwaZulu-Natal',
      'Eastern Cape',
      'Free State',
      'Limpopo',
      'Mpumalanga',
      'North West',
      'Northern Cape',
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    phoneMinDigits: 10,
    phoneMaxDigits: 11,
    examplePhone: '1512 3456789',
    regions: [
      'Berlin',
      'Bavaria',
      'Baden-Württemberg',
      'North Rhine-Westphalia',
      'Hesse',
      'Hamburg',
      'Saxony',
      'Lower Saxony',
    ],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '50 123 4567',
    regions: [
      'Dubai',
      'Abu Dhabi',
      'Sharjah',
      'Ajman',
      'Ras Al Khaimah',
      'Fujairah',
      'Umm Al Quwain',
    ],
  },
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    phoneMinDigits: 10,
    phoneMaxDigits: 10,
    examplePhone: '98765 43210',
    regions: [
      'Karnataka',
      'Maharashtra',
      'Delhi',
      'Tamil Nadu',
      'Telangana',
      'Gujarat',
      'Uttar Pradesh',
      'West Bengal',
      'Kerala',
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    phoneMinDigits: 10,
    phoneMaxDigits: 10,
    examplePhone: '416 555 0199',
    regions: [
      'Ontario',
      'British Columbia',
      'Quebec',
      'Alberta',
      'Manitoba',
      'Nova Scotia',
      'Saskatchewan',
    ],
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '6 12 34 56 78',
    regions: [
      'Île-de-France',
      'Auvergne-Rhône-Alpes',
      'Provence-Alpes-Côte d’Azur',
      'Occitanie',
      'Nouvelle-Aquitaine',
      'Hauts-de-France',
    ],
  },
  {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    phoneMinDigits: 8,
    phoneMaxDigits: 8,
    examplePhone: '8123 4567',
    regions: [
      'Central Region',
      'East Region',
      'North Region',
      'North-East Region',
      'West Region',
    ],
  },
  {
    code: 'JP',
    name: 'Japan',
    dialCode: '+81',
    phoneMinDigits: 9,
    phoneMaxDigits: 10,
    examplePhone: '90 1234 5678',
    regions: [
      'Tokyo',
      'Osaka',
      'Kanagawa',
      'Aichi',
      'Kyoto',
      'Fukuoka',
      'Hokkaido',
    ],
  },
  {
    code: 'RW',
    name: 'Rwanda',
    dialCode: '+250',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '788 123 456',
    regions: [
      'Kigali',
      'Eastern Province',
      'Northern Province',
      'Southern Province',
      'Western Province',
    ],
  },
  {
    code: 'UG',
    name: 'Uganda',
    dialCode: '+256',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '772 123 456',
    regions: ['Central Region (Kampala)', 'Eastern Region', 'Northern Region', 'Western Region'],
  },
  {
    code: 'TZ',
    name: 'Tanzania',
    dialCode: '+255',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '754 123 456',
    regions: ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Zanzibar', 'Kilimanjaro'],
  },
  {
    code: 'GH',
    name: 'Ghana',
    dialCode: '+233',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '24 123 4567',
    regions: ['Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Northern'],
  },
  {
    code: 'EG',
    name: 'Egypt',
    dialCode: '+20',
    phoneMinDigits: 10,
    phoneMaxDigits: 10,
    examplePhone: '100 123 4567',
    regions: ['Cairo', 'Giza', 'Alexandria', 'Red Sea', 'Luxor', 'Aswan'],
  },
  {
    code: 'BR',
    name: 'Brazil',
    dialCode: '+55',
    phoneMinDigits: 10,
    phoneMaxDigits: 11,
    examplePhone: '11 98765 4321',
    regions: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Paraná', 'Bahia', 'Santa Catarina'],
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '412 345 678',
    regions: [
      'New South Wales',
      'Victoria',
      'Queensland',
      'Western Australia',
      'South Australia',
      'Australian Capital Territory',
    ],
  },
  {
    code: 'NL',
    name: 'Netherlands',
    dialCode: '+31',
    phoneMinDigits: 9,
    phoneMaxDigits: 9,
    examplePhone: '6 12345678',
    regions: ['North Holland', 'South Holland', 'Utrecht', 'North Brabant', 'Gelderland'],
  },
  {
    code: 'SE',
    name: 'Sweden',
    dialCode: '+46',
    phoneMinDigits: 7,
    phoneMaxDigits: 10,
    examplePhone: '70 123 45 67',
    regions: ['Stockholm', 'Västra Götaland', 'Skåne', 'Uppsala', 'Östergötland'],
  },
  {
    code: 'KR',
    name: 'South Korea',
    dialCode: '+82',
    phoneMinDigits: 9,
    phoneMaxDigits: 10,
    examplePhone: '10 1234 5678',
    regions: ['Seoul', 'Gyeonggi', 'Busan', 'Incheon', 'Daejeon', 'Jeju'],
  },
];

const COUNTRY_BY_CODE: Record<string, CountryMetadata> = Object.fromEntries(
  COUNTRY_CATALOG.map((c) => [c.code, c])
);

/**
 * Normalizes any ISO 3166-1 alpha-2 country code string to canonical uppercase 2-letter code.
 */
export function normalizeCountryCode(rawCode?: string | null): string {
  if (!rawCode || typeof rawCode !== 'string') return '';
  const cleaned = rawCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cleaned)) return '';
  return cleaned;
}

/**
 * Dynamically generates the Unicode country flag emoji from a canonical ISO 3166-1 alpha-2 country code.
 * Never hardcodes flags; computes regional indicator symbols directly from the 2-letter code.
 */
export function getCountryFlagEmoji(countryCode?: string | null): string {
  const code = normalizeCountryCode(countryCode);
  if (code.length !== 2) return '🌐';
  const first = 0x1f1e6 + (code.charCodeAt(0) - 65);
  const second = 0x1f1e6 + (code.charCodeAt(1) - 65);
  return String.fromCodePoint(first, second);
}

export function getCountryByCode(countryCode?: string | null): CountryMetadata | undefined {
  const code = normalizeCountryCode(countryCode);
  return COUNTRY_BY_CODE[code];
}

export function getCountryName(countryCode?: string | null): string {
  const meta = getCountryByCode(countryCode);
  if (meta) return meta.name;
  const code = normalizeCountryCode(countryCode);
  return code || 'Unspecified Country';
}

export function getRegionsForCountry(countryCode?: string | null): string[] {
  const meta = getCountryByCode(countryCode);
  return meta?.regions ?? [];
}

export function formatLocationSummary(params: {
  countryCode?: string | null;
  countryName?: string | null;
  regionName?: string | null;
  cityName?: string | null;
  includeFlag?: boolean;
}): string {
  const code = normalizeCountryCode(params.countryCode);
  const resolvedCountry =
    (params.countryName && params.countryName.trim()) ||
    (code ? getCountryName(code) : '');
  const parts = [
    resolvedCountry,
    params.regionName?.trim(),
    params.cityName?.trim(),
  ].filter(Boolean);
  const joined = parts.join(' · ') || 'Global';
  if (params.includeFlag && code) {
    return `${getCountryFlagEmoji(code)} ${joined}`;
  }
  return joined;
}

export function searchCountries(query: string): CountryMetadata[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRY_CATALOG;
  return COUNTRY_CATALOG.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.includes(q)
  );
}

export interface PhoneValidationResult {
  valid: boolean;
  e164: string; // e.g. '+251911234567'
  normalizedE164: string; // e.g. '+251911234567'
  formattedDisplay: string; // e.g. '+251 911 234 567'
  maskedDisplay: string; // e.g. '+251 ••• ••• 567'
  maskedPreview: string; // e.g. '+251 ••• ••• 567'
  phoneCountryCode: string; // ISO-2 of the phone calling code (can differ from profile countryCode)
  dialCode: string; // e.g. '+251'
  subscriberDigits: string;
  error?: string;
}

/**
 * Validates and normalizes an international phone number into canonical E.164 format.
 * Supports phone numbers whose calling code belongs to a different country than the user's profile country.
 */
export function validateAndNormalizePhone(
  rawInput: string,
  phoneCountryCode: string
): PhoneValidationResult {
  const code = normalizeCountryCode(phoneCountryCode) || 'ET';
  const countryMeta = getCountryByCode(code) || COUNTRY_BY_CODE['ET'];
  const dialCode = countryMeta.dialCode; // e.g. '+251'
  const dialDigits = dialCode.replace(/\D/g, '');

  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      e164: '',
      normalizedE164: '',
      formattedDisplay: '',
      maskedDisplay: '',
      maskedPreview: '',
      phoneCountryCode: code,
      dialCode,
      subscriberDigits: '',
      error: 'Phone number is empty.',
    };
  }

  // Strip allowed formatting characters (spaces, dashes, parentheses)
  const digitsOnly = trimmed.replace(/[^\d+]/g, '');
  let subscriber = '';

  if (digitsOnly.startsWith('+')) {
    const withoutPlus = digitsOnly.slice(1);
    if (withoutPlus.startsWith(dialDigits)) {
      subscriber = withoutPlus.slice(dialDigits.length);
    } else {
      const matchedOther = [...COUNTRY_CATALOG]
        .sort((a, b) => b.dialCode.length - a.dialCode.length)
        .find((c) => withoutPlus.startsWith(c.dialCode.slice(1)));
      if (matchedOther && matchedOther.code === code) {
        subscriber = withoutPlus.slice(matchedOther.dialCode.length - 1);
      } else {
        subscriber = withoutPlus;
      }
    }
  } else {
    subscriber = digitsOnly;
  }

  // Remove leading trunk '0' if user entered local format like 0911234567 for a 9-digit country
  if (
    subscriber.startsWith('0') &&
    subscriber.length - 1 >= countryMeta.phoneMinDigits &&
    subscriber.length - 1 <= countryMeta.phoneMaxDigits
  ) {
    subscriber = subscriber.slice(1);
  }

  if (!/^\d+$/.test(subscriber)) {
    return {
      valid: false,
      e164: '',
      normalizedE164: '',
      formattedDisplay: '',
      maskedDisplay: '',
      maskedPreview: '',
      phoneCountryCode: code,
      dialCode,
      subscriberDigits: subscriber,
      error: 'Phone number must contain only digits.',
    };
  }

  if (
    subscriber.length < countryMeta.phoneMinDigits ||
    subscriber.length > countryMeta.phoneMaxDigits
  ) {
    const expectedLabel =
      countryMeta.phoneMinDigits === countryMeta.phoneMaxDigits
        ? `${countryMeta.phoneMinDigits} digits`
        : `${countryMeta.phoneMinDigits}–${countryMeta.phoneMaxDigits} digits`;
    return {
      valid: false,
      e164: '',
      normalizedE164: '',
      formattedDisplay: '',
      maskedDisplay: '',
      maskedPreview: '',
      phoneCountryCode: code,
      dialCode,
      subscriberDigits: subscriber,
      error: `Invalid phone number length for ${countryMeta.name} (${dialCode}). Expected ${expectedLabel} after country code.`,
    };
  }

  const e164 = `${dialCode}${subscriber}`;
  const groups: string[] = [];
  let rest = subscriber;
  while (rest.length > 4) {
    groups.push(rest.slice(0, 3));
    rest = rest.slice(3);
  }
  if (rest) groups.push(rest);

  const formattedDisplay = `${dialCode} ${groups.join(' ')}`;
  const lastThree = subscriber.slice(-3);
  const maskedDisplay = `${dialCode} ••• ••• ${lastThree}`;

  return {
    valid: true,
    e164,
    normalizedE164: e164,
    formattedDisplay,
    maskedDisplay,
    maskedPreview: maskedDisplay,
    phoneCountryCode: code,
    dialCode,
    subscriberDigits: subscriber,
  };
}

/**
 * Masks an already-stored E.164 phone number for privacy-safe display.
 */
export function maskE164PhoneNumber(
  e164?: string | null,
  phoneCountryCode?: string | null
): string {
  if (!e164 || typeof e164 !== 'string') return 'Not provided';
  const meta = getCountryByCode(phoneCountryCode);
  const dialCode = meta?.dialCode || (e164.startsWith('+') ? e164.slice(0, 4) : '+•••');
  const lastThree = e164.replace(/\D/g, '').slice(-3);
  if (!lastThree) return 'Protected';
  return `${dialCode} ••• ••• ${lastThree}`;
}

export function formatContactMethodLabel(method: ContactMethodType): string {
  switch (method) {
    case 'WHATSAPP':
      return 'WhatsApp';
    case 'PHONE_CALL':
      return 'Phone Call';
    case 'IN_APP':
      return 'In-App Message';
    case 'EMAIL':
      return 'Email';
  }
}

export interface PhysicalListingValidationInput {
  resourceType?: 'PHYSICAL' | 'DIGITAL';
  lenderCountryCode?: string;
  listingCountryCode?: string;
  countryCode?: string;
  regionName?: string;
  cityName?: string;
  pickupAddress?: string;
  pickupArea?: string;
  structuredAddress?: Partial<StructuredPickupAddress>;
  pickupVisibility?: PickupAddressVisibility;
  publicAddressConfirmed?: boolean;
  pickupInstructions?: string;
}

export interface PhysicalListingValidationResult {
  valid: boolean;
  errors: string[];
  errorCode?:
    | 'MISSING_PROFILE_COUNTRY'
    | 'MISSING_LISTING_COUNTRY'
    | 'MISSING_LISTING_REGION_OR_CITY'
    | 'MISSING_PICKUP_ADDRESS'
    | 'LENDER_COUNTRY_MISMATCH'
    | 'PUBLIC_ADDRESS_CONFIRMATION_REQUIRED';
  errorMessage?: string;
  normalizedCountryCode?: string;
  normalizedCountryName?: string;
  formattedAddressPreview?: string;
}

/**
 * Validates creation or update of a listing.
 * Digital listings bypass physical location requirements.
 * Physical listings must specify country, region, city, and pickup address,
 * and the listing country MUST match the lender's profile country.
 */
export function validatePhysicalListingCreation(
  input: PhysicalListingValidationInput,
  lenderProfile?: ProviderProfile
): PhysicalListingValidationResult {
  if (input.resourceType === 'DIGITAL') {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];
  let firstErrorCode: PhysicalListingValidationResult['errorCode'];

  const listingCountry = normalizeCountryCode(
    input.listingCountryCode !== undefined ? input.listingCountryCode : input.countryCode
  );
  if (!listingCountry || !getCountryByCode(listingCountry)) {
    firstErrorCode = firstErrorCode || 'MISSING_LISTING_COUNTRY';
    errors.push('Please select a valid country for your physical listing before publishing.');
  }

  const lenderCountry = normalizeCountryCode(
    input.lenderCountryCode !== undefined ? input.lenderCountryCode : lenderProfile?.countryCode
  );
  if (!lenderCountry) {
    firstErrorCode = firstErrorCode || 'MISSING_PROFILE_COUNTRY';
    errors.push(
      'Your user profile must have a registered country before publishing a physical listing. Update your profile location first.'
    );
  } else if (listingCountry && listingCountry !== lenderCountry) {
    firstErrorCode = firstErrorCode || 'LENDER_COUNTRY_MISMATCH';
    errors.push(
      'Your physical listing must be located in the same country as your registered profile. Update your profile or listing location before publishing.'
    );
  }

  const regionName = (input.regionName || input.structuredAddress?.region || '').trim();
  const cityName = (input.cityName || input.structuredAddress?.city || '').trim();
  if (!regionName) {
    firstErrorCode = firstErrorCode || 'MISSING_LISTING_REGION_OR_CITY';
    errors.push('Please provide the region, state, or province for physical item pickup.');
  }
  if (!cityName) {
    firstErrorCode = firstErrorCode || 'MISSING_LISTING_REGION_OR_CITY';
    errors.push('Please provide the city or town for physical item pickup.');
  }

  const street = (input.structuredAddress?.street || '').trim();
  const building = (input.structuredAddress?.buildingName || '').trim();
  const neighborhood = (input.structuredAddress?.neighborhood || input.pickupArea || '').trim();
  const postalCode = (input.structuredAddress?.postalCode || '').trim();

  const composedAddress = [
    building,
    street,
    neighborhood,
    cityName,
    regionName,
    postalCode,
    listingCountry ? getCountryName(listingCountry) : '',
  ]
    .filter(Boolean)
    .join(', ');

  const rawAddress = (input.pickupAddress || '').trim() || (street ? composedAddress : '');
  if (!rawAddress || rawAddress.length < 4) {
    firstErrorCode = firstErrorCode || 'MISSING_PICKUP_ADDRESS';
    errors.push(
      'Please provide the pickup street or address where the physical item can be collected.'
    );
  }

  const visibility: PickupAddressVisibility =
    input.pickupVisibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';
  if (visibility === 'PUBLIC' && input.publicAddressConfirmed !== true) {
    firstErrorCode = firstErrorCode || 'PUBLIC_ADDRESS_CONFIRMATION_REQUIRED';
    errors.push(
      'Public pickup locations require explicit confirmation that the address is a public collection point or registered business.'
    );
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      errorCode: firstErrorCode,
      errorMessage: errors[0],
    };
  }

  return {
    valid: true,
    errors: [],
    normalizedCountryCode: listingCountry,
    normalizedCountryName: getCountryName(listingCountry),
    formattedAddressPreview: rawAddress,
  };
}

export interface PhysicalEligibilityResult {
  eligible: boolean;
  isGlobalDigital: boolean;
  reasonCode:
    | 'ELIGIBLE_DIGITAL_GLOBAL'
    | 'ELIGIBLE_SAME_COUNTRY'
    | 'ELIGIBLE_SAME_COUNTRY_PHYSICAL'
    | 'COUNTRY_MISMATCH'
    | 'BORROWER_COUNTRY_MISSING'
    | 'LENDER_COUNTRY_MISSING'
    | 'LISTING_LOCATION_INCOMPLETE'
    | 'LISTING_LOCATION_REVIEW_REQUIRED';
  title: string;
  message: string;
  borrowerCountryCode: string;
  borrowerCountryName: string;
  lenderCountryCode: string;
  lenderCountryName: string;
  listingCountryCode: string;
  listingCountryName: string;
}

export interface EvaluatePhysicalEligibilityParams {
  listing: MarketplaceListing;
  borrowerProfile?: ProviderProfile | null;
  lenderProfile?: ProviderProfile | null;
}

/**
 * Core Same-Country Eligibility Engine.
 * Compares canonical ISO 3166-1 alpha-2 country codes (`ET`, `KE`, `CH`, etc.).
 * Digital resources are globally accessible.
 * Physical resources require Borrower Country === Lender Country === Listing Country.
 */
export function evaluatePhysicalEligibility(
  listingOrParams: MarketplaceListing | EvaluatePhysicalEligibilityParams,
  borrowerProfileArg?: ProviderProfile | null,
  lenderProfileArg?: ProviderProfile | null
): PhysicalEligibilityResult {
  const isParamsObj =
    listingOrParams &&
    typeof listingOrParams === 'object' &&
    'listing' in listingOrParams &&
    Boolean((listingOrParams as EvaluatePhysicalEligibilityParams).listing);

  const listing: MarketplaceListing = isParamsObj
    ? (listingOrParams as EvaluatePhysicalEligibilityParams).listing
    : (listingOrParams as MarketplaceListing);
  const borrowerProfile = isParamsObj
    ? (listingOrParams as EvaluatePhysicalEligibilityParams).borrowerProfile
    : borrowerProfileArg;
  const lenderProfile = isParamsObj
    ? (listingOrParams as EvaluatePhysicalEligibilityParams).lenderProfile
    : lenderProfileArg;

  const borrowerCode = normalizeCountryCode(borrowerProfile?.countryCode);
  const lenderCode = normalizeCountryCode(lenderProfile?.countryCode || listing?.countryCode);
  const listingCode = normalizeCountryCode(listing?.countryCode);

  const borrowerCountryName = borrowerCode ? getCountryName(borrowerCode) : 'Not set';
  const lenderCountryName = lenderCode ? getCountryName(lenderCode) : 'Not set';
  const listingCountryName = listingCode ? getCountryName(listingCode) : 'Not set';

  // Digital resources remain globally accessible without country restrictions
  if (listing?.resourceType === 'DIGITAL') {
    return {
      eligible: true,
      isGlobalDigital: true,
      reasonCode: 'ELIGIBLE_DIGITAL_GLOBAL',
      title: 'Global digital availability',
      message:
        'Digital resources are globally accessible across all countries with instant programmable escrow.',
      borrowerCountryCode: borrowerCode,
      borrowerCountryName,
      lenderCountryCode: lenderCode,
      lenderCountryName,
      listingCountryCode: listingCode,
      listingCountryName,
    };
  }

  // Older or incomplete physical listing check (TEST 11)
  if (!listingCode || !listing?.regionName?.trim() || !listing?.cityName?.trim()) {
    return {
      eligible: false,
      isGlobalDigital: false,
      reasonCode: 'LISTING_LOCATION_INCOMPLETE',
      title: 'Location details required from provider',
      message:
        'Physical listing location incomplete — lender must update listing location before borrowing is enabled.',
      borrowerCountryCode: borrowerCode,
      borrowerCountryName,
      lenderCountryCode: lenderCode,
      lenderCountryName,
      listingCountryCode: listingCode,
      listingCountryName,
    };
  }

  if (listing.locationReviewRequired) {
    return {
      eligible: false,
      isGlobalDigital: false,
      reasonCode: 'LISTING_LOCATION_REVIEW_REQUIRED',
      title: 'Listing location under provider review',
      message:
        'The lender updated their profile country. This physical listing is paused until the provider updates and re-verifies its pickup location.',
      borrowerCountryCode: borrowerCode,
      borrowerCountryName,
      lenderCountryCode: lenderCode,
      lenderCountryName,
      listingCountryCode: listingCode,
      listingCountryName,
    };
  }

  if (!borrowerCode) {
    return {
      eligible: false,
      isGlobalDigital: false,
      reasonCode: 'BORROWER_COUNTRY_MISSING',
      title: 'Select your country to borrow physical items',
      message:
        'Please set your country and region in your profile to verify same-country eligibility for physical equipment.',
      borrowerCountryCode: borrowerCode,
      borrowerCountryName,
      lenderCountryCode: lenderCode,
      lenderCountryName,
      listingCountryCode: listingCode,
      listingCountryName,
    };
  }

  if (!lenderCode) {
    return {
      eligible: false,
      isGlobalDigital: false,
      reasonCode: 'LENDER_COUNTRY_MISSING',
      title: 'Provider country unavailable',
      message:
        'The lender has not completed their profile country registration for physical handover.',
      borrowerCountryCode: borrowerCode,
      borrowerCountryName,
      lenderCountryCode: lenderCode,
      lenderCountryName,
      listingCountryCode: listingCode,
      listingCountryName,
    };
  }

  if (borrowerCode !== lenderCode || listingCode !== lenderCode) {
    return {
      eligible: false,
      isGlobalDigital: false,
      reasonCode: 'COUNTRY_MISMATCH',
      title: 'Not available in your country.',
      message:
        'This physical item is currently listed in a different country. Borrower and lender must be in the same country for physical borrowing.',
      borrowerCountryCode: borrowerCode,
      borrowerCountryName,
      lenderCountryCode: lenderCode,
      lenderCountryName,
      listingCountryCode: listingCode,
      listingCountryName,
    };
  }

  return {
    eligible: true,
    isGlobalDigital: false,
    reasonCode: 'ELIGIBLE_SAME_COUNTRY_PHYSICAL',
    title: `Eligible in ${listingCountryName}`,
    message: `Both borrower and lender are located in ${listingCountryName} (${listingCode}). Eligible for same-country physical borrowing.`,
    borrowerCountryCode: borrowerCode,
    borrowerCountryName,
    lenderCountryCode: lenderCode,
    lenderCountryName,
    listingCountryCode: listingCode,
    listingCountryName,
  };
}

export interface ProfileCountryChangeImpact {
  allowed: boolean;
  countryChanged: boolean;
  activePhysicalBookingIds: string[];
  pausedListingIds: string[];
  flaggedListingIds: string[];
  noticeMessage?: string;
}

export interface ProfileCountryChangeParams {
  walletAccountId: string;
  previousCountryCode?: string;
  newCountryCode?: string;
  bookings: Record<string, OnChainBooking>;
  listings: MarketplaceListing[];
  allowChangeWithSnapshotProtection?: boolean;
}

/**
 * Protects existing physical bookings and listings when a user changes their profile country (TEST 10).
 * - Active physical bookings retain their immutable country snapshots (`borrowerCountryCode`, `lenderCountryCode`, `listingCountryCode`).
 * - Mismatched physical listings owned by the lender are paused (`locationReviewRequired = true`) until updated.
 */
export function applyProfileCountryChangeProtection(
  walletOrParams: string | ProfileCountryChangeParams,
  previousCountryCodeArg?: string,
  newCountryCodeArg?: string,
  listingsArg?: MarketplaceListing[],
  bookingsArg?: Record<string, OnChainBooking>
): ProfileCountryChangeImpact {
  const params: ProfileCountryChangeParams =
    typeof walletOrParams === 'string'
      ? {
          walletAccountId: walletOrParams,
          previousCountryCode: previousCountryCodeArg,
          newCountryCode: newCountryCodeArg,
          listings: listingsArg || [],
          bookings: bookingsArg || {},
        }
      : walletOrParams;

  const prevCode = normalizeCountryCode(params.previousCountryCode);
  const nextCode = normalizeCountryCode(params.newCountryCode);

  if (!prevCode || !nextCode || prevCode === nextCode) {
    return {
      allowed: true,
      countryChanged: false,
      activePhysicalBookingIds: [],
      pausedListingIds: [],
      flaggedListingIds: [],
    };
  }

  const activeStatuses = new Set([
    'REQUESTED',
    'ACCEPTED',
    'ACTIVE',
    'RETURN_REQUESTED',
    'DISPUTED',
  ]);

  const activePhysicalBookingIds: string[] = [];
  for (const bk of Object.values(params.bookings)) {
    if (
      bk.resourceType === 'PHYSICAL' &&
      activeStatuses.has(bk.status) &&
      (bk.borrower === params.walletAccountId || bk.lender === params.walletAccountId)
    ) {
      activePhysicalBookingIds.push(bk.bookingId);
      // Ensure immutable snapshots remain locked to the original agreement country
      if (!bk.borrowerCountryCode) bk.borrowerCountryCode = prevCode;
      if (!bk.lenderCountryCode) bk.lenderCountryCode = prevCode;
      if (!bk.listingCountryCode) bk.listingCountryCode = prevCode;
    }
  }

  // Pause and flag any physical listings owned by this user whose country no longer matches their new profile country
  const pausedListingIds: string[] = [];
  for (const lst of params.listings) {
    if (
      lst.ownerWallet === params.walletAccountId &&
      lst.resourceType === 'PHYSICAL' &&
      normalizeCountryCode(lst.countryCode) !== nextCode
    ) {
      lst.locationReviewRequired = true;
      lst.availabilityStatus = 'PAUSED';
      pausedListingIds.push(lst.id);
    }
  }

  const notices: string[] = [];
  if (activePhysicalBookingIds.length > 0) {
    notices.push(
      `Existing active physical booking(s) (${activePhysicalBookingIds.join(', ')}) retain their original country snapshot (${prevCode}) until completed.`
    );
  }
  if (pausedListingIds.length > 0) {
    notices.push(
      `${pausedListingIds.length} physical listing(s) (${pausedListingIds.join(', ')}) were paused and require location review to match your updated profile country (${nextCode}).`
    );
  }

  return {
    allowed: true,
    countryChanged: true,
    activePhysicalBookingIds,
    pausedListingIds,
    flaggedListingIds: pausedListingIds,
    noticeMessage: notices.join(' '),
  };
}

/**
 * Sanitizes a user profile for public or non-owner responses so private phone numbers are never leaked (TEST 7).
 */
export function sanitizePublicProfile(
  profile: ProviderProfile,
  callerWallet?: string | null
): ProviderProfile {
  const isOwner = Boolean(callerWallet && callerWallet === profile.walletAccountId);
  const rawVis = profile.locationVisibility;
  const vis: LocationVisibilitySettings =
    typeof rawVis === 'string'
      ? {
          countryPublic: true,
          regionPublic: rawVis === 'COUNTRY_REGION_CITY' || rawVis === 'COUNTRY_REGION',
          cityPublic: rawVis === 'COUNTRY_REGION_CITY',
          exactAddressPrivate: true,
        }
      : rawVis || {
          countryPublic: true,
          regionPublic: true,
          cityPublic: true,
          exactAddressPrivate: true,
        };

  const maskedPhone = profile.phoneNumber
    ? maskE164PhoneNumber(profile.phoneNumber, profile.phoneCountryCode || profile.countryCode)
    : undefined;

  if (isOwner) {
    return {
      ...profile,
      maskedPhoneNumber: maskedPhone,
      phoneNumberMasked: maskedPhone,
    };
  }

  const cityPublicEffective =
    profile.cityVisibility === 'PRIVATE' ? false : vis.cityPublic !== false;

  return {
    ...profile,
    countryCode: vis.countryPublic !== false ? profile.countryCode : undefined,
    countryName: vis.countryPublic !== false ? profile.countryName : undefined,
    regionName: vis.regionPublic !== false ? profile.regionName : undefined,
    cityId: cityPublicEffective ? profile.cityId : undefined,
    cityName: cityPublicEffective ? profile.cityName : undefined,
    // NEVER expose raw phoneNumber or private email to unrelated callers
    phoneNumber: undefined,
    maskedPhoneNumber: maskedPhone,
    phoneNumberMasked: maskedPhone,
  };
}

/**
 * Sanitizes a marketplace listing for public responses so private pickup addresses are never leaked
 * in API responses, page source, or metadata before booking acceptance (TEST 8, TEST 12, TEST 13).
 */
export function sanitizePublicListing(
  listing: MarketplaceListing,
  callerWallet?: string | null
): MarketplaceListing {
  const isOwner = Boolean(callerWallet && callerWallet === listing.ownerWallet);
  const isPublicAddress =
    listing.pickupVisibility === 'PUBLIC' && listing.publicAddressConfirmed === true;

  if (isOwner || isPublicAddress) {
    return {
      ...listing,
    };
  }

  return {
    ...listing,
    pickupAddress: undefined,
    structuredAddress: undefined,
  };
}

export interface AuthorizedBookingContactParty {
  walletAccountId: string;
  displayName: string;
  avatarUrl?: string;
  role: 'LENDER' | 'BORROWER';
  countryCode?: string;
  countryName?: string;
  regionName?: string;
  cityName?: string;
  preferredContactMethods: ContactMethodType[];
  contactSharingEnabled: boolean;
  phoneNumber?: string; // Included ONLY when booking is accepted+ and party consented
  maskedPhoneNumber?: string;
  phoneCountryCode?: string;
  whatsappUrl?: string;
  telUrl?: string;
  email?: string;
}

export interface AuthorizedBookingPickupLocation {
  countryCode?: string;
  countryName?: string;
  regionName?: string;
  cityName?: string;
  pickupArea?: string;
  exactPickupAddress: string;
  pickupInstructions?: string;
  structuredAddress?: StructuredPickupAddress;
}

export interface AuthorizedBookingContactResponse {
  authorized: boolean;
  statusCode: number;
  error?: string;
  bookingId: string;
  bookingStatus: string;
  resourceType: 'PHYSICAL' | 'DIGITAL';
  callerRole?: 'BORROWER' | 'LENDER';
  locationDisclosed: boolean;
  pickupVisibility?: PickupAddressVisibility;
  pickupArea?: string;
  exactPickupAddress?: string;
  structuredAddress?: StructuredPickupAddress;
  pickupInstructions?: string;
  lenderContact?: AuthorizedBookingContactParty;
  borrowerContact?: AuthorizedBookingContactParty;
  counterparty?: AuthorizedBookingContactParty;
  pickupLocation?: AuthorizedBookingPickupLocation;
}

const ACCEPTED_OR_POST_STATUSES = new Set([
  'ACCEPTED',
  'ACTIVE',
  'RETURN_REQUESTED',
  'COMPLETED',
  'DISPUTED',
  'RESOLVED',
]);

/**
 * Role-aware access control for booking contact details and exact pickup address (TEST 7, TEST 8, TEST 9).
 * Only the authenticated borrower or lender of an accepted booking may access shared contact info and private pickup details.
 */
export function getAuthorizedBookingContactDetails(params: {
  booking: OnChainBooking;
  listing?: MarketplaceListing;
  borrowerProfile?: ProviderProfile;
  lenderProfile?: ProviderProfile;
  callerWallet?: string | null;
}): AuthorizedBookingContactResponse {
  const { booking, listing, borrowerProfile, lenderProfile, callerWallet } = params;
  const caller = (callerWallet || '').trim();

  if (!caller || (caller !== booking.borrower && caller !== booking.lender)) {
    return {
      authorized: false,
      statusCode: 403,
      error:
        'Unauthorized: Only the authenticated borrower or lender associated with this booking may access counterparty contact or pickup details.',
      bookingId: booking.bookingId,
      bookingStatus: booking.status,
      resourceType: booking.resourceType,
      locationDisclosed: false,
    };
  }

  const callerRole: 'BORROWER' | 'LENDER' =
    caller === booking.borrower ? 'BORROWER' : 'LENDER';
  const isAcceptedOrPost = ACCEPTED_OR_POST_STATUSES.has(booking.status);

  if (!isAcceptedOrPost) {
    return {
      authorized: false,
      statusCode: 403,
      error:
        'Pickup address and counterparty contact details are locked until the lender accepts the booking.',
      bookingId: booking.bookingId,
      bookingStatus: booking.status,
      resourceType: booking.resourceType,
      callerRole,
      locationDisclosed: false,
    };
  }

  const buildPartyContact = (
    prof: ProviderProfile | undefined,
    walletId: string,
    role: 'LENDER' | 'BORROWER',
    snapshotCountryCode?: string
  ): AuthorizedBookingContactParty => {
    const cCode = normalizeCountryCode(prof?.countryCode || snapshotCountryCode);
    const cName = cCode ? getCountryName(cCode) : prof?.countryName;
    const sharingConsent =
      prof?.contactSharingEnabled !== false && booking.contactSharingConsent !== false;
    const canRevealPhone = isAcceptedOrPost && sharingConsent && Boolean(prof?.phoneNumber);
    const rawPhone = canRevealPhone ? prof?.phoneNumber : undefined;
    const digitsOnly = rawPhone ? rawPhone.replace(/\D/g, '') : '';

    return {
      walletAccountId: walletId,
      displayName: prof?.displayName || walletId,
      avatarUrl: prof?.avatarUrl,
      role,
      countryCode: cCode || undefined,
      countryName: cName,
      regionName: prof?.regionName,
      cityName: prof?.cityName,
      preferredContactMethods: prof?.preferredContactMethods || ['WHATSAPP', 'IN_APP'],
      contactSharingEnabled: sharingConsent,
      phoneNumber: rawPhone,
      maskedPhoneNumber: prof?.phoneNumber
        ? maskE164PhoneNumber(prof.phoneNumber, prof.phoneCountryCode || cCode)
        : undefined,
      phoneCountryCode: prof?.phoneCountryCode || cCode || undefined,
      whatsappUrl: canRevealPhone && digitsOnly ? `https://wa.me/${digitsOnly}` : undefined,
      telUrl: canRevealPhone && rawPhone ? `tel:${rawPhone}` : undefined,
      email: canRevealPhone ? prof?.email : undefined,
    };
  };

  const lenderContact = buildPartyContact(
    lenderProfile,
    booking.lender,
    'LENDER',
    booking.lenderCountryCode
  );
  const borrowerContact = buildPartyContact(
    borrowerProfile,
    booking.borrower,
    'BORROWER',
    booking.borrowerCountryCode
  );

  const counterparty = callerRole === 'BORROWER' ? lenderContact : borrowerContact;
  const resolvedPickupArea =
    listing?.pickupArea ||
    listing?.structuredAddress?.neighborhood ||
    listing?.cityName ||
    'Designated Pickup Area';
  const resolvedExactAddress =
    listing?.pickupAddress ||
    [
      listing?.structuredAddress?.buildingName,
      listing?.structuredAddress?.street,
      listing?.structuredAddress?.neighborhood,
      listing?.cityName,
      listing?.regionName,
      listing?.countryName,
    ]
      .filter(Boolean)
      .join(', ') ||
    'Coordinate directly with lender for handover point';
  const resolvedInstructions =
    listing?.pickupInstructions ||
    listing?.pickupReturnInstructions ||
    'Present booking ID and verify serial/QR code at handover.';

  const pickupLocation: AuthorizedBookingPickupLocation | undefined =
    booking.resourceType === 'PHYSICAL'
      ? {
          countryCode: listing?.countryCode || booking.listingCountryCode,
          countryName: listing?.countryName || getCountryName(booking.listingCountryCode),
          regionName: listing?.regionName,
          cityName: listing?.cityName,
          pickupArea: resolvedPickupArea,
          exactPickupAddress: resolvedExactAddress,
          pickupInstructions: resolvedInstructions,
          structuredAddress: listing?.structuredAddress,
        }
      : undefined;

  return {
    authorized: true,
    statusCode: 200,
    bookingId: booking.bookingId,
    bookingStatus: booking.status,
    resourceType: booking.resourceType,
    callerRole,
    locationDisclosed: true,
    pickupVisibility: listing?.pickupVisibility || 'PRIVATE',
    pickupArea: resolvedPickupArea,
    exactPickupAddress: resolvedExactAddress,
    structuredAddress: listing?.structuredAddress,
    pickupInstructions: resolvedInstructions,
    lenderContact,
    borrowerContact,
    counterparty,
    pickupLocation,
  };
}
