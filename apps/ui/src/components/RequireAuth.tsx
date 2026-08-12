import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../auth";

type Props = {
  children: ReactNode;
};

export default function RequireAuth({ children }: Props) {
  if (!getToken()) {
    return <Navigate to="/" replace />;
  }

  return children;
}
