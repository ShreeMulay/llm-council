# Data Store & Search App Configuration

## Data Store Setup

### Create Data Store

1. Go to: `https://console.cloud.google.com/gen-app-builder/data-stores`
2. Click **Create Data Store**
3. Select **Google Drive** as the data source
   - If Drive connector isn't available, use **Cloud Storage** and sync manually
4. Enter the folder URL or ID:
   - Folder ID: `1lWgOw9thvj5hD7qIYukgZ5DRY3OwvoK4`
   - URL: `https://drive.google.com/drive/u/0/folders/1lWgOw9thvj5hD7qIYukgZ5DRY3OwvoK4`
5. Configuration:
   - Name: `premier-dialysis-pp`
   - Location: `us` (multi-region) or `us-central1`
   - Document processing: **Advanced** (enables OCR, layout parsing)
   - Enable: auto-chunking
6. Click **Create**

### Verify Indexing

- Wait ~30 minutes for initial indexing of 100+ documents
- Check the Data Store page for document count
- Verify key documents are indexed:
  - `1-001 Mission Statement`
  - `2-006 Medical Director`
  - `2-012 Admission Discharge`
  - `2-015 Patient Rights` (FL, MI, TN variants)
  - `2-017 Advance Directives`
  - NxStage Policies subfolder docs

### Sync Schedule

- Configure auto-sync: **Daily** (recommended)
- Manual re-sync available via console at any time
- New/updated docs in Drive will be re-indexed automatically

## Search App Setup

### Create Search App

1. Go to: `https://console.cloud.google.com/gen-app-builder/apps`
2. Click **Create App**
3. App type: **Search**
4. Configuration:
   - Name: `Premier Dialysis Policy Search`
   - Company: `Premier Dialysis`
   - Link data store: `premier-dialysis-pp`
5. Click **Create**

### Configure Search Features

In the Search App settings:

#### Answer Generation
- Enable: **Search with follow-ups** (conversational)
- Model: Gemini (use latest stable version)
- Answer style: **Verbose** (detailed answers with context)
- Citation mode: **Extractive segments** (exact quotes from documents)
- Grounding: **Strict** — only answer from indexed documents

#### Search Settings
- Enable: **Autocomplete** (suggests queries as user types)
- Enable: **Spelling correction**
- Enable: **Safe search** (filter inappropriate content)
- Snippet length: **Medium**

#### Widget Configuration
- Go to **Integration** tab
- Copy the **Config ID** (needed for the HTML embed)
- Widget type: **Search with answer**
- Layout: `alwaysOpened` (no trigger button needed)

### Get Config ID

The Config ID looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

This goes into `firebase/public/index.html`:
```html
<gen-search-widget
  configId="YOUR_CONFIG_ID_HERE"
  triggerId="search-trigger"
  alwaysOpened
></gen-search-widget>
```

## Testing Queries

After setup, test these queries in the console preview:

| Query | Expected Behavior |
|-------|-------------------|
| "What is the mission statement?" | Cites 1-001 Mission Statement |
| "Patient rights in Florida" | Cites 2-015 FL variant specifically |
| "Medical director responsibilities" | Cites 2-006 Medical Director |
| "Admission and discharge criteria" | Cites 2-012 |
| "Advance directives policy" | Cites 2-017 |
| "NxStage machine maintenance" | Cites NxStage Policies subfolder |
| "What is the weather today?" | Should NOT answer (out of scope) |
| "Tell me about COVID vaccines" | Should NOT answer (out of scope) |
