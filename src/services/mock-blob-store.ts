/**
 * In-memory blob store for MockStorageDriver attachment simulation.
 */

const mockBlobStore = new Map<string, Blob>();

export function storeMockBlob(fileId: string, blob: Blob): void {
  mockBlobStore.set(fileId, blob);
}

export function getMockBlob(fileId: string): Blob | undefined {
  return mockBlobStore.get(fileId);
}

export function deleteMockBlob(fileId: string): void {
  mockBlobStore.delete(fileId);
}

export function clearMockBlobStore(): void {
  mockBlobStore.clear();
}

export async function mockUploadFile(file: File): Promise<{
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const fileId = crypto.randomUUID();
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  storeMockBlob(fileId, blob);
  return {
    fileId,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}
