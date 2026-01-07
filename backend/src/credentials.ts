import myCredentials from "schluessel";

export type Credentials = {
  database_url: string;
  database_logger: boolean;
};

export const credentials: Credentials = myCredentials;
