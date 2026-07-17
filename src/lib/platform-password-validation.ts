const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;

export function validatePlatformSignupPassword(password: string): string | null {
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  if (!SPECIAL_CHARACTER_PATTERN.test(password)) {
    return "Password must include at least one special character.";
  }

  return null;
}

export function validatePlatformSignupPasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | null {
  const passwordError = validatePlatformSignupPassword(password);
  if (passwordError) {
    return passwordError;
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}
