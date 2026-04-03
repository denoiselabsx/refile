import { getCurrentSession } from "@/lib/server/session";
import { presetsDb } from "@/db/presets";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const tool = searchParams.get('tool');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    let tags = null;
    try {
      const tagsParam = searchParams.get('tags');
      if (tagsParam) {
        tags = JSON.parse(tagsParam);
      }
    } catch (e) {
      // Invalid JSON for tags, ignore
    }

    const result = await presetsDb.getPublic({
      page,
      limit,
      category,
      tool,
      tags,
      search,
      sortBy,
      sortOrder
    });

    return Response.json({ 
      presets: result.presets,
      total: result.total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching presets:', error);
    return Response.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { session, user } = await getCurrentSession();
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'category', 'command_template', 'tool'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return Response.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Prepare preset data
    const presetData = {
      user_id: user.id,
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category,
      command_template: data.command_template.trim(),
      input_file_patterns: data.input_file_patterns || [],
      output_file_patterns: data.output_file_patterns || [],
      tags: data.tags || [],
      tool: data.tool,
      is_public: data.is_public !== false // Default to true
    };

    const preset = await presetsDb.create(presetData);

    return Response.json({ 
      preset,
      message: 'Preset created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating preset:', error);
    return Response.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}