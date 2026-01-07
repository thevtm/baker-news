export class ApplicationError extends Error {
  public external_message: string;
  public data: Record<string, unknown>;

  constructor(internal_message: string, external_message: string, data: Record<string, unknown> = {}) {
    super(internal_message);

    this.name = "ApplicationError";
    this.external_message = external_message;
    this.data = data;
  }
}
