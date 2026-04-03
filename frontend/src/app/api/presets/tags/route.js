import { presetsDb } from "@/db/presets";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const tags = await presetsDb.getPopularTags(limit);
    return Response.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return Response.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}