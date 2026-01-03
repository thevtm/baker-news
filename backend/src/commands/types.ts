export type CommandReturnType<T> = {
  success: boolean;
  error?: string;
  data?: T;
};
