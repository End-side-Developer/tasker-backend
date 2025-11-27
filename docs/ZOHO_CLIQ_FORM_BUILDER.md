# Zoho Cliq Form Builder - Correct Pattern

> **IMPORTANT:** Always use `map()` and `list()` (lowercase) - NOT `Map()` and `List()`
> This is the correct pattern that works in Zoho Cliq Deluge scripts.

---

## Basic Form Structure

```deluge
response = map();
response.put("type", "form");
response.put("title", "Form Title");
response.put("name", "form_name");
response.put("hint", "Form description");
response.put("button_label", "Submit");

inputsList = list();
// ... add inputs ...
response.put("inputs", inputsList);

action = map();
action.put("type", "invoke.function");
action.put("name", "submitFunctionName");
response.put("action", action);

return response;
```

---

## Input Types Reference

### 1. Text Input

```deluge
input = map();
input.put("label", "Name");
input.put("name", "text_field");
input.put("placeholder", "Enter your name");
input.put("min_length", "0");
input.put("max_length", "100");
input.put("mandatory", false);
input.put("type", "text");
inputsList.add(input);
```

### 2. Number Input

```deluge
input = map();
input.put("label", "Age");
input.put("name", "number_field");
input.put("placeholder", "Enter your age");
input.put("min", "0");
input.put("max", "100");
input.put("mandatory", false);
input.put("type", "number");
inputsList.add(input);
```

### 3. Email Input

```deluge
input = map();
input.put("label", "Email");
input.put("name", "email_field");
input.put("placeholder", "user@example.com");
input.put("mandatory", false);
input.put("type", "text");
input.put("format", "email");
inputsList.add(input);
```

### 4. URL Input

```deluge
input = map();
input.put("label", "Website");
input.put("name", "url_field");
input.put("placeholder", "https://example.com");
input.put("mandatory", false);
input.put("type", "text");
input.put("format", "url");
inputsList.add(input);
```

### 5. Password Input

```deluge
input = map();
input.put("label", "Password");
input.put("name", "password_field");
input.put("placeholder", "Enter password");
input.put("min_length", "6");
input.put("max_length", "50");
input.put("mandatory", true);
input.put("type", "text");
input.put("format", "password");
inputsList.add(input);
```

### 6. Textarea

```deluge
input = map();
input.put("label", "Description");
input.put("name", "textarea_field");
input.put("placeholder", "Enter description...");
input.put("min_length", "0");
input.put("max_length", "500");
input.put("mandatory", false);
input.put("type", "textarea");
inputsList.add(input);
```

### 7. Phone Number

```deluge
input = map();
input.put("label", "Phone Number");
input.put("name", "phone_field");
input.put("placeholder", "Enter your mobile number");
input.put("mandatory", false);
input.put("type", "phone_number");
inputsList.add(input);
```

### 8. Hidden Field

```deluge
input = map();
input.put("name", "hidden_field");
input.put("value", "hidden_value");
input.put("type", "hidden");
inputsList.add(input);
```

### 9. Toggle (On/Off Switch)

```deluge
input = map();
input.put("label", "Enable Feature");
input.put("name", "toggle_field");
input.put("value", false);
input.put("type", "toggle");
inputsList.add(input);
```

### 10. Checkbox (Single)

```deluge
input = map();
input.put("label", "I agree to terms");
input.put("name", "checkbox_field");
input.put("value", false);
input.put("type", "checkbox");
inputsList.add(input);
```

### 11. Checkbox (Multiple Options)

```deluge
input = map();
input.put("label", "Select activities");
input.put("name", "checkbox_multi");
input.put("mandatory", false);
input.put("type", "checkbox");

optionsList = list();

opt1 = map();
opt1.put("value", "swimming");
opt1.put("label", "Swimming");
optionsList.add(opt1);

opt2 = map();
opt2.put("value", "running");
opt2.put("label", "Running");
optionsList.add(opt2);

input.put("options", optionsList);
inputsList.add(input);
```

### 12. Radio Buttons

```deluge
input = map();
input.put("label", "Select distance");
input.put("name", "radio_field");
input.put("mandatory", false);
input.put("type", "radio");

optionsList = list();

opt1 = map();
opt1.put("value", "5km");
opt1.put("label", "5 Kilometers");
optionsList.add(opt1);

opt2 = map();
opt2.put("value", "10km");
opt2.put("label", "10 Kilometers");
optionsList.add(opt2);

input.put("options", optionsList);
inputsList.add(input);
```

