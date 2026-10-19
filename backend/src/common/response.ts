export const buildSuccessResponse = <T>(data: T, meta: unknown = null) => ({
  success: true,
  data,
  meta,
});

export const buildErrorResponse = (
  message: string,
  code = 'INTERNAL_ERROR',
  details: unknown = null,
) => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
});
