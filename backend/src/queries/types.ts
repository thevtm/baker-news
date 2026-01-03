export type QueryReturnType<T> = {
  success: boolean;
  error?: string;
  data?: T;
};
