export const validateRequiredFields = (
  payload: Record<string, unknown> | null | undefined,
  requiredFields: string[] = [],
) => {
  const missingFields = requiredFields.filter((field) => {
    const value = payload?.[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    return {
      isValid: false,
      message: `Missing required field(s): ${missingFields.join(', ')}`,
    };
  }

  return { isValid: true };
};
