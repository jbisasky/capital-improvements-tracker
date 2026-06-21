export const SW_URL = "/sw.js";

export type ServiceWorkerUpdateHandler = (registration: ServiceWorkerRegistration) => void;

export async function registerServiceWorker(
  onUpdate?: ServiceWorkerUpdateHandler,
): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: "/",
    });

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (installing == null) {
        return;
      }
      installing.addEventListener("statechange", () => {
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller != null &&
          onUpdate != null
        ) {
          onUpdate(registration);
        }
      });
    });

    return registration;
  } catch {
    return null;
  }
}

export function activateWaitingWorker(
  registration: ServiceWorkerRegistration,
): void {
  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
}

export function onServiceWorkerControllerChange(reload: () => void): () => void {
  navigator.serviceWorker.addEventListener("controllerchange", reload);
  return () => {
    navigator.serviceWorker.removeEventListener("controllerchange", reload);
  };
}
