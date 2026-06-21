import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import {
  activateWaitingWorker,
  onServiceWorkerControllerChange,
  registerServiceWorker,
} from "@/services/register-service-worker";
import { UpdateAvailableBanner } from "@/components/layout/update-available-banner";

interface PwaLifecycleProps {
  children: ReactNode;
}

export function PwaLifecycle({ children }: PwaLifecycleProps): ReactElement {
  const [waitingRegistration, setWaitingRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }

    void registerServiceWorker((registration) => {
      if (registration.waiting != null) {
        setWaitingRegistration(registration);
      }
    });

    return onServiceWorkerControllerChange(() => {
      window.location.reload();
    });
  }, []);

  function handleRefresh(): void {
    if (waitingRegistration != null) {
      activateWaitingWorker(waitingRegistration);
      return;
    }
    window.location.reload();
  }

  return (
    <>
      {waitingRegistration != null ? (
        <UpdateAvailableBanner onRefresh={handleRefresh} />
      ) : null}
      {children}
    </>
  );
}
