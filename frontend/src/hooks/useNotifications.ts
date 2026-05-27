import { useQuery } from "@tanstack/react-query";
import { listMyBatches } from "../lib/api";
import { pendingNotifications, type Notification } from "../lib/notifications";
import { useCurrentUser } from "./useCurrentUser";

// Hook nad TanStack Query: pobiera listę nastawów zalogowanego usera i mapuje
// na powiadomienia (pure function). Reużywa tej samej query-key co MyBatches,
// więc dwa miejsca w UI dzielą cache i nie generują podwójnych żądań.

export type UseNotificationsResult = {
  notifications: Notification[];
  isLoading: boolean;
  isError: boolean;
};

export function useNotifications(): UseNotificationsResult {
  const { data: user } = useCurrentUser();
  const enabled = user != null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-batches"],
    queryFn: listMyBatches,
    enabled,
    // Dzwoneczek nie musi być doskonale świeży, ale w tle miło odświeżać przy
    // focusie okna — przyjść z innej karty i zobaczyć "dziś ci się odpaliło".
    refetchOnWindowFocus: true,
  });

  // Czas „teraz" liczymy raz na render; przy wejściu w popover wartości
  // są aktualne. Świadomie nie używamy tickera (Slice 4) — odświeżenie
  // następuje przy każdym renderze NavBaru.
  const notifications = data ? pendingNotifications(data, new Date()) : [];

  return {
    notifications,
    isLoading: enabled && isLoading,
    isError,
  };
}
