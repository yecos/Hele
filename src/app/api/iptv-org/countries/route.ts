import { NextResponse } from 'next/server';

interface Country {
  code: string;
  name: string;
  flag: string;
  channelCount: number;
}

const COUNTRIES: Country[] = [
  // Latin America
  { code: 'ar', name: 'Argentina', flag: '🇦🇷', channelCount: 120 },
  { code: 'bo', name: 'Bolivia', flag: '🇧🇴', channelCount: 30 },
  { code: 'br', name: 'Brazil', flag: '🇧🇷', channelCount: 200 },
  { code: 'cl', name: 'Chile', flag: '🇨🇱', channelCount: 70 },
  { code: 'co', name: 'Colombia', flag: '🇨🇴', channelCount: 90 },
  { code: 'cr', name: 'Costa Rica', flag: '🇨🇷', channelCount: 30 },
  { code: 'cu', name: 'Cuba', flag: '🇨🇺', channelCount: 20 },
  { code: 'do', name: 'Dominican Republic', flag: '🇩🇴', channelCount: 35 },
  { code: 'ec', name: 'Ecuador', flag: '🇪🇨', channelCount: 40 },
  { code: 'sv', name: 'El Salvador', flag: '🇸🇻', channelCount: 25 },
  { code: 'gt', name: 'Guatemala', flag: '🇬🇹', channelCount: 30 },
  { code: 'hn', name: 'Honduras', flag: '🇭🇳', channelCount: 20 },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽', channelCount: 150 },
  { code: 'ni', name: 'Nicaragua', flag: '🇳🇮', channelCount: 15 },
  { code: 'pa', name: 'Panama', flag: '🇵🇦', channelCount: 25 },
  { code: 'py', name: 'Paraguay', flag: '🇵🇾', channelCount: 25 },
  { code: 'pe', name: 'Peru', flag: '🇵🇪', channelCount: 60 },
  { code: 'pr', name: 'Puerto Rico', flag: '🇵🇷', channelCount: 30 },
  { code: 'uy', name: 'Uruguay', flag: '🇺🇾', channelCount: 35 },
  { code: 've', name: 'Venezuela', flag: '🇻🇪', channelCount: 50 },
  // International
  { code: 'us', name: 'United States', flag: '🇺🇸', channelCount: 500 },
  { code: 'es', name: 'Spain', flag: '🇪🇸', channelCount: 250 },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', channelCount: 200 },
  { code: 'de', name: 'Germany', flag: '🇩🇪', channelCount: 180 },
  { code: 'fr', name: 'France', flag: '🇫🇷', channelCount: 160 },
  { code: 'it', name: 'Italy', flag: '🇮🇹', channelCount: 150 },
  { code: 'pt', name: 'Portugal', flag: '🇵🇹', channelCount: 60 },
  { code: 'jp', name: 'Japan', flag: '🇯🇵', channelCount: 100 },
  { code: 'kr', name: 'South Korea', flag: '🇰🇷', channelCount: 80 },
  { code: 'ca', name: 'Canada', flag: '🇨🇦', channelCount: 120 },
  { code: 'au', name: 'Australia', flag: '🇦🇺', channelCount: 90 },
  { code: 'in', name: 'India', flag: '🇮🇳', channelCount: 200 },
  { code: 'tr', name: 'Turkey', flag: '🇹🇷', channelCount: 120 },
  { code: 'ru', name: 'Russia', flag: '🇷🇺', channelCount: 150 },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱', channelCount: 60 },
  { code: 'se', name: 'Sweden', flag: '🇸🇪', channelCount: 40 },
  { code: 'no', name: 'Norway', flag: '🇳🇴', channelCount: 30 },
  { code: 'pl', name: 'Poland', flag: '🇵🇱', channelCount: 70 },
  { code: 'ae', name: 'United Arab Emirates', flag: '🇦🇪', channelCount: 50 },
];

export async function GET() {
  return NextResponse.json({
    total: COUNTRIES.length,
    countries: COUNTRIES,
  });
}
