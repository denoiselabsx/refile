const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadFiles(files, prompt, userId) {
  const uploadFormData = new FormData();
  files.forEach((file) => uploadFormData.append("files", file));

  const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: uploadFormData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const uploadResult = await uploadResponse.json();

  const fileNames = uploadResult.files.map((f) => f.stored_filename);
  const processFormData = new FormData();
  processFormData.append("prompt", prompt);
  processFormData.append("uploaded_files", JSON.stringify(fileNames));

  const processResponse = await fetch(`${API_BASE_URL}/api/process`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: processFormData,
  });

  if (!processResponse.ok) {
    const error = await processResponse.text();
    throw new Error(`AI processing failed: ${error}`);
  }

  const processResult = await processResponse.json();

  return {
    status: "ok",
    files: uploadResult.files,
    ai_response: processResult.ai_response,
    prompt_id: uploadResult.files[0]?.id || null,
  };
}

export async function getStatus(promptId, userId) {
  const response = await fetch(`${API_BASE_URL}/api/status/${promptId}`, {
    headers: { "x-user-id": userId },
  });
  if (!response.ok) {
    throw new Error(`Failed to get status: ${await response.text()}`);
  }
  return response.json();
}

export async function listPrompts(userId) {
  const response = await fetch(`${API_BASE_URL}/api/list/${userId}`, {
    headers: { "x-user-id": userId },
  });
  if (!response.ok) {
    throw new Error(`Failed to list prompts: ${await response.text()}`);
  }
  return response.json();
}

export async function downloadFile(userId, storedFilename) {
  const response = await fetch(
    `${API_BASE_URL}/api/download/${userId}/${storedFilename}`,
    { headers: { "x-user-id": userId } }
  );
  if (!response.ok) {
    throw new Error(`Failed to download file: ${await response.text()}`);
  }
  return response.blob();
}

export async function processFollowUp(prompt, uploadedFiles, userId, previousResult = null) {
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("uploaded_files", JSON.stringify(uploadedFiles));

  if (previousResult) {
    formData.append("previous_command", previousResult.linux_command || "");
    formData.append("previous_input_files", JSON.stringify(previousResult.input_files || []));
    formData.append("previous_output_files", JSON.stringify(previousResult.output_files || []));
    formData.append("previous_description", previousResult.description || "");
  }

  const response = await fetch(`${API_BASE_URL}/api/process`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Processing failed: ${await response.text()}`);
  }
  return response.json();
}

export async function healthCheck() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) throw new Error("Backend is not responding");
  return response.json();
}
