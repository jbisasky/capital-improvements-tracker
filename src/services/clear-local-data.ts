import { clearManifestCache } from "@/services/offline-manifest-cache";
import { deleteAllCaches } from "@/services/pwa-cache";

/** Wipe browser-local app data (EARS SEC-13). Drive data is unaffected. */
export async function clearLocalDeviceData(): Promise<void> {
  localStorage.clear();
  await clearManifestCache();
  await deleteAllCaches();

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}
