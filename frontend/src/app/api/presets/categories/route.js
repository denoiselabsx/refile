import { presetsDb } from "@/db/presets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await presetsDb.getCategories();
    return Response.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return Response.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}