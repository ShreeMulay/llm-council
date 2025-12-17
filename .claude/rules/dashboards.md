# HTML Dashboard Conventions

For self-contained, single-file HTML dashboards.

## File Structure

### Single-File Dashboard

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Title</title>
    <style>
        /* All CSS here */
    </style>
</head>
<body>
    <!-- All HTML here -->
    
    <script>
        // All JavaScript here
    </script>
</body>
</html>
```

### Why Single-File?

- Easy to share (one file)
- No build step required
- Opens directly in browser
- Version control friendly
- Self-documenting

---

## CSS Patterns

### CSS Variables for Theming

```css
:root {
    /* Colors */
    --color-primary: #3b82f6;
    --color-secondary: #64748b;
    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-danger: #ef4444;
    
    /* Backgrounds */
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --bg-tertiary: #f1f5f9;
    
    /* Text */
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    
    /* Spacing */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    
    /* Borders */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 1rem;
    --border-color: #e2e8f0;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    :root {
        --bg-primary: #1e293b;
        --bg-secondary: #0f172a;
        --text-primary: #f8fafc;
        --text-secondary: #94a3b8;
        --border-color: #334155;
    }
}
```

### Base Reset

```css
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.5;
    color: var(--text-primary);
    background: var(--bg-secondary);
}

a {
    color: var(--color-primary);
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}
```

### Layout Classes

```css
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-lg);
}

.grid {
    display: grid;
    gap: var(--space-md);
}

.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
    .grid-2, .grid-3, .grid-4 {
        grid-template-columns: 1fr;
    }
}

.flex {
    display: flex;
    gap: var(--space-md);
}

.flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
```

---

## Component Patterns

### Card

```html
<div class="card">
    <div class="card-header">
        <h3 class="card-title">Title</h3>
    </div>
    <div class="card-body">
        Content here
    </div>
</div>
```

```css
.card {
    background: var(--bg-primary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
}

.card-header {
    padding: var(--space-md);
    border-bottom: 1px solid var(--border-color);
}

.card-title {
    font-size: 1rem;
    font-weight: 600;
}

.card-body {
    padding: var(--space-md);
}
```

### Data Table

```html
<table class="table">
    <thead>
        <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Date</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Item 1</td>
            <td><span class="badge badge-success">Active</span></td>
            <td>2024-01-15</td>
        </tr>
    </tbody>
</table>
```

```css
.table {
    width: 100%;
    border-collapse: collapse;
}

.table th,
.table td {
    padding: var(--space-sm) var(--space-md);
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.table th {
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.table tbody tr:hover {
    background: var(--bg-tertiary);
}
```

### Badge

```css
.badge {
    display: inline-block;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
}

.badge-success {
    background: #dcfce7;
    color: #166534;
}

.badge-warning {
    background: #fef3c7;
    color: #92400e;
}

.badge-danger {
    background: #fee2e2;
    color: #991b1b;
}
```

---

## JavaScript Patterns

### Data Loading

```javascript
async function loadData() {
    try {
        showLoading();
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();
        renderData(data);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const errorEl = document.getElementById('error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}
```

### Rendering Data

```javascript
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${escapeHtml(item.name)}</td>
            <td><span class="badge badge-${item.status}">${item.status}</span></td>
            <td>${formatDate(item.date)}</td>
        </tr>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
```

### Filtering & Sorting

```javascript
let currentData = [];
let filters = { status: 'all', search: '' };

function applyFilters() {
    let filtered = [...currentData];
    
    if (filters.status !== 'all') {
        filtered = filtered.filter(item => item.status === filters.status);
    }
    
    if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(search)
        );
    }
    
    renderTable(filtered);
    updateCounts(filtered);
}

document.getElementById('status-filter').addEventListener('change', (e) => {
    filters.status = e.target.value;
    applyFilters();
});

document.getElementById('search').addEventListener('input', (e) => {
    filters.search = e.target.value;
    applyFilters();
});
```

---

## Accessibility

### Basic Requirements

```html
<!-- Use semantic HTML -->
<header>...</header>
<nav>...</nav>
<main>...</main>
<footer>...</footer>

<!-- Label form elements -->
<label for="search">Search</label>
<input type="text" id="search" name="search">

<!-- Add alt text to images -->
<img src="chart.png" alt="Monthly revenue chart showing 15% growth">

<!-- Use buttons for actions -->
<button type="button" onclick="doSomething()">Click me</button>
<!-- NOT: <div onclick="doSomething()">Click me</div> -->
```

### Focus States

```css
:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}

:focus:not(:focus-visible) {
    outline: none;
}

:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}
```

---

## Performance Tips

1. **Minimize reflows**: Batch DOM updates
2. **Use CSS for animations**: Not JavaScript
3. **Lazy load data**: Load visible content first
4. **Debounce input handlers**: Prevent excessive updates
5. **Use `requestAnimationFrame`**: For smooth animations

```javascript
// Debounce example
function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

const debouncedSearch = debounce(applyFilters, 300);
document.getElementById('search').addEventListener('input', debouncedSearch);
```

---

## File Naming

```
project-dashboard.html      # Main dashboard
project-dashboard-v2.html   # Version 2
report-monthly.html         # Specific report
analysis-comparison.html    # Analysis tool
```

Keep names descriptive and use kebab-case.
