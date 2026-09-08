// Upload a file to R2 and return the key
export async function uploadFile(
  r2: R2Bucket,
  file: File,
  phaseId: string,
  uploadId: string
): Promise<{ key: string; type: 'image' | 'video' | 'doc' }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const key = `uploads/${phaseId}/${uploadId}.${ext}`;

  await r2.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { originalName: file.name },
  });

  // Determine file type
  let type: 'image' | 'video' | 'doc' = 'doc';
  if (file.type.startsWith('image/')) {
    type = 'image';
  } else if (file.type.startsWith('video/')) {
    type = 'video';
  }

  return { key, type };
}

// Delete a file from R2
export async function deleteFile(r2: R2Bucket, key: string): Promise<boolean> {
  await r2.delete(key);
  return true;
}

// Delete multiple files from R2
export async function deleteFiles(r2: R2Bucket, keys: string[]): Promise<boolean> {
  if (keys.length === 0) return true;
  await r2.delete(keys);
  return true;
}

// Get a signed/public URL for a file
export function getFileUrl(key: string): string {
  // Files are served through the /r2/:key route
  return `/r2/${key}`;
}
