export class APIError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = "APIError";
  }
}

export const handleAPIError = (error: unknown) => {
  if (error instanceof APIError) {
    return error.message;
  }
  return "An unexpected error occurred";
};

export const isNotFoundError = (error: unknown): boolean => {
  if (error instanceof APIError) {
    return error.status === 404;
  }
  return false;
};
