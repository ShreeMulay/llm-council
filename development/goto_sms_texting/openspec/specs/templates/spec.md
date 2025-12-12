# Message Templates Specification

## Purpose

Define a system of pre-approved message templates for patient communication. Templates ensure consistency, enable compliance review, and simplify staff workflows.

## Requirements

### Requirement: Template Registry
The system SHALL maintain a registry of message templates with metadata.

#### Scenario: List all templates
- WHEN a user requests the template list
- THEN all available templates are returned with:
  - Template key (identifier)
  - Display name
  - Description
  - Required variables

#### Scenario: Get specific template
- GIVEN a valid template key
- WHEN the template is requested
- THEN the template content and metadata are returned

#### Scenario: Unknown template key
- GIVEN an invalid template key
- WHEN the template is requested
- THEN an error listing available templates is returned

### Requirement: Variable Substitution
The system SHALL support variable placeholders in templates using `{variable_name}` syntax.

#### Scenario: All variables provided
- GIVEN a template with placeholders `{first_name}` and `{date}`
- AND values first_name="John" and date="December 15"
- WHEN the template is rendered
- THEN all placeholders are replaced with provided values

#### Scenario: Missing required variable
- GIVEN a template requiring `{patient_name}`
- AND no patient_name value provided
- WHEN rendering is attempted
- THEN an error is returned listing missing variables
- AND no message is sent

#### Scenario: Extra variables provided
- GIVEN a template requiring only `{patient_name}`
- AND values patient_name="Jane" and extra="ignored"
- WHEN the template is rendered
- THEN the template renders successfully
- AND extra variables are ignored

### Requirement: Healthcare Communication Templates
The system SHALL include templates for common healthcare communications.

## Template Registry

### Template: Kidney Treatment Video
**Key:** `kidney_treatment_video`
**Purpose:** Share educational video about kidney disease treatment options
**Variables:** `first_name`, `practice_name`

```
Hi {first_name}! This is {practice_name}. As we discussed your kidney health, 
we'd like to share an important video that explains kidney disease and the 
treatment options available to you:

https://www.youtube.com/watch?v=mi34xCfmLhw

This video covers dialysis, transplant, and other care options. Please watch 
before your next visit - we're here to answer any questions!
```

### Template: Appointment Reminder
**Key:** `appointment_reminder`
**Purpose:** Remind patient of upcoming appointment
**Variables:** `patient_name`, `appointment_date`, `appointment_time`

```
Hi {patient_name}! This is a reminder about your appointment on {appointment_date} 
at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule.
```

### Template: Appointment Confirmation
**Key:** `appointment_confirmation`
**Purpose:** Confirm a scheduled appointment
**Variables:** `patient_name`, `appointment_date`, `appointment_time`

```
Hi {patient_name}! Your appointment has been confirmed for {appointment_date} 
at {appointment_time}. We look forward to seeing you!
```

### Template: Follow-up Message
**Key:** `follow_up`
**Purpose:** Remind patient to schedule follow-up care
**Variables:** `patient_name`

```
Hi {patient_name}! We hope you're doing well. It's time for your follow-up 
appointment. Please call us or reply to schedule.
```

### Template: Prescription Ready
**Key:** `prescription_ready`
**Purpose:** Notify patient prescription is available
**Variables:** `patient_name`

```
Hi {patient_name}! Your prescription is ready for pickup. Please visit us 
during office hours.
```

### Template: Thank You
**Key:** `thank_you`
**Purpose:** Thank patient after visit
**Variables:** `patient_name`

```
Thank you for visiting us, {patient_name}! If you have any questions or 
concerns, please don't hesitate to reach out.
```

### Template: Office Hours
**Key:** `office_hours`
**Purpose:** Provide office hours information
**Variables:** (none)

```
Our office hours are Monday-Friday 9AM-5PM. For emergencies, please call 911 
or go to your nearest emergency room.
```

### Template: Lab Results Ready
**Key:** `lab_results_ready`
**Purpose:** Notify patient lab results are available
**Variables:** `patient_name`

```
Hi {patient_name}! Your lab results are now available. Please log into your 
patient portal to view them or call us to discuss.
```

### Template: Telehealth Link
**Key:** `telehealth_link`
**Purpose:** Send video visit link before appointment
**Variables:** `patient_name`, `appointment_time`, `telehealth_url`

```
Hi {patient_name}! Your telehealth appointment is at {appointment_time}. 
Join here: {telehealth_url}

Please join 5 minutes early to test your connection.
```

### Template: Insurance Update Request
**Key:** `insurance_update`
**Purpose:** Request updated insurance information
**Variables:** `patient_name`

```
Hi {patient_name}! We need to update your insurance information on file. 
Please bring your current insurance card to your next visit or call us 
to update over the phone.
```

### Template: Wellness Checkup Reminder
**Key:** `wellness_checkup`
**Purpose:** Annual preventive care reminder
**Variables:** `patient_name`

```
Hi {patient_name}! It's time for your annual wellness checkup. Preventive 
care is important for your health. Please call us to schedule your appointment.
```

### Template: Medication Refill Reminder
**Key:** `medication_refill`
**Purpose:** Remind patient to refill ongoing prescription
**Variables:** `patient_name`, `medication_name`

```
Hi {patient_name}! This is a reminder to refill your {medication_name} 
prescription. Please contact your pharmacy or call us if you need assistance.
```

### Template: Custom Message
**Key:** `custom`
**Purpose:** Send any custom message
**Variables:** `custom_message`

```
{custom_message}
```

## Implementation Notes

### Adding New Templates
When adding a new template:
1. Add to `config.py` MESSAGE_TEMPLATES dict
2. Add to `google_chat_bot/Templates.gs` MESSAGE_TEMPLATES object
3. Update this specification
4. Create helper method in `goto_sms.py` if frequently used
5. Add CLI command in `send_text.py` if needed
6. Add Chat Bot slash command if needed

### Template Review Process
All templates SHOULD be reviewed for:
- HIPAA compliance (no unnecessary PHI)
- Clear, professional language
- Appropriate for SMS (160 char consideration)
- Opt-out instructions where required by regulation