### 13. Select Dropdown

```deluge
input = map();
input.put("label", "Select priority");
input.put("name", "select_field");
input.put("placeholder", "Choose priority");
input.put("multiple", false);
input.put("mandatory", false);
input.put("type", "select");

optionsList = list();

opt1 = map();
opt1.put("value", "high");
opt1.put("label", "High Priority");
optionsList.add(opt1);

opt2 = map();
opt2.put("value", "medium");
opt2.put("label", "Medium Priority");
optionsList.add(opt2);

opt3 = map();
opt3.put("value", "low");
opt3.put("label", "Low Priority");
optionsList.add(opt3);

input.put("options", optionsList);
inputsList.add(input);
```

### 14. Dynamic Select (Searchable)

```deluge
input = map();
input.put("label", "Search items");
input.put("name", "dynamic_select_field");
input.put("placeholder", "Type to search...");
input.put("multiple", false);
input.put("mandatory", false);
input.put("type", "dynamic_select");

optionsList = list();

opt1 = map();
opt1.put("value", "item1");
opt1.put("label", "Item 1");
optionsList.add(opt1);

opt2 = map();
opt2.put("value", "item2");
opt2.put("label", "Item 2");
optionsList.add(opt2);

input.put("options", optionsList);
inputsList.add(input);
```

### 15. Date Picker

```deluge
input = map();
input.put("label", "Select Date");
input.put("name", "date_field");
input.put("placeholder", "Choose a date");
input.put("mandatory", false);
input.put("type", "date");
inputsList.add(input);
```

### 16. DateTime Picker

```deluge
input = map();
input.put("label", "Select Date & Time");
input.put("name", "datetime_field");
input.put("placeholder", "Choose date and time");
input.put("mandatory", false);
input.put("type", "datetime");
inputsList.add(input);
```

### 17. File Upload

```deluge
input = map();
input.put("label", "Upload File");
input.put("name", "file_field");
input.put("placeholder", "Choose a file");
input.put("mandatory", false);
input.put("type", "file");
inputsList.add(input);
```

### 18. Location Picker

```deluge
input = map();
input.put("label", "Select Location");
input.put("name", "location_field");
input.put("placeholder", "Enter location");
input.put("mandatory", false);
input.put("type", "location");
inputsList.add(input);
```

### 19. Native Select - Users (Contacts)

```deluge
input = map();
input.put("label", "Select User");
input.put("name", "user_field");
input.put("placeholder", "Choose a user");
input.put("multiple", false);
input.put("mandatory", false);
input.put("type", "native_select");
input.put("data_source", "contacts");
inputsList.add(input);
```

### 20. Native Select - Teams

```deluge
input = map();
input.put("label", "Select Team");
input.put("name", "team_field");
input.put("placeholder", "Choose a team");
input.put("multiple", false);
input.put("mandatory", false);
input.put("type", "native_select");
input.put("data_source", "teams");
inputsList.add(input);
```

### 21. Native Select - Channels

```deluge
input = map();
input.put("label", "Select Channel");
input.put("name", "channel_field");
input.put("placeholder", "Choose a channel");
input.put("multiple", false);
input.put("mandatory", false);
input.put("type", "native_select");
input.put("data_source", "channels");
inputsList.add(input);
```

### 22. Native Select - Conversations

```deluge
input = map();
input.put("label", "Select Conversation");
input.put("name", "conversation_field");
input.put("placeholder", "Choose a conversation");
input.put("multiple", false);
input.put("mandatory", false);
input.put("type", "native_select");
input.put("data_source", "conversations");
inputsList.add(input);
```

### 23. Catalogue (Rich Options with Images)

```deluge
input = map();
input.put("label", "Select Product");
input.put("name", "catalogue_field");
input.put("mandatory", false);
input.put("type", "catalogue");

optionsList = list();

opt1 = map();
opt1.put("value", "product1");
opt1.put("label", "Product One");
opt1.put("description", "This is product one description");
opt1.put("thumbnail", "https://example.com/image.png");

// Optional counter
counter = map();
counter.put("min", "0");
counter.put("max", "100");
counter.put("value", "1");
counter.put("step_value", "1");
opt1.put("counter", counter);

optionsList.add(opt1);

input.put("options", optionsList);
inputsList.add(input);
```

