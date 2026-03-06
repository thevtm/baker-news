import { createContext, ReactNode } from "react";

import { APIClient } from "../api-client";

export const APIClientContext = createContext<APIClient | null>(null);

type APIClientProviderProps = {
  apiClient: APIClient;
  children: ReactNode;
};

export const APIClientProvider = ({ apiClient, children }: APIClientProviderProps) => (
  <APIClientContext.Provider value={apiClient}>{children}</APIClientContext.Provider>
);
