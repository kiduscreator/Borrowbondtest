/**
 * BorrowBond Centralized Country Eligibility Registry, Searchable City Dataset,
 * Permanent Country Lock Guard, and Intelligent Location-Based Marketplace Discovery Engine (Section 17)
 */

import type { MarketplaceListing, ProviderProfile } from '../security/policyEngine';
import {
  evaluatePhysicalEligibility,
  getCountryFlagEmoji,
  normalizeCountryCode,
} from './countryLocationEngine';

// ============================================================================
// 17.5 CENTRALIZED COUNTRY-AVAILABILITY CONFIGURATION
// ============================================================================

export interface CountryAvailabilityRecord {
  countryCode: string; // ISO 3166-1 alpha-2 uppercase
  countryName: string;
  aliases: string[];
  registrationAvailable: boolean;
  walletAvailable: boolean;
  transactionAvailable: boolean;
  marketplaceAvailable: boolean;
  restrictionReason: string | null;
  restrictionType: 'NONE' | 'SANCTIONS_LEGAL' | 'TECHNICAL_LIMITATION' | 'LEGAL_REVIEW_FLAGGED';
  supportingOfficialSources: string[];
  lastReviewedDate: string;
}

const OFFICIAL_PROVIDER_SOURCES = [
  'Google Identity / Google Cloud OAuth 2.0 Terms of Service (https://cloud.google.com/terms)',
  'Supabase Auth & Global Edge Platform Availability (https://supabase.com/docs/guides/auth)',
  'NEAR Protocol Decentralized RPC & Wallet Selector Standards (https://docs.near.org)',
  'OFAC / EU / UN Comprehensive Sanctions Compliance Lists',
];

