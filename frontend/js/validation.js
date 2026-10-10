/**
 * validation.js — Client-Side Form Validation
 *
 * Validation is a usability layer only.
 * The Java backend is responsible for all business rule validation.
 * These checks prevent obviously invalid requests from reaching the API.
 */

/**
 * Validates a vehicle registration number.
 * Accepts common Indian registration formats (TN-01-AB-1234, etc.)
 * and general alphanumeric formats.
 *
 * @param {string} regNum - The registration number to validate
 * @returns {{ valid: boolean, message: string }}
 */
function validateVehicleId(regNum) {
    if (!regNum || regNum.trim().length < 2) {
        return { valid: false, message: 'Vehicle registration number is required.' };
    }
    const trimmed = regNum.trim();
    // Allow alphanumeric with hyphens
    if (!/^[A-Za-z0-9\-]+$/.test(trimmed)) {
        return { valid: false, message: 'Registration number can only contain letters, numbers, and hyphens.' };
    }
    if (trimmed.length > 20) {
        return { valid: false, message: 'Registration number is too long (max 20 characters).' };
    }
    return { valid: true, message: '' };
}

/**
 * Validates a booking time range.
 * @param {number} startMins - Start time in minutes from midnight
 * @param {number} endMins - End time in minutes from midnight
 * @returns {{ valid: boolean, message: string }}
 */
function validateTimeRange(startMins, endMins) {
    if (isNaN(startMins) || startMins < 0) {
        return { valid: false, message: 'Please select a valid start time.' };
    }
    if (isNaN(endMins) || endMins < 0) {
        return { valid: false, message: 'Please select a valid end time.' };
    }
    if (endMins <= startMins) {
        return { valid: false, message: 'End time must be after start time.' };
    }
    if ((endMins - startMins) < 30) {
        return { valid: false, message: 'Minimum booking duration is 30 minutes.' };
    }
    return { valid: true, message: '' };
}

/**
 * Shows a validation error below a form control.
 * @param {string} inputId - ID of the form control
 * @param {string} errorId - ID of the error div
 * @param {string} message - Error message to display
 */
function showFieldError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.add('error');
    if (error) {
        error.textContent = message;
        error.classList.add('visible');
    }
}

/**
 * Clears a validation error.
 * @param {string} inputId
 * @param {string} errorId
 */
function clearFieldError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.remove('error');
    if (error) error.classList.remove('visible');
}

/**
 * Attaches live validation listeners to form fields.
 */
function attachLiveValidation(inputId, errorId, validatorFn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', () => {
        const result = validatorFn(input.value);
        if (!result.valid) {
            showFieldError(inputId, errorId, result.message);
        } else {
            clearFieldError(inputId, errorId);
        }
    });

    input.addEventListener('blur', () => {
        const result = validatorFn(input.value);
        if (!result.valid) {
            showFieldError(inputId, errorId, result.message);
        } else {
            clearFieldError(inputId, errorId);
        }
    });
}

/**
 * Validates that a required select has a non-empty value.
 * @param {string} selectId
 * @param {string} errorId
 * @returns {boolean}
 */
function validateSelect(selectId, errorId) {
    const select = document.getElementById(selectId);
    if (!select) return true;
    if (!select.value || select.value.trim() === '') {
        showFieldError(selectId, errorId, 'Please select an option.');
        return false;
    }
    clearFieldError(selectId, errorId);
    return true;
}

window.validateVehicleId = validateVehicleId;
window.validateTimeRange = validateTimeRange;
window.showFieldError = showFieldError;
window.clearFieldError = clearFieldError;
window.attachLiveValidation = attachLiveValidation;
window.validateSelect = validateSelect;
