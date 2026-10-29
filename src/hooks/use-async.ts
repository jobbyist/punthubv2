import { useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  failed: boolean;
  loading: boolean;
}

/** Runs `load` on mount and whenever `deps` change. A failure is logged and reported, never thrown into the page. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    failed: false,
    loading: true,
  });
  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true }));
    load()
      .then((data) => active && setState({ data, failed: false, loading: false }))
      .catch((error) => {
        console.error("load failed", error);
        if (active) setState({ data: undefined, failed: true, loading: false });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
