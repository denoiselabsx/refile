import { getCurrentSession } from "@/lib/server/session";
import { presetsDb } from "@/db/presets";

export async function GET(request, { params }) {
  try {
    const { session, user } = await getCurrentSession();
    const { id } = await params;
    const presetId = id;

    const preset = await presetsDb.getById(presetId, user?.id);
    
    if (!preset) {
      return Response.json({ error: 'Preset not found' }, { status: 404 });
    }

    // Check if user can access this preset
    if (!preset.is_public && (!user || user.id !== preset.user_id)) {
      return Response.json({ error: 'Preset not found' }, { status: 404 });
    }

    // Increment usage count (async, don't wait)
    presetsDb.incrementUsage(presetId).catch(console.error);

    return Response.json({ preset });
  } catch (error) {
    console.error('Error fetching preset:', error);
    return Response.json({ error: 'Failed to fetch preset' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { session, user } = await getCurrentSession();
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }


    const { id } = await params;
    const presetId = id;
    const data = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'description', 'category', 'command_template', 'tool'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return Response.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData = {
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category,
      command_template: data.command_template.trim(),
      input_file_patterns: data.input_file_patterns || [],
      output_file_patterns: data.output_file_patterns || [],
      tags: data.tags || [],
      tool: data.tool,
      is_public: data.is_public !== false
    };

    const preset = await presetsDb.update(presetId, user.id, updateData);

    return Response.json({ 
      preset,
      message: 'Preset updated successfully' 
    });
  } catch (error) {
    console.error('Error updating preset:', error);
    return Response.json({ error: 'Failed to update preset' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { session, user } = await getCurrentSession();
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }


    const { id } = await params;
    const presetId = id;
    
    await presetsDb.delete(presetId, user.id);

    return Response.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Error deleting preset:', error);
    return Response.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}