export function validateCreateBillInput(input) {
  const { title, subtotal, taxAmount, serviceChargeAmount } = input;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push("Bill title is required");
  }

  if (title && title.length > 100) {
    errors.push("Bill title must be less than 100 characters");
  }

  if (subtotal === undefined || subtotal === null) {
    errors.push("Subtotal is required");
  } else if (typeof subtotal !== "number" || subtotal < 0) {
    errors.push("Subtotal must be a positive number");
  }

  if (taxAmount === undefined || taxAmount === null) {
    errors.push("Tax amount is required");
  } else if (typeof taxAmount !== "number" || taxAmount < 0) {
    errors.push("Tax amount must be a positive number");
  }

  if (serviceChargeAmount === undefined || serviceChargeAmount === null) {
    errors.push("Service charge amount is required");
  } else if (
    typeof serviceChargeAmount !== "number" ||
    serviceChargeAmount < 0
  ) {
    errors.push("Service charge amount must be a positive number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateParticipantInput(input) {
  const { name, email } = input;
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push("Participant name is required");
  }

  if (name && name.length > 50) {
    errors.push("Participant name must be less than 50 characters");
  }

  if (email && email.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push("Please provide a valid email address");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateItemInput(input) {
  const { name, price, quantity } = input;
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push("Item name is required");
  }

  if (name && name.length > 100) {
    errors.push("Item name must be less than 100 characters");
  }

  if (price === undefined || price === null) {
    errors.push("Item price is required");
  } else if (typeof price !== "number" || price < 0) {
    errors.push("Item price must be a positive number");
  }

  if (quantity === undefined || quantity === null) {
    errors.push("Item quantity is required");
  } else if (
    typeof quantity !== "number" ||
    quantity < 1 ||
    !Number.isInteger(quantity)
  ) {
    errors.push("Item quantity must be a positive integer");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateItemAllocationInput(input) {
  const { portion } = input;
  const errors = [];

  if (portion === undefined || portion === null) {
    errors.push("Allocation portion is required");
  } else if (typeof portion !== "number" || portion < 0 || portion > 1) {
    errors.push("Allocation portion must be a number between 0 and 1");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateOCRItemsInput(items) {
  const errors = [];

  if (!Array.isArray(items)) {
    errors.push("Items must be an array");
    return { isValid: false, errors };
  }

  items.forEach((item, index) => {
    const itemValidation = validateItemInput(item);
    if (!itemValidation.isValid) {
      errors.push(`Item ${index + 1}: ${itemValidation.errors.join(", ")}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Utility function to validate that allocation portions for an item don't exceed 1.0
export function validateItemAllocationTotals(allocations) {
  const itemTotals = {};

  allocations.forEach((allocation) => {
    const itemId = allocation.itemId.toString();
    if (!itemTotals[itemId]) {
      itemTotals[itemId] = 0;
    }
    itemTotals[itemId] += allocation.portion;
  });

  const errors = [];
  Object.entries(itemTotals).forEach(([itemId, total]) => {
    if (total > 1.0) {
      errors.push(
        `Item ${itemId} has total allocation of ${total.toFixed(
          2
        )}, which exceeds 100%`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    itemTotals,
  };
}
