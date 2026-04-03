/**
 * API Service for refile backend
 * Handles all communication with FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Upload files with a prompt to the backend and get AI response
 * @param {File[]} files - Array of files to upload
 * @param {string} prompt - User's instruction for what to do with the files
 * @param {string} userId - User ID for authentication
 * @returns {Promise<Object>} Upload response with AI-generated command
 */
export async function uploadFiles(files, prompt, userId) {
  console.log("📤 Step 1: Uploading files...");
  
  // Step 1: Upload files first
  const uploadFormData = new FormData();
  files.forEach((file) => {
    uploadFormData.append('files', file);
  });
  
  const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: uploadFormData,
  });
  
  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Upload failed: ${error}`);
  }
  
  const uploadResult = await uploadResponse.json();
  console.log("✅ Upload successful:", uploadResult);
  
  // Step 2: Process with AI
  console.log("🤖 Step 2: Processing with AI...");
  
  const fileNames = uploadResult.files.map(f => f.stored_filename);
  
  const processFormData = new FormData();
  processFormData.append('prompt', prompt);
  processFormData.append('uploaded_files', JSON.stringify(fileNames));
  console.log("🐛 DEBUG - Sending to process endpoint:", JSON.stringify(fileNames));
  console.log("🐛 DEBUG - FormData uploaded_files:", processFormData.get('uploaded_files'));
  const processResponse = await fetch(`${API_BASE_URL}/api/process`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: processFormData,
  });

  if (!processResponse.ok) {
    const error = await processResponse.text();
    throw new Error(`AI Processing failed: ${error}`);
  }

  const processResult = await processResponse.json();
  console.log("✅ AI Response received:", processResult);

  // Return combined result
  return {
    status: "ok",
    files: uploadResult.files,
    ai_response: processResult.ai_response,
    prompt_id: uploadResult.files[0]?.id || 'test_id'
  };
}

/**
 * Get the processing status of an uploaded file
 * @param {string} promptId - The ID of the prompt/upload
 * @param {string} userId - User ID for authentication
 * @returns {Promise<Object>} Status information
 */
export async function getStatus(promptId, userId) {
  const response = await fetch(`${API_BASE_URL}/api/status/${promptId}`, {
    headers: {
      'x-user-id': userId,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get status: ${error}`);
  }
  
  return await response.json();
}

/**
 * List all prompts/uploads for the current user
 * @param {string} userId - User ID for authentication
 * @returns {Promise<Object>} List of prompts
 */
export async function listPrompts(userId) {
  const response = await fetch(`${API_BASE_URL}/api/list/${userId}`, {
    headers: {
      'x-user-id': userId,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list prompts: ${error}`);
  }
  
  return await response.json();
}

/**
 * Download a file from the backend
 * @param {string} userId - User ID for authentication
 * @param {string} storedFilename - The stored filename
 * @returns {Promise<Blob>} The file blob
 */
export async function downloadFile(userId, storedFilename) {
  const response = await fetch(
    `${API_BASE_URL}/api/download/${userId}/${storedFilename}`,
    {
      headers: {
        'x-user-id': userId,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to download file: ${error}`);
  }
  
  return await response.blob();
}

/**
 * Process a follow-up prompt without uploading new files
 * @param {string} prompt - Follow-up instruction
 * @param {string[]} uploadedFiles - List of already uploaded filenames
 * @param {string} userId - User ID for authentication
 * @param {Object} previousResult - Previous AI response (optional)
 * @returns {Promise<Object>} New AI-generated command
 */
export async function processFollowUp(prompt, uploadedFiles, userId, previousResult = null) {
  const formData = new FormData();
  
  formData.append('prompt', prompt);
  formData.append('uploaded_files', JSON.stringify(uploadedFiles));
  
  if (previousResult) {
    formData.append('previous_command', previousResult.linux_command || '');
    formData.append('previous_input_files', JSON.stringify(previousResult.input_files || []));
    formData.append('previous_output_files', JSON.stringify(previousResult.output_files || []));
    formData.append('previous_description', previousResult.description || '');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/process`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Processing failed: ${error}`);
  }
  
  return await response.json();
}

/**
 * Health check for the backend
 * @returns {Promise<Object>} Health status
 */
export async function healthCheck() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  
  if (!response.ok) {
    throw new Error('Backend is not responding');
  }
  
  return await response.json();
}
