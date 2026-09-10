import type { ReactNode } from 'react';

export function AdminAction({ children, help }: { children: ReactNode; help: string }) {
  return <div className="admin-action">{children}<small>{help}</small></div>;
}
