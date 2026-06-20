const blobs = new Map<string, Blob>();

export function storeMockBlob(fileId: string, blob: Blob): void {
  blobs.set(fileId, blob);
}

export function getMockBlob(fileId: string): Blob | undefined {
  return blobs.get(fileId);
}

export function deleteMockBlob(fileId: string): void {
  blobs.delete(fileId);
}

export function clearMockBlobs(): void {
  blobs.clear();
}
