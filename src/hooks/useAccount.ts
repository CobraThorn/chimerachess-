import { useCallback, useEffect, useState } from "react";
import {
  loadAccount,
  loadDataEvents,
  type UserAccount,
} from "../account";
import { ACCOUNT_EVENT } from "../account/types";

export function useAccount() {
  const [account, setAccount] = useState<UserAccount | null>(() => loadAccount());
  const [eventCount, setEventCount] = useState(
    () => loadDataEvents().events.length
  );

  const refresh = useCallback(() => {
    setAccount(loadAccount());
    setEventCount(loadDataEvents().events.length);
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(ACCOUNT_EVENT, onUpdate);
    return () => window.removeEventListener(ACCOUNT_EVENT, onUpdate);
  }, [refresh]);

  return {
    account,
    isLoggedIn: !!account?.isLoggedIn,
    eventCount,
    refresh,
  };
}
