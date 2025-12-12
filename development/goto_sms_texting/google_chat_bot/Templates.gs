/**
 * GoTo SMS Texting Tool - Google Chat Bot
 * 
 * Templates.gs - Message templates for patient communication
 * 
 * These templates mirror the Python app and include the kidney video template.
 */

// ============================================
// MESSAGE TEMPLATES
// ============================================

/**
 * All available message templates
 */
const MESSAGE_TEMPLATES = {
  
  // Kidney Treatment Video Introduction
  kidney_video: {
    name: 'Kidney Treatment Video',
    description: 'Send educational video about kidney disease treatment options',
    message: `Hi {first_name}! This is {practice_name}. As we discussed your kidney health, we'd like to share an important video that explains kidney disease and the treatment options available to you:

https://www.youtube.com/watch?v=mi34xCfmLhw

This video covers dialysis, transplant, and other care options. Please watch before your next visit - we're here to answer any questions!`,
    variables: ['first_name', 'practice_name']
  },
  
  // Appointment Reminder
  appointment_reminder: {
    name: 'Appointment Reminder',
    description: 'Remind patient about upcoming appointment',
    message: `Hi {patient_name}! This is a reminder about your appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule.`,
    variables: ['patient_name', 'appointment_date', 'appointment_time']
  },
  
  // Appointment Confirmation
  appointment_confirmation: {
    name: 'Appointment Confirmation',
    description: 'Confirm a scheduled appointment',
    message: `Hi {patient_name}! Your appointment has been confirmed for {appointment_date} at {appointment_time}. We look forward to seeing you!`,
    variables: ['patient_name', 'appointment_date', 'appointment_time']
  },
  
  // Follow-up Message
  follow_up: {
    name: 'Follow-up Message',
    description: 'Remind patient to schedule a follow-up',
    message: `Hi {patient_name}! We hope you're doing well. It's time for your follow-up appointment. Please call us or reply to schedule.`,
    variables: ['patient_name']
  },
  
  // Prescription Ready
  prescription_ready: {
    name: 'Prescription Ready',
    description: 'Notify patient their prescription is ready',
    message: `Hi {patient_name}! Your prescription is ready for pickup. Please visit us during office hours.`,
    variables: ['patient_name']
  },
  
  // Office Hours
  office_hours: {
    name: 'Office Hours',
    description: 'Information about office hours',
    message: `Our office hours are Monday-Friday 9AM-5PM. For emergencies, please call 911 or go to your nearest emergency room.`,
    variables: []
  },
  
  // Thank You
  thank_you: {
    name: 'Thank You',
    description: 'Thank patient after their visit',
    message: `Thank you for visiting us, {patient_name}! If you have any questions or concerns, please don't hesitate to reach out.`,
    variables: ['patient_name']
  },
  
  // Lab Results Ready
  lab_results: {
    name: 'Lab Results Ready',
    description: 'Notify patient lab results are available',
    message: `Hi {patient_name}! Your lab results are now available. Please log into your patient portal to view them or call us to discuss.`,
    variables: ['patient_name']
  },
  
  // Insurance Reminder
  insurance_reminder: {
    name: 'Insurance Reminder',
    description: 'Remind patient to bring insurance info',
    message: `Hi {patient_name}! Reminder: Please bring your insurance card and photo ID to your appointment on {appointment_date}. Thank you!`,
    variables: ['patient_name', 'appointment_date']
  },
  
  // Pre-Visit Instructions
  pre_visit: {
    name: 'Pre-Visit Instructions',
    description: 'Send pre-appointment instructions',
    message: `Hi {patient_name}! For your appointment on {appointment_date}: {instructions}. Please call us if you have questions.`,
    variables: ['patient_name', 'appointment_date', 'instructions']
  },
  
  // Custom Message
  custom: {
    name: 'Custom Message',
    description: 'Send any custom message',
    message: `{custom_message}`,
    variables: ['custom_message']
  }
};

// ============================================
// TEMPLATE FUNCTIONS
// ============================================

/**
 * Get a specific template by key
 * 
 * @param {string} templateKey - The template identifier
 * @returns {Object|null} Template object or null if not found
 */
function getTemplate(templateKey) {
  return MESSAGE_TEMPLATES[templateKey] || null;
}

/**
 * Get all templates
 * 
 * @returns {Object} All message templates
 */
function getAllTemplates() {
  return MESSAGE_TEMPLATES;
}

/**
 * Get template names for display
 * 
 * @returns {Array} Array of {key, name, description} objects
 */
function getTemplateList() {
  const list = [];
  
  for (const [key, template] of Object.entries(MESSAGE_TEMPLATES)) {
    list.push({
      key: key,
      name: template.name,
      description: template.description
    });
  }
  
  return list;
}

/**
 * Fill in a template with variables
 * 
 * @param {string} templateKey - The template identifier
 * @param {Object} variables - Key-value pairs for template variables
 * @returns {string|null} Filled message or null if template not found
 */
function fillTemplate(templateKey, variables) {
  const template = getTemplate(templateKey);
  
  if (!template) {
    return null;
  }
  
  let message = template.message;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    message = message.split(placeholder).join(value || '');
  }
  
  return message;
}

/**
 * Validate that all required variables are provided
 * 
 * @param {string} templateKey - The template identifier
 * @param {Object} variables - Provided variables
 * @returns {Object} {valid: boolean, missing: array}
 */
function validateTemplateVariables(templateKey, variables) {
  const template = getTemplate(templateKey);
  
  if (!template) {
    return { valid: false, missing: ['Template not found'] };
  }
  
  const missing = [];
  
  for (const required of template.variables) {
    if (!variables[required]) {
      missing.push(required);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing: missing
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format template info for display
 * 
 * @param {string} templateKey - The template identifier
 * @returns {string} Formatted template information
 */
function formatTemplateInfo(templateKey) {
  const template = getTemplate(templateKey);
  
  if (!template) {
    return 'Template not found: ' + templateKey;
  }
  
  let info = `*${template.name}*\n`;
  info += `${template.description}\n\n`;
  info += `Message:\n${template.message}\n\n`;
  
  if (template.variables.length > 0) {
    info += `Variables: ${template.variables.join(', ')}`;
  }
  
  return info;
}

/**
 * List all templates in a formatted string
 * 
 * @returns {string} Formatted list of all templates
 */
function listAllTemplates() {
  let output = '=== Available Message Templates ===\n\n';
  
  for (const [key, template] of Object.entries(MESSAGE_TEMPLATES)) {
    output += `[${key}] ${template.name}\n`;
    output += `  ${template.description}\n`;
    output += `  Preview: ${template.message.substring(0, 60)}...\n\n`;
  }
  
  return output;
}

// ============================================
// TEST FUNCTION
// ============================================

/**
 * Test template functions
 */
function testTemplates() {
  // Test getTemplate
  const kidney = getTemplate('kidney_video');
  Logger.log('Kidney template:', kidney.name);
  
  // Test fillTemplate
  const filled = fillTemplate('kidney_video', {
    first_name: 'John',
    practice_name: 'Test Clinic'
  });
  Logger.log('Filled message:', filled);
  
  // Test validation
  const validation = validateTemplateVariables('appointment_reminder', {
    patient_name: 'Jane'
    // missing appointment_date and appointment_time
  });
  Logger.log('Validation:', validation);
  
  // List all templates
  Logger.log(listAllTemplates());
}
