/**
 * GoTo SMS Texting Tool - Google Chat Bot
 * 
 * ChatBot.gs - Google Chat event handlers and slash commands
 * 
 * This file handles all Google Chat interactions including:
 * - Slash commands
 * - Card interactions
 * - Dialog forms
 */

// ============================================
// MAIN CHAT EVENT HANDLER
// ============================================

/**
 * Main entry point for Google Chat events
 * 
 * @param {Object} event - The event object from Google Chat
 * @returns {Object} Response card or message
 */
function onMessage(event) {
  const message = event.message;
  
  // Handle slash commands
  if (message.slashCommand) {
    return handleSlashCommand(event);
  }
  
  // Handle regular messages (show help)
  return createHelpCard();
}

/**
 * Handle card button clicks and form submissions
 * 
 * @param {Object} event - The event object from Google Chat
 * @returns {Object} Response card or action
 */
function onCardClick(event) {
  const action = event.action;
  const actionName = action.actionMethodName;
  const parameters = action.parameters || [];
  
  // Convert parameters array to object
  const params = {};
  parameters.forEach(p => params[p.key] = p.value);
  
  switch (actionName) {
    case 'openKidneyVideoDialog':
      return openKidneyVideoDialog();
    case 'openReminderDialog':
      return openReminderDialog();
    case 'openConfirmDialog':
      return openConfirmDialog();
    case 'openFollowUpDialog':
      return openFollowUpDialog();
    case 'openPrescriptionDialog':
      return openPrescriptionDialog();
    case 'openThankYouDialog':
      return openThankYouDialog();
    case 'openCustomDialog':
      return openCustomDialog();
    case 'submitKidneyVideo':
      return submitKidneyVideo(event);
    case 'submitReminder':
      return submitReminder(event);
    case 'submitConfirm':
      return submitConfirm(event);
    case 'submitFollowUp':
      return submitFollowUp(event);
    case 'submitPrescription':
      return submitPrescription(event);
    case 'submitThankYou':
      return submitThankYou(event);
    case 'submitCustom':
      return submitCustom(event);
    default:
      return createTextResponse('Unknown action: ' + actionName);
  }
}

// ============================================
// SLASH COMMAND HANDLER
// ============================================

/**
 * Handle slash commands
 * 
 * @param {Object} event - The event object
 * @returns {Object} Response
 */
function handleSlashCommand(event) {
  const commandId = event.message.slashCommand.commandId;
  
  switch (commandId.toString()) {
    case '1': // /send-video
      return openKidneyVideoDialog();
    case '2': // /reminder
      return openReminderDialog();
    case '3': // /confirm
      return openConfirmDialog();
    case '4': // /followup
      return openFollowUpDialog();
    case '5': // /prescription
      return openPrescriptionDialog();
    case '6': // /thankyou
      return openThankYouDialog();
    case '7': // /custom
      return openCustomDialog();
    case '8': // /templates
      return createTemplatesCard();
    case '9': // /help
      return createHelpCard();
    default:
      return createHelpCard();
  }
}

// ============================================
// DIALOG OPENERS
// ============================================

/**
 * Open kidney video form dialog
 */
function openKidneyVideoDialog() {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: createKidneyVideoForm()
        }
      }
    }
  };
}

/**
 * Open appointment reminder form dialog
 */
function openReminderDialog() {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: createReminderForm()
        }
      }
    }
  };
}

/**
 * Open appointment confirmation form dialog
 */
function openConfirmDialog() {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: createConfirmForm()
        }
      }
    }
  };
}

/**
 * Open follow-up form dialog
 */
function openFollowUpDialog() {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: createSimplePatientForm('Send Follow-Up Message', 'submitFollowUp')
        }
      }
    }
  };
}

/**
 * Open prescription ready form dialog
 */
function openPrescriptionDialog() {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: createSimplePatientForm('Send Prescription Ready', 'submitPrescription')
        }
      }
    }
  };
}

/**
 * Open thank you form dialog
 */
