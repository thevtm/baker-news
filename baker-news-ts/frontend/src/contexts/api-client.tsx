import { createContext, ReactNode, useContext } from "react";

import { APIClient } from "../api-client";

const APIClientContext = createContext<APIClient | null>(null);

export const useAPIClient = (): APIClient => {
  const context = useContext(APIClientContext);
  if (!context) {
    throw new Error("useAPIClient must be used within an APIClientProvider");
  }
  return context;
};

type APIClientProviderProps = {
  apiClient: APIClient;
  children: ReactNode;
};

export const APIClientProvider = ({ apiClient, children }: APIClientProviderProps) => (
  <APIClientContext.Provider value={apiClient}>{children}</APIClientContext.Provider>
);
