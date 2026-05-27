import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  fetchCurrentUser,
  logout as apiLogout,
  type User,
} from "../lib/api";

// Stała ścieżka cache pod "kto teraz jest zalogowany". Wystawiamy ją,
// żeby ekrany logowania/rejestracji mogły inwalidać query po sukcesie.
export const CURRENT_USER_QUERY_KEY = ["auth", "currentUser"] as const;

// Pojedyncze źródło prawdy o sesji w UI. Hooki na bazie /api/auth/me:
//   - zwracają User | null (null = guest);
//   - nigdy nie throwują 401 (endpoint backendu też nie throwuje);
//   - cache trzymamy "świeży" 60s, żeby unikać racy między mount-ami stron;
//   - `refetchOnMount: false` chroni przed niepotrzebnym refetchem po
//     `setQueryData` z handlera logowania/aktywacji (i ułatwia testowanie).
export function useCurrentUser(): UseQueryResult<User | null> {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Hook akcji "wyloguj" — usuwa cookie po stronie backendu i czyści cache
// `currentUser`. UI obok niego najczęściej robi navigate("/").
export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiLogout,
    onSettled: () => {
      qc.setQueryData<User | null>(CURRENT_USER_QUERY_KEY, null);
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
