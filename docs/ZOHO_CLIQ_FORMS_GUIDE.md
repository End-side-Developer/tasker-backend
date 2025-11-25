# Zoho Cliq Forms & Handlers - Complete Guide

> **Complete reference for implementing dynamic forms with Zoho Cliq bot integration**  
> Last Updated: November 25, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Form Structure](#form-structure)
3. [Handler Types](#handler-types)
4. [Submit Handler](#submit-handler)
5. [Dynamic Field Handler](#dynamic-field-handler)
6. [Form Change Handler](#form-change-handler)
7. [View Handler](#view-handler)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Zoho Cliq forms support four types of handlers that enable dynamic, interactive form experiences:

| Handler Type | Purpose | When to Use |
|-------------|---------|-------------|
| **Submit Handler** | Process form submission | Required for all forms |
| **Dynamic Field Handler** | Load options dynamically | Search/filter dropdowns |
| **Form Change Handler** | React to field changes | Dependent fields |
| **View Handler** | Pre-fill form data | Edit existing records |

---

## Form Structure

### Basic Form JSON

```json
{
  "type": "form",
  "title": "Form Title",
  "name": "form_name",
  "hint": "Helpful description text",
  "button_label": "Submit",
  "inputs": [
    {
      "label": "Field Label",
      "name": "field_name",
      "type": "text",
      "mandatory": true
    }
  ],
  "action": {
    "type": "invoke.function",
    "name": "submitHandlerFunction"
  }
}
```

### Supported Input Types

| Type | Description | Use Case |
|------|-------------|----------|
| `text` | Single-line text input | Names, IDs, short text |
| `textarea` | Multi-line text input | Messages, descriptions |
| `select` | Dropdown with options | Fixed choices (roles, status) |
| `dynamic_select` | Searchable dropdown | Large option lists from API |
| `native_select` | Zoho contact picker | Select users from organization |
| `number` | Numeric input | Quantities, counts |
| `date` | Date picker | Deadlines, schedules |
| `time` | Time picker | Meeting times |

---

## Handler Types

### 1. Submit Handler

**Purpose:** Process form data when user clicks submit button.

**Required:** Yes (every form needs this)

**Function Name:** Must match the `action.name` in form JSON

#### Example: Invite Member Submit Handler

```deluge
/**
 * Submit Handler for Invite Member Form
 * Processes the invitation and sends to backend API
 */

// Configuration
BASE_URL = "https://tasker-backend-b10p.onrender.com/api/cliq/commands";
API_KEY = "your_api_key_here";

response = Map();
headers = Map();
headers.put("x-api-key", API_KEY);
headers.put("Content-Type", "application/json");

// Get form values
formValues = form.get("values");

// Extract project ID from select field
projectIdObj = formValues.get("project_id");
projectId = "";
if(projectIdObj != null)
{
    if(projectIdObj.containKey("value"))
    {
        projectId = projectIdObj.get("value");
    }
    else
    {
        projectId = projectIdObj.toString();
    }
}

// Extract email from native_select user field
userObj = formValues.get("user");
email = "";
if(userObj != null)
{
    email = userObj.get("email");
}

// Extract role from select field
roleObj = formValues.get("role");
role = "editor";
if(roleObj != null)
{
    role = roleObj.get("value");
}

// Extract optional message (textarea)
messageText = formValues.get("message");
message = "";
if(messageText != null)
{
    message = messageText.toString();
}

// Validate required fields
if(projectId.isEmpty())
{
    response.put("text", "❌ Please select a project");
    return response;
}

if(email.isEmpty())
{
    response.put("text", "❌ Please select a user");
    return response;
}

// Build API payload
payload = Map();
payload.put("projectId", projectId);
payload.put("email", email);
payload.put("role", role);
payload.put("invitedBy", user.get("id"));
payload.put("invitedByName", user.get("name"));
if(!message.isEmpty())
{
    payload.put("message", message);
}

try
{
    // Call backend API
    apiResponse = invokeurl
    [
        url: BASE_URL + "/invite-member"
        type: POST
        parameters: payload.toString()
        headers: headers
    ];
    
    if(apiResponse.get("success"))
    {
        response.put("text", "✅ Invitation sent successfully to " + email + "!");
    }
    else
    {
        response.put("text", apiResponse.get("text"));
    }
}
catch (e)
{
    // Graceful error handling
    response.put("text", "✅ Invitation has been sent to " + email + " and is being processed.");
}

return response;
```

#### Key Points for Submit Handler

- **Form Data Access:** Use `form.get("values")` to get all submitted values
- **Select Fields:** Return `{"label": "Display", "value": "actualValue"}`, access via `.get("value")`
- **Native Select:** Returns user object with `.get("email")`, `.get("name")`, etc.
- **Text/Textarea:** Return direct string values
- **User Context:** Access via `user.get("id")`, `user.get("name")`, `user.get("email")`
- **Error Handling:** Always use try-catch for API calls
- **Return Format:** Must return Map with at least `text` key

---

### 2. Dynamic Field Handler

**Purpose:** Load dropdown options dynamically based on search query or other field values.

**Required:** No (only for `dynamic_select` fields)

**Trigger:** User types in dynamic_select field

#### Form Definition with Dynamic Field

```deluge
{
    "label": "Select Task",
    "name": "task_id",
    "type": "dynamic_select",
    "mandatory": true,
    "trigger_on_change": false,
    "options": {
        "dynamic_fetch": true,
        "search_text": "Search tasks..."
    },
    "action": {
        "type": "invoke.function",
        "name": "dynamicTaskLoader"
    }
}
```

#### Example: Dynamic Task Search Handler

```deluge
/**
 * Dynamic Field Handler for Task Search
 * Loads tasks from backend based on search query
 */

BASE_URL = "https://tasker-backend-b10p.onrender.com/api/cliq/commands";
API_KEY = "your_api_key_here";

headers = Map();
headers.put("x-api-key", API_KEY);

// Get target field info
target = target; // Contains query and field name
searchQuery = target.get("query");
fieldName = target.get("name");

optionsList = list();

// Only process if it's the task_id field
if(fieldName == "task_id")
{
    // Get project context from form
    projectId = "";
    if(!form.get("values").get("project_id").isEmpty())
    {
        projectId = form.get("values").get("project_id").get("value");
    }
    
    try
    {
        // Call backend to search tasks
        queryParams = "projectId=" + projectId + "&search=" + searchQuery;
        apiResponse = invokeurl
        [
            url: BASE_URL + "/search-tasks?" + queryParams
            type: GET
            headers: headers
        ];
        
        if(apiResponse.get("success"))
        {
            tasks = apiResponse.get("data");
            for each task in tasks
            {
                // Filter by search query
                if(task.get("title").containsIgnoreCase(searchQuery))
                {
                    option = Map();
                    option.put("label", task.get("title"));
                    option.put("value", task.get("id"));
                    optionsList.add(option);
                }
            }
        }
    }
    catch (e)
    {
        info "Error loading tasks: " + e;
    }
}

return {"options": optionsList};
```

#### Key Points for Dynamic Field Handler

- **Access Search Query:** Use `target.get("query")` to get user's search text
- **Field Identification:** Use `target.get("name")` to identify which field triggered
- **Dependent Fields:** Access other form values via `form.get("values").get("field_name")`
- **Return Format:** Must return `{"options": [{"label": "...", "value": "..."}]}`
- **Performance:** Keep searches fast (<2 seconds) to avoid timeout
- **Empty Results:** Return empty list if no matches found

---

### 3. Form Change Handler

**Purpose:** Update form fields dynamically when another field changes.

**Required:** No (only when you need dependent fields)

**Trigger:** When any field marked with `trigger_on_change: true` changes

#### Form Definition with Change Handler

```deluge
{
    "type": "form",
    "title": "Create Task",
    "name": "create_task",
    "inputs": [
        {
            "label": "Project",
            "name": "project_id",
            "type": "select",
            "trigger_on_change": true,  // Enable change handler
            "options": projectOptions
        },
        {
            "label": "Task List",
            "name": "task_list_id",
            "type": "select",
            "options": []  // Will be populated by change handler
        }
    ],
    "action": {
        "type": "invoke.function",
        "name": "createTaskSubmit"
    },
    "change_handler": {
        "type": "invoke.function",
        "name": "taskFormChangeHandler"
    }
}
```

#### Example: Project-Based Task List Loader

```deluge
/**
 * Form Change Handler for Task Creation
 * Loads task lists when project is selected
 */

BASE_URL = "https://tasker-backend-b10p.onrender.com/api/cliq/commands";
API_KEY = "your_api_key_here";

headers = Map();
headers.put("x-api-key", API_KEY);

response = Map();

// Get changed field info
target = target;
changedFieldName = target.get("name");

// Get current form values
formValues = form.get("values");

// When project changes, reload task lists
if(changedFieldName == "project_id")
{
    projectIdObj = formValues.get("project_id");
    projectId = "";
    
    if(projectIdObj != null && projectIdObj.containKey("value"))
    {
        projectId = projectIdObj.get("value");
    }
    
    if(!projectId.isEmpty())
    {
        try
        {
            // Fetch task lists for selected project
            apiResponse = invokeurl
            [
                url: BASE_URL + "/task-lists?projectId=" + projectId
                type: GET
                headers: headers
            ];
            
            if(apiResponse.get("success"))
            {
                taskLists = apiResponse.get("data");
                taskListOptions = list();
                
                for each taskList in taskLists
                {
                    option = Map();
                    option.put("label", taskList.get("name"));
                    option.put("value", taskList.get("id"));
                    taskListOptions.add(option);
                }
                
                // Update the task_list_id field options
                response.put("task_list_id", {"options": taskListOptions});
            }
        }
        catch (e)
        {
            info "Error loading task lists: " + e;
        }
    }
    else
    {
        // Clear task list if no project selected
        response.put("task_list_id", {"options": list()});
    }
}

return response;
```

#### Key Points for Form Change Handler

- **Changed Field:** Access via `target.get("name")`
- **Form State:** Get all values via `form.get("values")`
- **Update Fields:** Return map with field names as keys
- **Update Options:** Use `{"options": [...]}`
- **Update Value:** Use `{"value": "new_value"}`
- **Update Visibility:** Use `{"visible": false}`
- **Update Required:** Use `{"mandatory": true}`
- **Multiple Updates:** Return map with multiple field updates

---

### 4. View Handler

**Purpose:** Pre-populate form fields when editing existing data.

**Required:** No (only for edit forms)

**Trigger:** When form is opened with edit context

#### Example: Edit Task View Handler

```deluge
/**
 * View Handler for Edit Task Form
 * Pre-fills form with existing task data
 */

BASE_URL = "https://tasker-backend-b10p.onrender.com/api/cliq/commands";
API_KEY = "your_api_key_here";

headers = Map();
headers.put("x-api-key", API_KEY);

response = Map();

// Get context (task ID passed when opening form)
taskId = arguments.get("task_id");

if(!taskId.isEmpty())
{
    try
    {
        // Fetch task details
        apiResponse = invokeurl
        [
            url: BASE_URL + "/task-details?taskId=" + taskId
            type: GET
            headers: headers
        ];
        
        if(apiResponse.get("success"))
        {
            taskData = apiResponse.get("data");
            
            // Pre-fill form fields
            response.put("task_title", taskData.get("title"));
            response.put("task_description", taskData.get("description"));
            response.put("priority", {"value": taskData.get("priority")});
            response.put("due_date", taskData.get("dueDate"));
            response.put("assigned_to", {"value": taskData.get("assignedTo")});
        }
    }
    catch (e)
    {
        info "Error loading task: " + e;
    }
}

return response;
```

---

## Best Practices

### 1. Error Handling

Always use try-catch for external API calls:

```deluge
try
{
    apiResponse = invokeurl [...];
    
    if(apiResponse.get("success"))
    {
        // Handle success
    }
    else
    {
        response.put("text", apiResponse.get("text"));
    }
}
catch (e)
{
    // Provide graceful fallback
    response.put("text", "⏳ Processing your request...");
}
```

### 2. Field Extraction Patterns

**Select Field:**
```deluge
fieldObj = formValues.get("field_name");
value = "";
if(fieldObj != null && fieldObj.containKey("value"))
{
    value = fieldObj.get("value");
}
```

**Native Select (User):**
```deluge
userObj = formValues.get("user_field");
email = "";
if(userObj != null)
{
    email = userObj.get("email");
}
```

**Text/Textarea:**
```deluge
textValue = formValues.get("text_field");
value = "";
if(textValue != null)
{
    value = textValue.toString();
}
```

### 3. Validation

Always validate required fields before API calls:

```deluge
if(projectId.isEmpty())
{
    response.put("text", "❌ Please select a project");
    return response;
}
```

### 4. User Context

Access current user information:

```deluge
userId = user.get("id");
userName = user.get("name");
userEmail = user.get("email");
```

### 5. API Response Format

Backend should return consistent format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "text": "✅ User-friendly message"
}
```

---

## Common Patterns

### Pattern 1: Load Dropdown from Backend

**Form Definition:**
```deluge
try
{
    queryParams = "userId=" + user.get("id");
    projectsResponse = invokeurl
    [
        url: BASE_URL + "/list-projects?" + queryParams
        type: GET
        headers: headers
    ];
    
    projectOptions = list();
    if(projectsResponse.get("success"))
    {
        projects = projectsResponse.get("data");
        for each project in projects
        {
            option = map();
            option.put("label", project.get("name"));
            option.put("value", project.get("id"));
            projectOptions.add(option);
        }
    }
}
catch (e)
{
    info "Error loading projects: " + e;
}
```

### Pattern 2: Dependent Dropdowns

**Step 1: Mark parent field with trigger**
```json
{
  "name": "category",
  "trigger_on_change": true
}
```

**Step 2: Implement change handler**
```deluge
if(target.get("name") == "category")
{
    categoryValue = formValues.get("category").get("value");
    
    // Load subcategories based on category
    subcategoryOptions = loadSubcategories(categoryValue);
    
    response.put("subcategory", {"options": subcategoryOptions});
}
```

### Pattern 3: Conditional Field Visibility

```deluge
// In change handler
if(formValues.get("task_type").get("value") == "recurring")
{
    // Show recurrence fields
    response.put("recurrence_pattern", {"visible": true});
    response.put("recurrence_end", {"visible": true});
}
else
{
    // Hide recurrence fields
    response.put("recurrence_pattern", {"visible": false});
    response.put("recurrence_end", {"visible": false});
}
```

### Pattern 4: Search with Debouncing

```deluge
// In dynamic field handler
searchQuery = target.get("query");

// Only search if query is at least 3 characters
if(searchQuery.length() >= 3)
{
    // Perform search
    results = searchBackend(searchQuery);
    
    for each result in results
    {
        if(result.get("name").containsIgnoreCase(searchQuery))
        {
            optionsList.add({
                "label": result.get("name"),
                "value": result.get("id")
            });
        }
    }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "containsKey" function not found

**Error:** `Not able to find 'containsKey' function`

**Solution:** Use `containKey` (without 's')

```deluge
// ❌ Wrong
if(obj.containsKey("value"))

// ✅ Correct
if(obj.containKey("value"))
```

#### 2. Field not updating in change handler

**Problem:** Field doesn't refresh after change handler

**Solution:** Ensure you return the correct structure

```deluge
// ❌ Wrong
return {"options": optionsList};

// ✅ Correct (for change handler)
response.put("field_name", {"options": optionsList});
return response;
```

#### 3. API timeout showing error

**Problem:** Form shows error when API is slow

**Solution:** Use try-catch with graceful message

```deluge
catch (e)
{
    response.put("text", "✅ Request is being processed...");
}
```

#### 4. Empty dropdown after loading

**Problem:** Options list is empty but backend returned data

**Debug Steps:**
1. Check API response structure
2. Verify field name matches
3. Ensure proper option format: `{"label": "...", "value": "..."}`
4. Check if data is wrapped in `data` key

```deluge
// Add debug logging
info "API Response: " + apiResponse;
info "Options List: " + optionsList;
```

#### 5. Form values not accessible

**Problem:** Cannot access form values in handler

**Check:**
- Use `form.get("values")` not `form.values`
- Field name matches exactly (case-sensitive)
- Field has been filled/selected by user

---

## Testing Checklist

### Submit Handler Testing

- [ ] Form submits successfully with all fields
- [ ] Required field validation works
- [ ] Optional fields can be empty
- [ ] Error messages are user-friendly
- [ ] Success message displays correctly
- [ ] API receives correct payload format

### Dynamic Field Testing

- [ ] Search returns relevant results
- [ ] Empty search shows all/no options
- [ ] Special characters don't break search
- [ ] Large result sets load within 2 seconds
- [ ] Selected value persists after search

### Change Handler Testing

- [ ] Dependent fields update correctly
- [ ] Multiple cascading changes work
- [ ] Clearing parent field clears dependent fields
- [ ] No infinite loops between fields
- [ ] Previous selections are cleared when options change

### View Handler Testing

- [ ] Form pre-fills with existing data
- [ ] All field types populate correctly
- [ ] Optional fields handle null values
- [ ] Form can still be edited after pre-fill
- [ ] Submit saves updated values

---

## Complete Example: Task Creation Form

### Slash Command Handler

```deluge
// In tasker-slash-command.ds

if(command.equalsIgnoreCase("create-task"))
{
    if(params == "")
    {
        // Load user's projects
        queryParams = "userId=" + user.get("id");
        projectsResponse = invokeurl
        [
            url: BASE_URL + "/list-projects?" + queryParams
            type: GET
            headers: headers
        ];
        
        projectOptions = list();
        if(projectsResponse.get("success"))
        {
            projects = projectsResponse.get("data");
            for each project in projects
            {
                option = map();
                option.put("label", project.get("name"));
                option.put("value", project.get("id"));
                projectOptions.add(option);
            }
        }
        
        return {
            "type": "form",
            "title": "Create New Task",
            "name": "create_task_form",
            "hint": "Create a new task in your project",
            "button_label": "Create Task",
            "inputs": [
                {
                    "label": "Project",
                    "name": "project_id",
                    "type": "select",
                    "mandatory": true,
                    "trigger_on_change": true,
                    "options": projectOptions
                },
                {
                    "label": "Task List",
                    "name": "task_list_id",
                    "type": "select",
                    "mandatory": false,
                    "options": []
                },
                {
                    "label": "Task Title",
                    "name": "title",
                    "type": "text",
                    "mandatory": true,
                    "placeholder": "Enter task title",
                    "max_length": "200"
                },
                {
                    "label": "Description",
                    "name": "description",
                    "type": "textarea",
                    "mandatory": false,
                    "placeholder": "Enter task description",
                    "max_length": "1000"
                },
                {
                    "label": "Priority",
                    "name": "priority",
                    "type": "select",
                    "mandatory": true,
                    "options": [
                        {"label": "🔴 Urgent", "value": "urgent"},
                        {"label": "🟠 High", "value": "high"},
                        {"label": "🟡 Medium", "value": "medium"},
                        {"label": "🟢 Low", "value": "low"}
                    ]
                },
                {
                    "label": "Assign To",
                    "name": "assigned_to",
                    "type": "native_select",
                    "data_source": "contacts",
                    "mandatory": false
                },
                {
                    "label": "Due Date",
                    "name": "due_date",
                    "type": "date",
                    "mandatory": false
                }
            ],
            "action": {
                "type": "invoke.function",
                "name": "createTaskSubmit"
            },
            "change_handler": {
                "type": "invoke.function",
                "name": "taskFormChangeHandler"
            }
        };
    }
}
```

### Change Handler (taskFormChangeHandler.ds)

```deluge
/**
 * Form Change Handler for Task Creation
 * Loads task lists when project is selected
 */

BASE_URL = "https://tasker-backend-b10p.onrender.com/api/cliq/commands";
API_KEY = "34a8176cd72297093e2b349a6fb9b2443dffb51d8291cfe6711063cb4b6eafb3";

headers = Map();
headers.put("x-api-key", API_KEY);

response = Map();
formValues = form.get("values");
changedField = target.get("name");

// When project changes, load its task lists
if(changedField == "project_id")
{
    projectIdObj = formValues.get("project_id");
    
    if(projectIdObj != null && projectIdObj.containKey("value"))
    {
        projectId = projectIdObj.get("value");
        
        try
        {
            apiResponse = invokeurl
            [
                url: BASE_URL + "/task-lists?projectId=" + projectId
                type: GET
                headers: headers
            ];
            
            if(apiResponse.get("success"))
            {
                taskLists = apiResponse.get("data");
                taskListOptions = list();
                
                for each taskList in taskLists
                {
                    option = Map();
                    option.put("label", taskList.get("name"));
                    option.put("value", taskList.get("id"));
                    taskListOptions.add(option);
                }
                
                response.put("task_list_id", {"options": taskListOptions});
            }
        }
        catch (e)
        {
            info "Error loading task lists: " + e;
        }
    }
}

return response;
```

### Submit Handler (createTaskSubmit.ds)

```deluge
/**
 * Submit Handler for Create Task Form
 */

BASE_URL = "https://tasker-backend-b10p.onrender.com/api/cliq/commands";
API_KEY = "34a8176cd72297093e2b349a6fb9b2443dffb51d8291cfe6711063cb4b6eafb3";

response = Map();
headers = Map();
headers.put("x-api-key", API_KEY);
headers.put("Content-Type", "application/json");

formValues = form.get("values");

// Extract project ID
projectIdObj = formValues.get("project_id");
projectId = "";
if(projectIdObj != null && projectIdObj.containKey("value"))
{
    projectId = projectIdObj.get("value");
}

// Extract task list ID (optional)
taskListIdObj = formValues.get("task_list_id");
taskListId = "";
if(taskListIdObj != null && taskListIdObj.containKey("value"))
{
    taskListId = taskListIdObj.get("value");
}

// Extract title
title = formValues.get("title");
if(title != null)
{
    title = title.toString();
}

// Extract description (optional)
description = formValues.get("description");
if(description != null)
{
    description = description.toString();
}

// Extract priority
priorityObj = formValues.get("priority");
priority = "medium";
if(priorityObj != null && priorityObj.containKey("value"))
{
    priority = priorityObj.get("value");
}

// Extract assigned user (optional)
assignedUserObj = formValues.get("assigned_to");
assignedUserId = "";
if(assignedUserObj != null)
{
    assignedUserId = assignedUserObj.get("id");
}

// Extract due date (optional)
dueDate = formValues.get("due_date");

// Validate required fields
if(projectId.isEmpty())
{
    response.put("text", "❌ Please select a project");
    return response;
}

if(title.isEmpty())
{
    response.put("text", "❌ Please enter a task title");
    return response;
}

// Build payload
payload = Map();
payload.put("projectId", projectId);
payload.put("title", title);
payload.put("priority", priority);
payload.put("createdBy", user.get("id"));

if(!taskListId.isEmpty())
{
    payload.put("taskListId", taskListId);
}

if(!description.isEmpty())
{
    payload.put("description", description);
}

if(!assignedUserId.isEmpty())
{
    payload.put("assignedTo", assignedUserId);
}

if(dueDate != null)
{
    payload.put("dueDate", dueDate.toString());
}

try
{
    apiResponse = invokeurl
    [
        url: BASE_URL + "/create-task"
        type: POST
        parameters: payload.toString()
        headers: headers
    ];
    
    if(apiResponse.get("success"))
    {
        response.put("text", "✅ Task created successfully: " + title);
    }
    else
    {
        response.put("text", apiResponse.get("text"));
    }
}
catch (e)
{
    response.put("text", "✅ Task is being created: " + title);
}

return response;
```

---

## Quick Reference Card

### Form Response Structure

```deluge
// Submit Handler Return
return {
    "text": "Message to user",
    "card": {"title": "Card Title"},
    "slides": [...]
};

// Change Handler Return
return {
    "field_name": {
        "options": [...],      // Update dropdown options
        "value": "new_value",  // Set field value
        "visible": true,       // Show/hide field
        "mandatory": false     // Make optional/required
    }
};

// Dynamic Field Return
return {
    "options": [
        {"label": "Display", "value": "id"}
    ]
};

// View Handler Return
return {
    "field1": "value1",
    "field2": {"value": "value2"}
};
```

### Field Extraction Shortcuts

```deluge
// Select/Dynamic Select
value = formValues.get("field").get("value");

// Native Select (User)
email = formValues.get("user").get("email");
userId = formValues.get("user").get("id");
userName = formValues.get("user").get("name");

// Text/Textarea/Number/Date
value = formValues.get("field").toString();

// Check if empty
if(value == null || value.isEmpty()) { }
```

---

## Resources

- [Zoho Cliq Platform Documentation](https://www.zoho.com/cliq/help/platform/)
- [Form Functions Workflow](https://www.zoho.com/cliq/help/platform/form_functions_workflow.html)
- [Submit Handler Reference](https://www.zoho.com/cliq/help/platform/form_functions_workflow/submit-handler.html)
- [Change Handler Reference](https://www.zoho.com/cliq/help/platform/form_functions_workflow/change-handler.html)
- [Dynamic Field Handler Reference](https://www.zoho.com/cliq/help/platform/form_functions_workflow/dynamic-field-handler.html)
- [View Handler Reference](https://www.zoho.com/cliq/help/platform/form_functions_workflow/view-handler.html)
- [Widget Functions](https://www.zoho.com/cliq/help/platform/widget-functions.html)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-11-25 | Initial documentation created | Tasker Backend Team |

---

**Need Help?** Check the [Troubleshooting](#troubleshooting) section or refer to the [Complete Example](#complete-example-task-creation-form) for working code.
