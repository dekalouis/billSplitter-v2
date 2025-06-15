export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  // At least 6 characters
  return password && password.length >= 6;
}

export function validateRegisterInput(input) {
  const { email, password, name } = input;
  const errors = [];

  if (!email) {
    errors.push("Email is required");
  } else if (!validateEmail(email)) {
    errors.push("Please provide a valid email");
  }

  if (!password) {
    errors.push("Password is required");
  } else if (!validatePassword(password)) {
    errors.push("Password must be at least 6 characters long");
  }

  if (!name || name.trim().length === 0) {
    errors.push("Name is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateLoginInput(input) {
  const { email, password } = input;
  const errors = [];

  if (!email) {
    errors.push("Email is required");
  } else if (!validateEmail(email)) {
    errors.push("Please provide a valid email");
  }

  if (!password) {
    errors.push("Password is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