function openThankYouDialog() {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: createSimplePatientForm('Send Thank You Message', 'submitThankYou')
        }
      }
    }
  };
}

/**
 * Open custom message form dialog
 */
function openCustomDialog() {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: createCustomMessageForm()
        }
      }
    }
  };
}

// ============================================
// FORM BUILDERS
// ============================================

/**
 * Create kidney video form
 */
function createKidneyVideoForm() {
  return {
    sections: [
      {
        header: 'Send Kidney Treatment Video',
        widgets: [
          {
            decoratedText: {
              text: 'Send the kidney treatment options video to a patient',
              wrapText: true
            }
          },
          {
            textInput: {
              name: 'firstName',
              label: 'First Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'lastName',
              label: 'Last Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'phone',
              label: 'Phone Number',
              hintText: 'E.g., +15145550199 or (514) 555-0199',
              type: 'SINGLE_LINE'
            }
          },
          {
            buttonList: {
              buttons: [
                {
                  text: 'Send Video Link',
                  onClick: {
                    action: {
                      function: 'submitKidneyVideo'
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

/**
 * Create appointment reminder form
 */
function createReminderForm() {
  return {
    sections: [
      {
        header: 'Send Appointment Reminder',
        widgets: [
          {
            textInput: {
              name: 'firstName',
              label: 'First Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'lastName',
              label: 'Last Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'phone',
              label: 'Phone Number',
              hintText: 'E.g., +15145550199',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'date',
              label: 'Appointment Date',
              hintText: 'E.g., December 15, 2024',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'time',
              label: 'Appointment Time',
              hintText: 'E.g., 2:30 PM',
              type: 'SINGLE_LINE'
            }
          },
          {
            buttonList: {
              buttons: [
                {
                  text: 'Send Reminder',
                  onClick: {
                    action: {
                      function: 'submitReminder'
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

/**
 * Create appointment confirmation form
 */
function createConfirmForm() {
  return {
    sections: [
      {
        header: 'Send Appointment Confirmation',
        widgets: [
          {
            textInput: {
              name: 'firstName',
              label: 'First Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'lastName',
              label: 'Last Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'phone',
              label: 'Phone Number',
              hintText: 'E.g., +15145550199',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'date',
              label: 'Appointment Date',
              hintText: 'E.g., December 15, 2024',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'time',
              label: 'Appointment Time',
              hintText: 'E.g., 2:30 PM',
              type: 'SINGLE_LINE'
            }
          },
          {
            buttonList: {
              buttons: [
                {
                  text: 'Send Confirmation',
                  onClick: {
                    action: {
                      function: 'submitConfirm'
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

/**
 * Create simple patient form (for follow-up, prescription, thank you)
 */
function createSimplePatientForm(title, submitFunction) {
  return {
    sections: [
      {
        header: title,
        widgets: [
          {
            textInput: {
              name: 'firstName',
              label: 'First Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'lastName',
              label: 'Last Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'phone',
              label: 'Phone Number',
              hintText: 'E.g., +15145550199',
              type: 'SINGLE_LINE'
            }
          },
          {
            buttonList: {
              buttons: [
                {
                  text: 'Send Message',
                  onClick: {
                    action: {
                      function: submitFunction
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

/**
 * Create custom message form
 */
function createCustomMessageForm() {
  return {
    sections: [
      {
        header: 'Send Custom Message',
        widgets: [
          {
            textInput: {
              name: 'firstName',
              label: 'First Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'lastName',
              label: 'Last Name',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'phone',
              label: 'Phone Number',
              hintText: 'E.g., +15145550199',
              type: 'SINGLE_LINE'
            }
          },
          {
            textInput: {
              name: 'message',
              label: 'Message',
              type: 'MULTIPLE_LINE'
            }
          },
          {
            buttonList: {
              buttons: [
                {
                  text: 'Send Message',
                  onClick: {
                    action: {
                      function: 'submitCustom'
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

// ============================================
// FORM SUBMISSION HANDLERS
// ============================================

/**
 * Get form inputs from event
 */
function getFormInputs(event) {
  const formInputs = event.common.formInputs || {};
  const inputs = {};
  
  for (const key in formInputs) {
    const input = formInputs[key];
    if (input.stringInputs && input.stringInputs.value) {
      inputs[key] = input.stringInputs.value[0];
    }
  }
  
  return inputs;
}

/**
 * Submit kidney video form
 */
function submitKidneyVideo(event) {
  const inputs = getFormInputs(event);
  
  if (!inputs.firstName || !inputs.lastName || !inputs.phone) {
    return createErrorDialog('Please fill in all fields.');
  }
  
  const result = sendKidneyVideo(inputs.firstName, inputs.lastName, inputs.phone);
  
  if (result.success) {
    return createSuccessDialog(
      `Kidney video link sent to ${inputs.firstName} ${inputs.lastName}!`,
      result.messageId
    );
  } else {
    return createErrorDialog('Failed to send: ' + result.error);
  }
}

/**
 * Submit reminder form
 */
function submitReminder(event) {
  const inputs = getFormInputs(event);
  
  if (!inputs.firstName || !inputs.lastName || !inputs.phone || !inputs.date || !inputs.time) {
    return createErrorDialog('Please fill in all fields.');
  }
  
  const result = sendAppointmentReminder(
    inputs.firstName, 
    inputs.lastName, 
    inputs.phone, 
    inputs.date, 
    inputs.time
  );
  
  if (result.success) {
    return createSuccessDialog(
      `Appointment reminder sent to ${inputs.firstName} ${inputs.lastName}!`,
      result.messageId
    );
  } else {
    return createErrorDialog('Failed to send: ' + result.error);
  }
}

/**
 * Submit confirm form
 */
function submitConfirm(event) {
  const inputs = getFormInputs(event);
  
  if (!inputs.firstName || !inputs.lastName || !inputs.phone || !inputs.date || !inputs.time) {
    return createErrorDialog('Please fill in all fields.');
  }
  
  const result = sendAppointmentConfirmation(
    inputs.firstName, 
    inputs.lastName, 
    inputs.phone, 
    inputs.date, 
    inputs.time
  );
  
  if (result.success) {
    return createSuccessDialog(
      `Appointment confirmation sent to ${inputs.firstName} ${inputs.lastName}!`,
      result.messageId
    );
  } else {
    return createErrorDialog('Failed to send: ' + result.error);
  }
}

/**
 * Submit follow-up form
 */
function submitFollowUp(event) {
  const inputs = getFormInputs(event);
  
  if (!inputs.firstName || !inputs.lastName || !inputs.phone) {
    return createErrorDialog('Please fill in all fields.');
  }
  
  const result = sendFollowUp(inputs.firstName, inputs.lastName, inputs.phone);
  
  if (result.success) {
    return createSuccessDialog(
      `Follow-up message sent to ${inputs.firstName} ${inputs.lastName}!`,
      result.messageId
    );
  } else {
    return createErrorDialog('Failed to send: ' + result.error);
  }
}

/**
 * Submit prescription form
 */
function submitPrescription(event) {
  const inputs = getFormInputs(event);
  
  if (!inputs.firstName || !inputs.lastName || !inputs.phone) {
    return createErrorDialog('Please fill in all fields.');
  }
  
  const result = sendPrescriptionReady(inputs.firstName, inputs.lastName, inputs.phone);
  
  if (result.success) {
    return createSuccessDialog(
      `Prescription ready notification sent to ${inputs.firstName} ${inputs.lastName}!`,
      result.messageId
    );
  } else {
    return createErrorDialog('Failed to send: ' + result.error);
  }
}

/**
 * Submit thank you form
 */
function submitThankYou(event) {
  const inputs = getFormInputs(event);
  
  if (!inputs.firstName || !inputs.lastName || !inputs.phone) {
    return createErrorDialog('Please fill in all fields.');
  }
  
  const result = sendThankYou(inputs.firstName, inputs.lastName, inputs.phone);
  
  if (result.success) {
    return createSuccessDialog(
      `Thank you message sent to ${inputs.firstName} ${inputs.lastName}!`,
      result.messageId
    );
  } else {
    return createErrorDialog('Failed to send: ' + result.error);
  }
}

/**
 * Submit custom message form
 */
function submitCustom(event) {
  const inputs = getFormInputs(event);
  
  if (!inputs.firstName || !inputs.lastName || !inputs.phone || !inputs.message) {
    return createErrorDialog('Please fill in all fields.');
  }
  
  const result = sendCustomMessage(
    inputs.firstName, 
    inputs.lastName, 
    inputs.phone, 
    inputs.message
  );
  
  if (result.success) {
    return createSuccessDialog(
      `Custom message sent to ${inputs.firstName} ${inputs.lastName}!`,
      result.messageId
    );
  } else {
    return createErrorDialog('Failed to send: ' + result.error);
  }
}

// ============================================
// RESPONSE CARD BUILDERS
// ============================================

/**
 * Create success dialog response
 */
function createSuccessDialog(message, messageId) {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: {
            sections: [
              {
                widgets: [
                  {
                    decoratedText: {
                      topLabel: 'SUCCESS',
                      text: message,
                      startIcon: {
                        knownIcon: 'CONFIRMATION_NUMBER_ICON'
                      }
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: 'Message ID',
                      text: messageId || 'N/A'
                    }
                  }
                ]
              }
            ]
          }
        }
      }
    }
  };
}

/**
 * Create error dialog response
 */
function createErrorDialog(errorMessage) {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: {
            sections: [
              {
                widgets: [
                  {
                    decoratedText: {
                      topLabel: 'ERROR',
                      text: errorMessage,
                      startIcon: {
                        knownIcon: 'DESCRIPTION'
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      }
    }
  };
}

/**
 * Create help card
 */
function createHelpCard() {
  return {
    cardsV2: [
      {
        cardId: 'helpCard',
        card: {
          header: {
            title: 'GoTo SMS Bot',
            subtitle: 'Send text messages to patients',
            imageUrl: 'https://www.gstatic.com/images/branding/product/2x/chat_48dp.png'
          },
          sections: [
            {
              header: 'Available Commands',
              widgets: [
                { decoratedText: { text: '/send-video - Send kidney treatment video' } },
                { decoratedText: { text: '/reminder - Send appointment reminder' } },
                { decoratedText: { text: '/confirm - Send appointment confirmation' } },
                { decoratedText: { text: '/followup - Send follow-up message' } },
                { decoratedText: { text: '/prescription - Prescription ready notification' } },
                { decoratedText: { text: '/thankyou - Send thank you message' } },
                { decoratedText: { text: '/custom - Send custom message' } },
                { decoratedText: { text: '/templates - View all message templates' } },
                { decoratedText: { text: '/help - Show this help message' } }
              ]
            },
            {
              header: 'Quick Actions',
              widgets: [
                {
                  buttonList: {
                    buttons: [
                      {
                        text: 'Send Kidney Video',
                        onClick: { action: { function: 'openKidneyVideoDialog' } }
                      },
                      {
                        text: 'Send Reminder',
                        onClick: { action: { function: 'openReminderDialog' } }
                      },
                      {
                        text: 'Custom Message',
                        onClick: { action: { function: 'openCustomDialog' } }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  };
}

/**
 * Create templates card
 */
function createTemplatesCard() {
  const templates = getAllTemplates();
  const widgets = [];
  
  for (const [key, template] of Object.entries(templates)) {
    widgets.push({
      decoratedText: {
        topLabel: template.name,
        text: template.message.substring(0, 100) + '...',
        wrapText: true
      }
    });
  }
  
  return {
    cardsV2: [
      {
        cardId: 'templatesCard',
        card: {
          header: {
            title: 'Message Templates',
            subtitle: 'Available pre-written messages'
          },
          sections: [
            {
              widgets: widgets
            }
          ]
        }
      }
    ]
  };
}

/**
 * Create simple text response
 */
function createTextResponse(text) {
  return { text: text };
}
