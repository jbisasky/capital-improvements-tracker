/** Deletes all Cache Storage entries (PWA shell + assets). */

export async function deleteAllCaches(): Promise<void> {
  if (typeof caches === "undefined") {
    return;
  }
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}
