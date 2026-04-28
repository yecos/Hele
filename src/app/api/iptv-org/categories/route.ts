import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/iptv-org-cache';

// Cache por 24 horas - las categorias casi no cambian
export const revalidate = 86400;

/**
 * GET /api/iptv-org/categories
 *
 * Devuelve las 30 categorias disponibles de iptv-org.
 */
export async function GET() {
  try {
    const categories = await getCategories();

    const formatted = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
    }));

    return NextResponse.json({
      total: formatted.length,
      categories: formatted,
    });
  } catch (error) {
    console.error('IPTV-Org categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