export const COUNTRY_AVAILABILITY_REGISTRY: CountryAvailabilityRecord[] = [
  {
    countryCode: 'ET',
    countryName: 'Ethiopia',
    aliases: ['Federal Democratic Republic of Ethiopia', 'Ethio', 'Ityopiya'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'KE',
    countryName: 'Kenya',
    aliases: ['Republic of Kenya'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'NG',
    countryName: 'Nigeria',
    aliases: ['Federal Republic of Nigeria', 'Naija'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'ZA',
    countryName: 'South Africa',
    aliases: ['Republic of South Africa', 'RSA'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'RW',
    countryName: 'Rwanda',
    aliases: ['Republic of Rwanda'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'UG',
    countryName: 'Uganda',
    aliases: ['Republic of Uganda'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'TZ',
    countryName: 'Tanzania',
    aliases: ['United Republic of Tanzania'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'GH',
    countryName: 'Ghana',
    aliases: ['Republic of Ghana'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'EG',
    countryName: 'Egypt',
    aliases: ['Arab Republic of Egypt', 'Misr'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'MA',
    countryName: 'Morocco',
    aliases: ['Kingdom of Morocco'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'SN',
    countryName: 'Senegal',
    aliases: ['Republic of Senegal'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'CI',
    countryName: "Côte d'Ivoire",
    aliases: ['Ivory Coast', 'Cote d Ivoire'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'CH',
    countryName: 'Switzerland',
    aliases: ['Swiss Confederation', 'Schweiz', 'Suisse', 'Svizzera'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'US',
    countryName: 'United States',
    aliases: ['USA', 'United States of America', 'America'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    aliases: ['UK', 'Great Britain', 'England', 'Scotland', 'Wales'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    aliases: ['Deutschland', 'Federal Republic of Germany'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'FR',
    countryName: 'France',
    aliases: ['French Republic', 'République française'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'NL',
    countryName: 'Netherlands',
    aliases: ['Holland', 'The Netherlands'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'SE',
    countryName: 'Sweden',
    aliases: ['Kingdom of Sweden', 'Sverige'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'ES',
    countryName: 'Spain',
    aliases: ['Kingdom of Spain', 'España'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'IT',
    countryName: 'Italy',
    aliases: ['Italian Republic', 'Italia'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'PL',
    countryName: 'Poland',
    aliases: ['Republic of Poland', 'Polska'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'PT',
    countryName: 'Portugal',
    aliases: ['Portuguese Republic'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'NO',
    countryName: 'Norway',
    aliases: ['Kingdom of Norway', 'Norge'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'FI',
    countryName: 'Finland',
    aliases: ['Republic of Finland', 'Suomi'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'DK',
    countryName: 'Denmark',
    aliases: ['Kingdom of Denmark', 'Danmark'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'IE',
    countryName: 'Ireland',
    aliases: ['Republic of Ireland', 'Éire'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'AT',
    countryName: 'Austria',
    aliases: ['Republic of Austria', 'Österreich'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'BE',
    countryName: 'Belgium',
    aliases: ['Kingdom of Belgium', 'België', 'Belgique'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    aliases: ['Dominion of Canada'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'MX',
    countryName: 'Mexico',
    aliases: ['United Mexican States', 'México'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'BR',
    countryName: 'Brazil',
    aliases: ['Federative Republic of Brazil', 'Brasil'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'AR',
    countryName: 'Argentina',
    aliases: ['Argentine Republic'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'CO',
    countryName: 'Colombia',
    aliases: ['Republic of Colombia'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'CL',
    countryName: 'Chile',
    aliases: ['Republic of Chile'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    aliases: ['UAE', 'Emirates', 'Dubai', 'Abu Dhabi'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    aliases: ['Kingdom of Saudi Arabia', 'KSA'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'TR',
    countryName: 'Turkey',
    aliases: ['Türkiye', 'Republic of Türkiye'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'IN',
    countryName: 'India',
    aliases: ['Republic of India', 'Bharat'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'SG',
    countryName: 'Singapore',
    aliases: ['Republic of Singapore'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'JP',
    countryName: 'Japan',
    aliases: ['Nippon', 'Nihon'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'KR',
    countryName: 'South Korea',
    aliases: ['Republic of Korea', 'ROK', 'Korea'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    aliases: ['Commonwealth of Australia'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'NZ',
    countryName: 'New Zealand',
    aliases: ['Aotearoa'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'ID',
    countryName: 'Indonesia',
    aliases: ['Republic of Indonesia'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'PH',
    countryName: 'Philippines',
    aliases: ['Republic of the Philippines'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'VN',
    countryName: 'Vietnam',
    aliases: ['Socialist Republic of Vietnam', 'Việt Nam'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'TH',
    countryName: 'Thailand',
    aliases: ['Kingdom of Thailand'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'MY',
    countryName: 'Malaysia',
    aliases: ['Federation of Malaysia'],
    registrationAvailable: true,
    walletAvailable: true,
    transactionAvailable: true,
    marketplaceAvailable: true,
    restrictionReason: null,
    restrictionType: 'NONE',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  // Comprehensive Sanctions / Legal Restriction Entries (Explicitly documented per Section 17.5)
  {
    countryCode: 'KP',
    countryName: 'North Korea',
    aliases: ['DPRK'],
    registrationAvailable: false,
    walletAvailable: false,
    transactionAvailable: false,
    marketplaceAvailable: false,
    restrictionReason:
      'Restricted under comprehensive international sanctions (OFAC / UN / EU) and Google Cloud / Supabase Terms of Service.',
    restrictionType: 'SANCTIONS_LEGAL',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'IR',
    countryName: 'Iran',
    aliases: ['Islamic Republic of Iran'],
    registrationAvailable: false,
    walletAvailable: false,
    transactionAvailable: false,
    marketplaceAvailable: false,
    restrictionReason:
      'Restricted under comprehensive OFAC sanctions and Google Cloud / Supabase Terms of Service.',
    restrictionType: 'SANCTIONS_LEGAL',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'SY',
    countryName: 'Syria',
    aliases: ['Syrian Arab Republic'],
    registrationAvailable: false,
    walletAvailable: false,
    transactionAvailable: false,
    marketplaceAvailable: false,
    restrictionReason:
      'Restricted under comprehensive OFAC sanctions and Google Cloud / Supabase Terms of Service.',
    restrictionType: 'SANCTIONS_LEGAL',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
  {
    countryCode: 'CU',
    countryName: 'Cuba',
    aliases: ['Republic of Cuba'],
    registrationAvailable: false,
    walletAvailable: false,
    transactionAvailable: false,
    marketplaceAvailable: false,
    restrictionReason:
      'Restricted under comprehensive OFAC sanctions and Google Cloud / Supabase Terms of Service.',
    restrictionType: 'SANCTIONS_LEGAL',
    supportingOfficialSources: OFFICIAL_PROVIDER_SOURCES,
    lastReviewedDate: '2026-11-10',
  },
].sort((a, b) => a.countryName.localeCompare(b.countryName));

export function getCountryAvailability(countryCode?: string | null): CountryAvailabilityRecord | null {
  const code = normalizeCountryCode(countryCode);
  if (!code) return null;
  return COUNTRY_AVAILABILITY_REGISTRY.find((c) => c.countryCode === code) || null;
}

export function searchEligibleCountries(
  query: string,
  includeRestricted = false
): CountryAvailabilityRecord[] {
  const q = (query || '').trim().toLowerCase();
  const pool = includeRestricted
    ? COUNTRY_AVAILABILITY_REGISTRY
    : COUNTRY_AVAILABILITY_REGISTRY.filter((c) => c.registrationAvailable && c.marketplaceAvailable);

  if (!q) return pool;
  return pool.filter(
    (c) =>
      c.countryName.toLowerCase().includes(q) ||
      c.countryCode.toLowerCase().includes(q) ||
      c.aliases.some((alias) => alias.toLowerCase().includes(q))
  );
}

// ============================================================================
// 17.7 MAINTAINED GEOGRAPHIC CITY DATASET & COORDINATES (WITH VALIDATED FALLBACK)
// ============================================================================

export interface CityDirectoryEntry {
  cityId: string;
  cityName: string;
  normalizedName: string;
  countryCode: string;
  lat: number | null;
  lng: number | null;
  isVerifiedCoordinates: boolean;
  aliases?: string[];
}

export const MAINTAINED_CITY_DIRECTORY: CityDirectoryEntry[] = [
  // Ethiopia (ET) — Comprehensive Ethiopian city dataset (Addis Ababa, Jimma, Hawassa, Dire Dawa, Bahir Dar, Adama, etc.)
  { cityId: 'et-addis-ababa', cityName: 'Addis Ababa', normalizedName: 'addis ababa', countryCode: 'ET', lat: 9.032, lng: 38.7469, isVerifiedCoordinates: true, aliases: ['Finfinne', 'Addis'] },
  { cityId: 'et-jimma', cityName: 'Jimma', normalizedName: 'jimma', countryCode: 'ET', lat: 7.6739, lng: 36.8344, isVerifiedCoordinates: true, aliases: ['Jima'] },
  { cityId: 'et-hawassa', cityName: 'Hawassa', normalizedName: 'hawassa', countryCode: 'ET', lat: 7.0621, lng: 38.4763, isVerifiedCoordinates: true, aliases: ['Awassa', 'Awasa'] },
  { cityId: 'et-dire-dawa', cityName: 'Dire Dawa', normalizedName: 'dire dawa', countryCode: 'ET', lat: 9.6009, lng: 41.8501, isVerifiedCoordinates: true },
  { cityId: 'et-bahir-dar', cityName: 'Bahir Dar', normalizedName: 'bahir dar', countryCode: 'ET', lat: 11.5742, lng: 37.3614, isVerifiedCoordinates: true },
  { cityId: 'et-adama', cityName: 'Adama', normalizedName: 'adama', countryCode: 'ET', lat: 8.54, lng: 39.27, isVerifiedCoordinates: true, aliases: ['Nazret', 'Nazareth'] },
  { cityId: 'et-bishoftu', cityName: 'Bishoftu', normalizedName: 'bishoftu', countryCode: 'ET', lat: 8.7523, lng: 38.9785, isVerifiedCoordinates: true, aliases: ['Debre Zeit'] },
  { cityId: 'et-mekelle', cityName: 'Mekelle', normalizedName: 'mekelle', countryCode: 'ET', lat: 13.4967, lng: 39.4753, isVerifiedCoordinates: true, aliases: ['Mekele'] },
  { cityId: 'et-gondar', cityName: 'Gondar', normalizedName: 'gondar', countryCode: 'ET', lat: 12.6, lng: 37.4667, isVerifiedCoordinates: true, aliases: ['Gonder'] },
  { cityId: 'et-harar', cityName: 'Harar', normalizedName: 'harar', countryCode: 'ET', lat: 9.3139, lng: 42.1182, isVerifiedCoordinates: true },
  { cityId: 'et-jijiga', cityName: 'Jijiga', normalizedName: 'jijiga', countryCode: 'ET', lat: 9.35, lng: 42.8, isVerifiedCoordinates: true },
  { cityId: 'et-shashamane', cityName: 'Shashamane', normalizedName: 'shashamane', countryCode: 'ET', lat: 7.2, lng: 38.6, isVerifiedCoordinates: true },
  { cityId: 'et-arba-minch', cityName: 'Arba Minch', normalizedName: 'arba minch', countryCode: 'ET', lat: 6.0333, lng: 37.55, isVerifiedCoordinates: true },
  { cityId: 'et-dessie', cityName: 'Dessie', normalizedName: 'dessie', countryCode: 'ET', lat: 11.1333, lng: 39.6333, isVerifiedCoordinates: true },
  { cityId: 'et-nekemte', cityName: 'Nekemte', normalizedName: 'nekemte', countryCode: 'ET', lat: 9.0833, lng: 36.55, isVerifiedCoordinates: true },
  { cityId: 'et-asella', cityName: 'Asella', normalizedName: 'asella', countryCode: 'ET', lat: 7.95, lng: 39.1167, isVerifiedCoordinates: true },
  { cityId: 'et-debre-birhan', cityName: 'Debre Birhan', normalizedName: 'debre birhan', countryCode: 'ET', lat: 9.6795, lng: 39.5326, isVerifiedCoordinates: true },
  { cityId: 'et-debre-markos', cityName: 'Debre Markos', normalizedName: 'debre markos', countryCode: 'ET', lat: 10.3333, lng: 37.7333, isVerifiedCoordinates: true },
  { cityId: 'et-wolaita-sodo', cityName: 'Wolaita Sodo', normalizedName: 'wolaita sodo', countryCode: 'ET', lat: 6.86, lng: 37.7616, isVerifiedCoordinates: true, aliases: ['Sodo'] },
  { cityId: 'et-hosaena', cityName: 'Hosaena', normalizedName: 'hosaena', countryCode: 'ET', lat: 7.5498, lng: 37.8537, isVerifiedCoordinates: true, aliases: ['Hosanna'] },
  { cityId: 'et-agaro', cityName: 'Agaro', normalizedName: 'agaro', countryCode: 'ET', lat: 7.85, lng: 36.5833, isVerifiedCoordinates: true },
  { cityId: 'et-bonga', cityName: 'Bonga', normalizedName: 'bonga', countryCode: 'ET', lat: 7.2667, lng: 36.2333, isVerifiedCoordinates: true },

  // Kenya (KE)
  { cityId: 'ke-nairobi', cityName: 'Nairobi', normalizedName: 'nairobi', countryCode: 'KE', lat: -1.2921, lng: 36.8219, isVerifiedCoordinates: true },
  { cityId: 'ke-mombasa', cityName: 'Mombasa', normalizedName: 'mombasa', countryCode: 'KE', lat: -4.0435, lng: 39.6682, isVerifiedCoordinates: true },
  { cityId: 'ke-kisumu', cityName: 'Kisumu', normalizedName: 'kisumu', countryCode: 'KE', lat: -0.0917, lng: 34.768, isVerifiedCoordinates: true },
  { cityId: 'ke-nakuru', cityName: 'Nakuru', normalizedName: 'nakuru', countryCode: 'KE', lat: -0.3031, lng: 36.08, isVerifiedCoordinates: true },
  { cityId: 'ke-eldoret', cityName: 'Eldoret', normalizedName: 'eldoret', countryCode: 'KE', lat: 0.5143, lng: 35.2698, isVerifiedCoordinates: true },
  { cityId: 'ke-thika', cityName: 'Thika', normalizedName: 'thika', countryCode: 'KE', lat: -1.0333, lng: 37.0693, isVerifiedCoordinates: true },

  // Nigeria (NG)
  { cityId: 'ng-lagos', cityName: 'Lagos', normalizedName: 'lagos', countryCode: 'NG', lat: 6.5244, lng: 3.3792, isVerifiedCoordinates: true },
  { cityId: 'ng-abuja', cityName: 'Abuja', normalizedName: 'abuja', countryCode: 'NG', lat: 9.0765, lng: 7.3986, isVerifiedCoordinates: true },
  { cityId: 'ng-port-harcourt', cityName: 'Port Harcourt', normalizedName: 'port harcourt', countryCode: 'NG', lat: 4.8156, lng: 7.0498, isVerifiedCoordinates: true },
  { cityId: 'ng-ibadan', cityName: 'Ibadan', normalizedName: 'ibadan', countryCode: 'NG', lat: 7.3775, lng: 3.947, isVerifiedCoordinates: true },
  { cityId: 'ng-kano', cityName: 'Kano', normalizedName: 'kano', countryCode: 'NG', lat: 12.0022, lng: 8.592, isVerifiedCoordinates: true },

  // South Africa (ZA)
  { cityId: 'za-johannesburg', cityName: 'Johannesburg', normalizedName: 'johannesburg', countryCode: 'ZA', lat: -26.2041, lng: 28.0473, isVerifiedCoordinates: true },
  { cityId: 'za-cape-town', cityName: 'Cape Town', normalizedName: 'cape town', countryCode: 'ZA', lat: -33.9249, lng: 18.4241, isVerifiedCoordinates: true },
  { cityId: 'za-durban', cityName: 'Durban', normalizedName: 'durban', countryCode: 'ZA', lat: -29.8587, lng: 31.0218, isVerifiedCoordinates: true },
  { cityId: 'za-pretoria', cityName: 'Pretoria', normalizedName: 'pretoria', countryCode: 'ZA', lat: -25.7479, lng: 28.2293, isVerifiedCoordinates: true },

  // Switzerland (CH)
  { cityId: 'ch-zurich', cityName: 'Zurich', normalizedName: 'zurich', countryCode: 'CH', lat: 47.3769, lng: 8.5417, isVerifiedCoordinates: true, aliases: ['Zürich'] },
  { cityId: 'ch-geneva', cityName: 'Geneva', normalizedName: 'geneva', countryCode: 'CH', lat: 46.2044, lng: 6.1432, isVerifiedCoordinates: true, aliases: ['Genève'] },
  { cityId: 'ch-basel', cityName: 'Basel', normalizedName: 'basel', countryCode: 'CH', lat: 47.5596, lng: 7.5886, isVerifiedCoordinates: true },
  { cityId: 'ch-bern', cityName: 'Bern', normalizedName: 'bern', countryCode: 'CH', lat: 46.948, lng: 7.4474, isVerifiedCoordinates: true },
  { cityId: 'ch-zug', cityName: 'Zug', normalizedName: 'zug', countryCode: 'CH', lat: 47.1662, lng: 8.5155, isVerifiedCoordinates: true },
  { cityId: 'ch-lausanne', cityName: 'Lausanne', normalizedName: 'lausanne', countryCode: 'CH', lat: 46.5197, lng: 6.6323, isVerifiedCoordinates: true },

  // United States (US)
  { cityId: 'us-san-francisco', cityName: 'San Francisco', normalizedName: 'san francisco', countryCode: 'US', lat: 37.7749, lng: -122.4194, isVerifiedCoordinates: true },
  { cityId: 'us-new-york', cityName: 'New York', normalizedName: 'new york', countryCode: 'US', lat: 40.7128, lng: -74.006, isVerifiedCoordinates: true, aliases: ['NYC'] },
  { cityId: 'us-austin', cityName: 'Austin', normalizedName: 'austin', countryCode: 'US', lat: 30.2672, lng: -97.7431, isVerifiedCoordinates: true },
  { cityId: 'us-seattle', cityName: 'Seattle', normalizedName: 'seattle', countryCode: 'US', lat: 47.6062, lng: -122.3321, isVerifiedCoordinates: true },
  { cityId: 'us-los-angeles', cityName: 'Los Angeles', normalizedName: 'los angeles', countryCode: 'US', lat: 34.0522, lng: -118.2437, isVerifiedCoordinates: true },
  { cityId: 'us-chicago', cityName: 'Chicago', normalizedName: 'chicago', countryCode: 'US', lat: 41.8781, lng: -87.6298, isVerifiedCoordinates: true },
  { cityId: 'us-boston', cityName: 'Boston', normalizedName: 'boston', countryCode: 'US', lat: 42.3601, lng: -71.0589, isVerifiedCoordinates: true },

  // United Kingdom (GB)
  { cityId: 'gb-london', cityName: 'London', normalizedName: 'london', countryCode: 'GB', lat: 51.5074, lng: -0.1278, isVerifiedCoordinates: true },
  { cityId: 'gb-manchester', cityName: 'Manchester', normalizedName: 'manchester', countryCode: 'GB', lat: 53.4808, lng: -2.2426, isVerifiedCoordinates: true },
  { cityId: 'gb-edinburgh', cityName: 'Edinburgh', normalizedName: 'edinburgh', countryCode: 'GB', lat: 55.9533, lng: -3.1883, isVerifiedCoordinates: true },
  { cityId: 'gb-birmingham', cityName: 'Birmingham', normalizedName: 'birmingham', countryCode: 'GB', lat: 52.4862, lng: -1.8904, isVerifiedCoordinates: true },

  // Germany (DE)
  { cityId: 'de-berlin', cityName: 'Berlin', normalizedName: 'berlin', countryCode: 'DE', lat: 52.52, lng: 13.405, isVerifiedCoordinates: true },
  { cityId: 'de-munich', cityName: 'Munich', normalizedName: 'munich', countryCode: 'DE', lat: 48.1351, lng: 11.582, isVerifiedCoordinates: true, aliases: ['München'] },
  { cityId: 'de-frankfurt', cityName: 'Frankfurt', normalizedName: 'frankfurt', countryCode: 'DE', lat: 50.1109, lng: 8.6821, isVerifiedCoordinates: true },
  { cityId: 'de-hamburg', cityName: 'Hamburg', normalizedName: 'hamburg', countryCode: 'DE', lat: 53.5511, lng: 9.9937, isVerifiedCoordinates: true },

  // UAE (AE)
  { cityId: 'ae-dubai', cityName: 'Dubai', normalizedName: 'dubai', countryCode: 'AE', lat: 25.2048, lng: 55.2708, isVerifiedCoordinates: true },
  { cityId: 'ae-abu-dhabi', cityName: 'Abu Dhabi', normalizedName: 'abu dhabi', countryCode: 'AE', lat: 24.4539, lng: 54.3773, isVerifiedCoordinates: true },
  { cityId: 'ae-sharjah', cityName: 'Sharjah', normalizedName: 'sharjah', countryCode: 'AE', lat: 25.3463, lng: 55.4209, isVerifiedCoordinates: true },

  // India (IN)
  { cityId: 'in-bengaluru', cityName: 'Bengaluru', normalizedName: 'bengaluru', countryCode: 'IN', lat: 12.9716, lng: 77.5946, isVerifiedCoordinates: true, aliases: ['Bangalore'] },
  { cityId: 'in-mumbai', cityName: 'Mumbai', normalizedName: 'mumbai', countryCode: 'IN', lat: 19.076, lng: 72.8777, isVerifiedCoordinates: true },
  { cityId: 'in-new-delhi', cityName: 'New Delhi', normalizedName: 'new delhi', countryCode: 'IN', lat: 28.6139, lng: 77.209, isVerifiedCoordinates: true, aliases: ['Delhi'] },
  { cityId: 'in-hyderabad', cityName: 'Hyderabad', normalizedName: 'hyderabad', countryCode: 'IN', lat: 17.385, lng: 78.4867, isVerifiedCoordinates: true },

  // Canada (CA)
  { cityId: 'ca-toronto', cityName: 'Toronto', normalizedName: 'toronto', countryCode: 'CA', lat: 43.6532, lng: -79.3832, isVerifiedCoordinates: true },
  { cityId: 'ca-vancouver', cityName: 'Vancouver', normalizedName: 'vancouver', countryCode: 'CA', lat: 49.2827, lng: -123.1207, isVerifiedCoordinates: true },
  { cityId: 'ca-montreal', cityName: 'Montreal', normalizedName: 'montreal', countryCode: 'CA', lat: 45.5017, lng: -73.5673, isVerifiedCoordinates: true },

  // France (FR)
  { cityId: 'fr-paris', cityName: 'Paris', normalizedName: 'paris', countryCode: 'FR', lat: 48.8566, lng: 2.3522, isVerifiedCoordinates: true },
  { cityId: 'fr-lyon', cityName: 'Lyon', normalizedName: 'lyon', countryCode: 'FR', lat: 45.764, lng: 4.8357, isVerifiedCoordinates: true },
  { cityId: 'fr-marseille', cityName: 'Marseille', normalizedName: 'marseille', countryCode: 'FR', lat: 43.2965, lng: 5.3698, isVerifiedCoordinates: true },

  // Other Global Hub Cities
  { cityId: 'sg-singapore', cityName: 'Singapore', normalizedName: 'singapore', countryCode: 'SG', lat: 1.3521, lng: 103.8198, isVerifiedCoordinates: true },
  { cityId: 'jp-tokyo', cityName: 'Tokyo', normalizedName: 'tokyo', countryCode: 'JP', lat: 35.6762, lng: 139.6503, isVerifiedCoordinates: true },
  { cityId: 'jp-osaka', cityName: 'Osaka', normalizedName: 'osaka', countryCode: 'JP', lat: 34.6937, lng: 135.5023, isVerifiedCoordinates: true },
  { cityId: 'kr-seoul', cityName: 'Seoul', normalizedName: 'seoul', countryCode: 'KR', lat: 37.5665, lng: 126.978, isVerifiedCoordinates: true },
  { cityId: 'rw-kigali', cityName: 'Kigali', normalizedName: 'kigali', countryCode: 'RW', lat: -1.9441, lng: 30.0619, isVerifiedCoordinates: true },
  { cityId: 'ug-kampala', cityName: 'Kampala', normalizedName: 'kampala', countryCode: 'UG', lat: 0.3476, lng: 32.5825, isVerifiedCoordinates: true },
  { cityId: 'tz-dar-es-salaam', cityName: 'Dar es Salaam', normalizedName: 'dar es salaam', countryCode: 'TZ', lat: -6.7924, lng: 39.2083, isVerifiedCoordinates: true },
  { cityId: 'tz-arusha', cityName: 'Arusha', normalizedName: 'arusha', countryCode: 'TZ', lat: -3.3869, lng: 36.683, isVerifiedCoordinates: true },
  { cityId: 'gh-accra', cityName: 'Accra', normalizedName: 'accra', countryCode: 'GH', lat: 5.6037, lng: -0.187, isVerifiedCoordinates: true },
  { cityId: 'gh-kumasi', cityName: 'Kumasi', normalizedName: 'kumasi', countryCode: 'GH', lat: 6.6885, lng: -1.6244, isVerifiedCoordinates: true },
  { cityId: 'eg-cairo', cityName: 'Cairo', normalizedName: 'cairo', countryCode: 'EG', lat: 30.0444, lng: 31.2357, isVerifiedCoordinates: true },
  { cityId: 'eg-alexandria', cityName: 'Alexandria', normalizedName: 'alexandria', countryCode: 'EG', lat: 31.2001, lng: 29.9187, isVerifiedCoordinates: true },
  { cityId: 'br-sao-paulo', cityName: 'São Paulo', normalizedName: 'sao paulo', countryCode: 'BR', lat: -23.5505, lng: -46.6333, isVerifiedCoordinates: true },
  { cityId: 'au-sydney', cityName: 'Sydney', normalizedName: 'sydney', countryCode: 'AU', lat: -33.8688, lng: 151.2093, isVerifiedCoordinates: true },
  { cityId: 'au-melbourne', cityName: 'Melbourne', normalizedName: 'melbourne', countryCode: 'AU', lat: -37.8136, lng: 144.9631, isVerifiedCoordinates: true },
  { cityId: 'nl-amsterdam', cityName: 'Amsterdam', normalizedName: 'amsterdam', countryCode: 'NL', lat: 52.3676, lng: 4.9041, isVerifiedCoordinates: true },
  { cityId: 'se-stockholm', cityName: 'Stockholm', normalizedName: 'stockholm', countryCode: 'SE', lat: 59.3293, lng: 18.0686, isVerifiedCoordinates: true },
];

export function normalizeCityName(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function getCitiesForCountry(countryCode?: string | null): CityDirectoryEntry[] {
  const code = normalizeCountryCode(countryCode);
  if (!code) return [];
  return MAINTAINED_CITY_DIRECTORY.filter((c) => c.countryCode === code).sort((a, b) =>
    a.cityName.localeCompare(b.cityName)
  );
}

export function searchCitiesInCountry(
  countryCode: string,
  query: string
): CityDirectoryEntry[] {
  const cities = getCitiesForCountry(countryCode);
  const q = normalizeCityName(query);
  if (!q) return cities;
  return cities.filter(
    (c) =>
      c.normalizedName.includes(q) ||
      c.cityName.toLowerCase().includes(q) ||
      (c.aliases || []).some((a) => normalizeCityName(a).includes(q))
  );
}

/**
 * Resolves a city within a specific country from the maintained directory, or creates a validated
 * fallback entry if the user enters a valid city/town name not yet in the static coordinate index.
 * Never invents coordinates for fallback cities (`isVerifiedCoordinates: false`).
 */
export function resolveOrValidateCityForCountry(
  countryCode: string,
  cityInput: string
): { valid: boolean; city?: CityDirectoryEntry; error?: string } {
  const code = normalizeCountryCode(countryCode);
  if (!code) {
    return { valid: false, error: 'Please select a valid country first.' };
  }
  const availability = getCountryAvailability(code);
  if (!availability || !availability.registrationAvailable) {
    return {
      valid: false,
      error: availability?.restrictionReason || 'Selected country is not eligible for registration.',
    };
  }

  const trimmed = (cityInput || '').trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2 || trimmed.length > 64) {
    return { valid: false, error: 'Please enter a valid city name (2 to 64 characters).' };
  }
  if (!/^[a-zA-Z\u00C0-\u024F\s.'-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'City name may only contain letters, spaces, hyphens, or apostrophes.',
    };
  }

  const norm = normalizeCityName(trimmed);
  const exactMatch = MAINTAINED_CITY_DIRECTORY.find(
    (c) =>
      c.countryCode === code &&
      (c.normalizedName === norm ||
        (c.aliases || []).some((alias) => normalizeCityName(alias) === norm))
  );

  if (exactMatch) {
    return { valid: true, city: exactMatch };
  }

  // Validated fallback for towns/places not in the static coordinate table (never invents coordinates)
  const formattedName = trimmed
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  const slug = norm.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    valid: true,
    city: {
      cityId: `${code.toLowerCase()}-custom-${slug}`,
      cityName: formattedName,
      normalizedName: norm,
      countryCode: code,
      lat: null,
      lng: null,
      isVerifiedCoordinates: false,
    },
  };
}

/**
 * Calculates Haversine distance in kilometers between two cities ONLY when both belong to the
 * maintained directory with `isVerifiedCoordinates: true`. Never invents distances.
 */
export function calculateVerifiedCityDistanceKm(
  countryCodeA: string,
  cityNameA: string,
  countryCodeB: string,
  cityNameB: string
): number | null {
  const codeA = normalizeCountryCode(countryCodeA);
  const codeB = normalizeCountryCode(countryCodeB);
  if (!codeA || !codeB || codeA !== codeB) return null;

  const normA = normalizeCityName(cityNameA);
  const normB = normalizeCityName(cityNameB);
  if (!normA || !normB) return null;
  if (normA === normB) return 0;

  const entryA = MAINTAINED_CITY_DIRECTORY.find(
    (c) =>
      c.countryCode === codeA &&
      (c.normalizedName === normA ||
        (c.aliases || []).some((a) => normalizeCityName(a) === normA))
  );
  const entryB = MAINTAINED_CITY_DIRECTORY.find(
    (c) =>
      c.countryCode === codeB &&
      (c.normalizedName === normB ||
        (c.aliases || []).some((a) => normalizeCityName(a) === normB))
  );

  if (
    !entryA ||
    !entryB ||
    !entryA.isVerifiedCoordinates ||
    !entryB.isVerifiedCoordinates ||
    entryA.lat === null ||
    entryA.lng === null ||
    entryB.lat === null ||
    entryB.lng === null
  ) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((entryB.lat - entryA.lat) * Math.PI) / 180;
  const dLng = ((entryB.lng - entryA.lng) * Math.PI) / 180;
  const lat1 = (entryA.lat * Math.PI) / 180;
  const lat2 = (entryB.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ============================================================================
// 17.6 PERMANENT COUNTRY SELECTION & LOCKING ENGINE
// ============================================================================

export const PERMANENT_COUNTRY_LOCK_WARNING =
  'Choose your country carefully. Your country cannot be changed directly after submission. Make sure it is correct before continuing.';

export interface LocationOnboardingSubmission {
  countryCode: string;
  cityName: string;
  confirmedPermanentCountryLock: boolean;
  cityVisibility?: 'PUBLIC' | 'PRIVATE';
}

export interface LockedUserLocationRecord {
  countryCode: string;
  countryName: string;
  countryFlag: string;
  cityId: string;
  cityName: string;
  cityVisibility: 'PUBLIC' | 'PRIVATE';
  countryLockedAtIso: string;
  locationCompletedAtIso: string;
}

export function validateAndLockUserLocationOnboarding(
  submission: LocationOnboardingSubmission,
  existingLockedCountryCode?: string | null,
  existingLockedAtIso?: string | null,
  nowIso: string = new Date().toISOString()
): { valid: boolean; record?: LockedUserLocationRecord; error?: string; code?: string } {
  const nextCountry = normalizeCountryCode(submission.countryCode);
  if (!nextCountry) {
    return {
      valid: false,
      code: 'INVALID_COUNTRY',
      error: 'Please select a valid country from the list.',
    };
  }

  // If the user's country is already locked, block any attempt to change it!
  const prevLocked = normalizeCountryCode(existingLockedCountryCode);
  if (prevLocked && existingLockedAtIso && prevLocked !== nextCountry) {
    return {
      valid: false,
      code: 'COUNTRY_LOCKED',
      error: `Permanent country lock enforced: Your country (${prevLocked}) cannot be changed directly after submission. Please submit an administrative support request if you made a genuine error.`,
    };
  }

  const availability = getCountryAvailability(nextCountry);
  if (!availability || !availability.registrationAvailable || !availability.marketplaceAvailable) {
    return {
      valid: false,
      code: 'COUNTRY_RESTRICTED',
      error:
        availability?.restrictionReason ||
        'BorrowBond registration is not available in the selected country.',
    };
  }

  if (submission.confirmedPermanentCountryLock !== true) {
    return {
      valid: false,
      code: 'CONFIRMATION_REQUIRED',
      error:
        'You must confirm that you understand your country selection is permanent and cannot be changed directly after submission.',
    };
  }

  const cityCheck = resolveOrValidateCityForCountry(nextCountry, submission.cityName);
  if (!cityCheck.valid || !cityCheck.city) {
    return {
      valid: false,
      code: 'INVALID_CITY',
      error: cityCheck.error || 'Please select or enter a valid city in your country.',
    };
  }

  return {
    valid: true,
    record: {
      countryCode: nextCountry,
      countryName: availability.countryName,
      countryFlag: getCountryFlagEmoji(nextCountry),
      cityId: cityCheck.city.cityId,
      cityName: cityCheck.city.cityName,
      cityVisibility: submission.cityVisibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      countryLockedAtIso: existingLockedAtIso || nowIso,
      locationCompletedAtIso: nowIso,
    },
  };
}

/**
 * Allows a user whose country is permanently locked to update ONLY their city or cityVisibility
 * within their existing locked country (Section 17.6 & 17.8).
 * Rejects any attempt to modify `countryCode`.
 */
export function updateLockedUserCityOrVisibility(params: {
  lockedCountryCode: string;
  lockedAtIso: string;
  attemptedCountryCode?: string;
  newCityName: string;
  cityVisibility?: 'PUBLIC' | 'PRIVATE';
}): { valid: boolean; city?: CityDirectoryEntry; cityVisibility?: 'PUBLIC' | 'PRIVATE'; error?: string; code?: string } {
  const lockedCode = normalizeCountryCode(params.lockedCountryCode);
  const attemptedCode = params.attemptedCountryCode
    ? normalizeCountryCode(params.attemptedCountryCode)
    : lockedCode;

  if (attemptedCode !== lockedCode) {
    return {
      valid: false,
      code: 'COUNTRY_LOCKED',
      error: `Your country (${lockedCode}) is permanently locked and cannot be changed directly. Only your city or city visibility may be updated.`,
    };
  }

  const cityRes = resolveOrValidateCityForCountry(lockedCode, params.newCityName);
  if (!cityRes.valid || !cityRes.city) {
    return {
      valid: false,
      code: 'INVALID_CITY',
      error: cityRes.error || 'Invalid city for your registered country.',
    };
  }

  return {
    valid: true,
    city: cityRes.city,
    cityVisibility: params.cityVisibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
  };
}

/**
 * Authorized administrative override for genuine country selection errors after support review (Section 17.6).
 */
export function executeAdminCountryCorrection(params: {
  callerWallet: string;
  authorizedAdminWallets: string[];
  targetWallet: string;
  previousCountryCode: string;
  newCountryCode: string;
  newCityName: string;
  supportTicketId: string;
  reason: string;
  nowIso?: string;
}): {
  allowed: boolean;
  record?: LockedUserLocationRecord;
  auditMetadata?: Record<string, unknown>;
  error?: string;
} {
  const caller = (params.callerWallet || '').trim().toLowerCase();
  const isAuthorized = params.authorizedAdminWallets.some(
    (w) => w.trim().toLowerCase() === caller
  );
  if (!isAuthorized) {
    return {
      allowed: false,
      error: 'Unauthorized: Only an authorized BorrowBond administrator can approve a locked-country correction.',
    };
  }
  if (!params.supportTicketId || params.supportTicketId.trim().length < 3) {
    return {
      allowed: false,
      error: 'Valid support ticket reference is required for administrative country correction.',
    };
  }
  if (!params.reason || params.reason.trim().length < 8) {
    return {
      allowed: false,
      error: 'Detailed correction reason is required for the audit log.',
    };
  }

  const nowIso = params.nowIso || new Date().toISOString();
  const validation = validateAndLockUserLocationOnboarding(
    {
      countryCode: params.newCountryCode,
      cityName: params.newCityName,
      confirmedPermanentCountryLock: true,
    },
    null,
    null,
    nowIso
  );

  if (!validation.valid || !validation.record) {
    return {
      allowed: false,
      error: validation.error || 'Invalid target country or city for administrative correction.',
    };
  }

  return {
    allowed: true,
    record: validation.record,
    auditMetadata: {
      targetWallet: params.targetWallet,
      previousCountryCode: normalizeCountryCode(params.previousCountryCode),
      newCountryCode: validation.record.countryCode,
      newCityName: validation.record.cityName,
      supportTicketId: params.supportTicketId.trim(),
      reason: params.reason.trim(),
      approvedBy: caller,
      approvedAtIso: nowIso,
    },
  };
}

// ============================================================================
// 17.9 & 17.10 INTELLIGENT LOCATION-BASED MATCHING & AI MARKETPLACE DISCOVERY
// ============================================================================

export type LocationMatchPriority =
  | 'SAME_CITY'
  | 'NEARBY_CITY'
  | 'SAME_COUNTRY'
  | 'GLOBAL_DIGITAL';

export type LocationScopeFilter = 'SAME_CITY' | 'NEARBY_CITIES' | 'ENTIRE_COUNTRY';

export interface RankedMarketplaceListing {
  listing: MarketplaceListing;
  eligible: boolean;
  priorityTier: LocationMatchPriority;
  priorityBadgeLabel:
    | 'Available in your city'
    | 'Available near you'
    | 'Explore your country'
    | 'Available elsewhere in your country'
    | 'Global digital resource';
  aiRecommendationLabel?: 'Recommended for your search';
  verifiedDistanceKm: number | null; // Populated ONLY when supported by actual verified coordinates
  recommendationExplanation: string;
  relevanceScore: number;
}

export interface LocationRankedMarketplaceResult {
  userCountryCode: string;
  userCountryName: string;
  userCityName: string;
  requestedScope: LocationScopeFilter;
  effectiveScope: LocationScopeFilter;
  autoExpandedFromCity: boolean;
  autoExpansionNotice: string | null;
  sameCityListings: RankedMarketplaceListing[];
  nearbyCityListings: RankedMarketplaceListing[];
  sameCountryOtherListings: RankedMarketplaceListing[];
  globalDigitalListings: RankedMarketplaceListing[];
  allEligibleRanked: RankedMarketplaceListing[];
}

const NEARBY_CITY_MAX_KM = 350;

export function rankMarketplaceListingsByLocation(params: {
  listings: MarketplaceListing[];
  profiles: Record<string, ProviderProfile>;
  userCountryCode: string;
  userCityName: string;
  scopeFilter?: LocationScopeFilter;
  searchQuery?: string;
  resourceFilter?: 'ALL' | 'PHYSICAL' | 'DIGITAL';
}): LocationRankedMarketplaceResult {
  const userCountry = normalizeCountryCode(params.userCountryCode) || 'ET';
  const userCity = (params.userCityName || '').trim();
  const userCityNorm = normalizeCityName(userCity);
  const requestedScope: LocationScopeFilter = params.scopeFilter || 'ENTIRE_COUNTRY';
  const q = (params.searchQuery || '').trim().toLowerCase();
  const queryTokens = q
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const syntheticBorrowerProfile: ProviderProfile = {
    walletAccountId: 'location-matcher',
    displayName: 'Location Matcher',
    bio: '',
    profileStatus: 'WALLET_CONNECTED',
    completedBorrows: 0,
    completedLends: 0,
    disputesCount: 0,
    cancellationsCount: 0,
    accountCreatedIso: new Date().toISOString(),
    countryCode: userCountry,
    cityName: userCity,
  };

  const sameCityListings: RankedMarketplaceListing[] = [];
  const nearbyCityListings: RankedMarketplaceListing[] = [];
  const sameCountryOtherListings: RankedMarketplaceListing[] = [];
  const globalDigitalListings: RankedMarketplaceListing[] = [];

  for (const listing of params.listings) {
    if (listing.availabilityStatus !== 'AVAILABLE') continue;
    if (params.resourceFilter && params.resourceFilter !== 'ALL' && listing.resourceType !== params.resourceFilter) {
      continue;
    }

    const lenderProfile = params.profiles[listing.ownerWallet];
    // 1. Run deterministic eligibility check FIRST (Cross-country physical items are strictly excluded)
    const eligibility = evaluatePhysicalEligibility({
      listing,
      borrowerProfile: syntheticBorrowerProfile,
      lenderProfile,
    });
    if (!eligibility.eligible) {
      continue;
    }

    // 2. Compute keyword/semantic match score if searchQuery is provided
    const searchableText = `${listing.title} ${listing.description} ${listing.category} ${listing.brandAndModel || ''} ${listing.cityName || ''}`.toLowerCase();
    let keywordHits = 0;
    if (queryTokens.length > 0) {
      for (const token of queryTokens) {
        if (searchableText.includes(token)) keywordHits += 1;
        // Handle common natural language synonyms (e.g. programming -> laptop/compute/gpu/api)
        if (
          (token === 'programming' || token === 'coding' || token === 'developer') &&
          /laptop|workstation|thinkpad|macbook|gpu|compute|api|software/i.test(searchableText)
        ) {
          keywordHits += 1;
        }
        if (
          (token === 'filming' || token === 'video' || token === 'photography') &&
          /camera|sony|canon|lens|cinema|projector/i.test(searchableText)
        ) {
          keywordHits += 1;
        }
      }
      if (keywordHits === 0) continue;
    }

    if (listing.resourceType === 'DIGITAL') {
      globalDigitalListings.push({
        listing,
        eligible: true,
        priorityTier: 'GLOBAL_DIGITAL',
        priorityBadgeLabel: 'Global digital resource',
        aiRecommendationLabel: keywordHits > 0 ? 'Recommended for your search' : undefined,
        verifiedDistanceKm: null,
        recommendationExplanation:
          keywordHits > 0
            ? `Matches your search and is globally accessible with instant programmable NEAR escrow.`
            : `Globally available digital resource with instant escrow access.`,
        relevanceScore: 50 + keywordHits * 15,
      });
      continue;
    }

    // Eligible same-country physical listing: classify into Priority 1 (Same City), Priority 2 (Nearby), Priority 3 (Country)
    const listingCity = (listing.cityName || lenderProfile?.cityName || '').trim();
    const listingCityNorm = normalizeCityName(listingCity);

    if (userCityNorm && listingCityNorm === userCityNorm) {
      sameCityListings.push({
        listing,
        eligible: true,
        priorityTier: 'SAME_CITY',
        priorityBadgeLabel: 'Available in your city',
        aiRecommendationLabel: keywordHits > 0 ? 'Recommended for your search' : undefined,
        verifiedDistanceKm: 0,
        recommendationExplanation: `Located directly in your city (${listingCity}) for convenient local handover.`,
        relevanceScore: 100 + keywordHits * 20,
      });
      continue;
    }

    const distKm =
      userCity && listingCity
        ? calculateVerifiedCityDistanceKm(userCountry, userCity, userCountry, listingCity)
        : null;

    if (distKm !== null && distKm > 0 && distKm <= NEARBY_CITY_MAX_KM) {
      nearbyCityListings.push({
        listing,
        eligible: true,
        priorityTier: 'NEARBY_CITY',
        priorityBadgeLabel: 'Available near you',
        aiRecommendationLabel: keywordHits > 0 ? 'Recommended for your search' : undefined,
        verifiedDistanceKm: distKm,
        recommendationExplanation: `Available in nearby ${listingCity} (~${distKm} km from ${userCity}) within ${eligibility.listingCountryName}.`,
        relevanceScore: 80 - Math.min(25, Math.floor(distKm / 20)) + keywordHits * 20,
      });
      continue;
    }

    sameCountryOtherListings.push({
      listing,
      eligible: true,
      priorityTier: 'SAME_COUNTRY',
      priorityBadgeLabel:
        q.length > 0 ? 'Available elsewhere in your country' : 'Explore your country',
      aiRecommendationLabel: keywordHits > 0 ? 'Recommended for your search' : undefined,
      verifiedDistanceKm: distKm,
      recommendationExplanation: `Available in ${listingCity || eligibility.listingCountryName} (${eligibility.listingCountryName}) under same-country escrow protection.`,
      relevanceScore: 60 + keywordHits * 20,
    });
  }

  nearbyCityListings.sort(
    (a, b) => (a.verifiedDistanceKm ?? 9999) - (b.verifiedDistanceKm ?? 9999)
  );
  sameCityListings.sort((a, b) => b.relevanceScore - a.relevanceScore);
  sameCountryOtherListings.sort((a, b) => b.relevanceScore - a.relevanceScore);
  globalDigitalListings.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Automatic expansion when no products exist in the selected city (Section 17.9)
  let effectiveScope: LocationScopeFilter = requestedScope;
  let autoExpandedFromCity = false;
  let autoExpansionNotice: string | null = null;

  if (requestedScope === 'SAME_CITY' && sameCityListings.length === 0) {
    autoExpandedFromCity = true;
    if (nearbyCityListings.length > 0) {
      effectiveScope = 'NEARBY_CITIES';
      autoExpansionNotice = `No matching physical items were found directly in ${userCity || 'your city'}. Automatically expanded to nearby cities and same-country listings.`;
    } else {
      effectiveScope = 'ENTIRE_COUNTRY';
      autoExpansionNotice = `No matching physical items were found directly in ${userCity || 'your city'}. Showing eligible items across ${getCountryAvailability(userCountry)?.countryName || userCountry}.`;
    }
  } else if (
    requestedScope === 'NEARBY_CITIES' &&
    sameCityListings.length === 0 &&
    nearbyCityListings.length === 0 &&
    sameCountryOtherListings.length > 0
  ) {
    autoExpandedFromCity = true;
    effectiveScope = 'ENTIRE_COUNTRY';
    autoExpansionNotice = `No matching physical items within nearby cities of ${userCity || 'your city'}. Automatically expanded to all eligible cities in ${getCountryAvailability(userCountry)?.countryName || userCountry}.`;
  }

  let scopedPhysical: RankedMarketplaceListing[] = [];
  if (effectiveScope === 'SAME_CITY') {
    scopedPhysical = [...sameCityListings];
  } else if (effectiveScope === 'NEARBY_CITIES') {
    scopedPhysical = [...sameCityListings, ...nearbyCityListings];
  } else {
    scopedPhysical = [
      ...sameCityListings,
      ...nearbyCityListings,
      ...sameCountryOtherListings,
    ];
  }

  const allEligibleRanked = [...scopedPhysical, ...globalDigitalListings];

  return {
    userCountryCode: userCountry,
    userCountryName: getCountryAvailability(userCountry)?.countryName || userCountry,
    userCityName: userCity,
    requestedScope,
    effectiveScope,
    autoExpandedFromCity,
    autoExpansionNotice,
    sameCityListings,
    nearbyCityListings,
    sameCountryOtherListings,
    globalDigitalListings,
    allEligibleRanked,
  };
}