---

## Complete Form Example

```deluge
// Create form response
response = map();
response.put("type", "form");
response.put("title", "Create Task");
response.put("name", "create_task_form");
response.put("hint", "Fill in the task details");
response.put("button_label", "Create Task");

// Create inputs list
inputsList = list();

// Task Title (text)
input1 = map();
input1.put("label", "Task Title");
input1.put("name", "title");
input1.put("placeholder", "Enter task title");
input1.put("mandatory", true);
input1.put("type", "text");
inputsList.add(input1);

// Description (textarea)
input2 = map();
input2.put("label", "Description");
input2.put("name", "description");
input2.put("placeholder", "Enter task description");
input2.put("mandatory", false);
input2.put("type", "textarea");
inputsList.add(input2);

// Priority (select)
input3 = map();
input3.put("label", "Priority");
input3.put("name", "priority");
input3.put("mandatory", true);
input3.put("type", "select");

priorityOptions = list();

highOpt = map();
highOpt.put("value", "high");
highOpt.put("label", "High");
priorityOptions.add(highOpt);

medOpt = map();
medOpt.put("value", "medium");
medOpt.put("label", "Medium");
priorityOptions.add(medOpt);

lowOpt = map();
lowOpt.put("value", "low");
lowOpt.put("label", "Low");
priorityOptions.add(lowOpt);

input3.put("options", priorityOptions);
inputsList.add(input3);

// Due Date (date)
input4 = map();
input4.put("label", "Due Date");
input4.put("name", "due_date");
input4.put("mandatory", false);
input4.put("type", "date");
inputsList.add(input4);

// Assign To (native_select - contacts)
input5 = map();
input5.put("label", "Assign To");
input5.put("name", "assigned_to");
input5.put("placeholder", "Select user");
input5.put("multiple", false);
input5.put("mandatory", false);
input5.put("type", "native_select");
input5.put("data_source", "contacts");
inputsList.add(input5);

// Add inputs to response
response.put("inputs", inputsList);

// Add action
action = map();
action.put("type", "invoke.function");
action.put("name", "createTaskSubmit");
response.put("action", action);

return response;
```

---

## Extracting Form Values in Submit Handler

```deluge
// Get form values
formValues = form.get("values");

// Text field
title = formValues.get("title");
if(title != null)
{
    title = title.toString();
}

// Select field - returns object with label and value
priorityObj = formValues.get("priority");
priority = "";
if(priorityObj != null)
{
    priority = priorityObj.get("value");
}

// Native select (user) - returns user object
userObj = formValues.get("assigned_to");
userEmail = "";
userId = "";
if(userObj != null)
{
    userEmail = userObj.get("email");
    userId = userObj.get("id");
}

// Checkbox (single boolean)
isChecked = formValues.get("checkbox_field");
// Returns true or false

// Date field
dateValue = formValues.get("due_date");
if(dateValue != null)
{
    dateValue = dateValue.toString();
}
```

---

## Key Rules

1. **Use lowercase `map()` and `list()`** - NOT `Map()` and `List()`
2. **Always include `type: "form"`** at root level
3. **Always include `title`** - it's mandatory
4. **Always include `name`** - unique form identifier
5. **Always include `inputs`** - list of input fields
6. **Always include `action`** - what happens on submit
7. **Return the response map directly** - don't wrap it

---

## IMPORTANT: Form Actions vs Button Actions

There is a critical difference between actions in **Forms** and actions in **Buttons** (in messages).

### 1. Form Action Structure
Direct `name` property.

```deluge
action = map();
action.put("type", "invoke.function");
action.put("name", "submitFunctionName"); // Direct name
response.put("action", action);
```

### 2. Button Action Structure (in Commands/Messages)
Requires `data` wrapper.

```deluge
// Button definition
button = map();
button.put("label", "Click Me");

action = map();
action.put("type", "invoke.function");

// DATA WRAPPER IS REQUIRED FOR BUTTONS
data = map();
data.put("name", "targetFunctionName"); 
action.put("data", data);

button.put("action", action);
```

---

## Changelog

| Date | Change |
|------|--------|
| 2025-11-27 | Updated to use correct `map()`/`list()` pattern |
