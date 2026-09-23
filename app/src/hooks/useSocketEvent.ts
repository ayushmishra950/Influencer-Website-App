import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';

/**
 * Subscribes to a server event for as long as the component is mounted.
 *
 * AuthContext creates the socket asynchronously — it waits on the stored token — so a
 * screen that mounts first would miss it. This retries briefly until the socket exists,
 * then attaches once. The handler is held in a ref so re-renders do not resubscribe.
 */
export function useSocketEvent(event: string, handler: () => void, enabled = true): void {
  const saved = useRef(handler);
  saved.current = handler;

  useEffect(() => {
    if (!enabled) return;

    let attached: ReturnType<typeof getSocket> = null;
    const listener = () => saved.current();

    const attach = () => {
      const socket = getSocket();
      if (!socket) return false;
      socket.on(event, listener);
      attached = socket;
      return true;
    };

    if (attach()) {
      return () => {
        attached?.off(event, listener);
      };
    }

    const timer = setInterval(() => {
      if (attach()) clearInterval(timer);
    }, 400);
    const stop = setTimeout(() => clearInterval(timer), 10_000);

    return () => {
      clearInterval(timer);
      clearTimeout(stop);
      attached?.off(event, listener);
    };
  }, [event, enabled]);
}
