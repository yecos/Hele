import { NextResponse } from 'next/server';

// Cache por 6 horas - los paises cambian muy poco
export const revalidate = 21600;

const IPTV_API_BASE = 'https://iptv-org.github.io/api';

interface ApiCountry {
  name: string;
  code: string;
  languages: string[];
  flag: string;
}

// Paises prioritarios (Latinoamerica + espana) que se muestran primero
const PRIORITY_CODES = new Set([
  'co', 'mx', 'ar', 've', 'cl', 'pe', 'ec', 'br',
  'es', 'us', 'gb', 'fr', 'de', 'it', 'pt', 'ca',
]);

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export async function GET() {
  try {
    const response = await fetch(`${IPTV_API_BASE}/countries.json`, {
      next: { revalidate: 21600 },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const countries: ApiCountry[] = await response.json();

    // Convertir a formato de la app, ordenar con prioridad LatAm
    const formattedCountries = countries
      .map((c) => ({
        code: c.code.toLowerCase(),
        name: c.name,
        flag: getFlagEmoji(c.code),
        languages: c.languages,
      }))
      .sort((a, b) => {
        const aPriority = PRIORITY_CODES.has(a.code) ? 0 : 1;
        const bPriority = PRIORITY_CODES.has(b.code) ? 0 : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      total: formattedCountries.length,
      countries: formattedCountries,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching countries from iptv-org API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 502 }
    );
  }
}
