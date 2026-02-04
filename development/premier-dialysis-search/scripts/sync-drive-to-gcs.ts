#!/usr/bin/env bun
/**
 * Sync Google Drive folder to GCS bucket
 *
 * This script:
 * 1. Lists all files in the Drive folder (recursively)
 * 2. Downloads each file
 * 3. Uploads to the GCS bucket
 *
 * Prerequisites:
 *   - gcloud auth login --enable-gdrive-access
 *   - Or: set GOOGLE_ACCESS_TOKEN env var with a token that has Drive + GCS scopes
 *
 * Usage: bun run scripts/sync-drive-to-gcs.ts
 */

const DRIVE_FOLDER_ID = "1lWgOw9thvj5hD7qIYukgZ5DRY3OwvoK4";
const GCS_BUCKET = "premier-dialysis-pp-docs";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
}

async function getAccessToken(): Promise<string> {
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN;
  }
  const proc = Bun.spawn(["gcloud", "auth", "print-access-token"], {
    stdout: "pipe",
  });
  const text = await new Response(proc.stdout).text();
  return text.trim();
}

// Google Workspace MIME types that need export (not downloadable directly)
const EXPORT_MIMES: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.document": {
    mime: "application/pdf",
    ext: ".pdf",
  },
  "application/vnd.google-apps.spreadsheet": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mime: "application/pdf",
    ext: ".pdf",
  },
  "application/vnd.google-apps.drawing": {
    mime: "application/pdf",
    ext: ".pdf",
  },
};

// MIME types to skip (not real files)
const SKIP_MIMES = new Set([
  "application/vnd.google-apps.folder",
  "application/vnd.google-apps.shortcut",
  "application/vnd.google-apps.form",
  "application/vnd.google-apps.map",
  "application/vnd.google-apps.site",
]);

async function listFilesRecursive(
  token: string,
  folderId: string,
  path: string = ""
): Promise<Array<DriveFile & { path: string }>> {
  const allFiles: Array<DriveFile & { path: string }> = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: "100",
      fields: "nextPageToken,files(id,name,mimeType,size,parents)",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Drive API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const files: DriveFile[] = data.files || [];

    for (const file of files) {
      if (SKIP_MIMES.has(file.mimeType)) {
        if (file.mimeType === "application/vnd.google-apps.folder") {
          // Recurse into subfolders
          const subPath = path ? `${path}/${file.name}` : file.name;
          const subFiles = await listFilesRecursive(token, file.id, subPath);
          allFiles.push(...subFiles);
        }
        continue;
      }
      allFiles.push({ ...file, path: path ? `${path}/${file.name}` : file.name });
    }

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return allFiles;
}

async function downloadFile(
  token: string,
  file: DriveFile & { path: string }
): Promise<{ data: ArrayBuffer; filename: string } | null> {
  const exportInfo = EXPORT_MIMES[file.mimeType];

  if (exportInfo) {
    // Google Workspace file — export it
    const filename = file.path.endsWith(exportInfo.ext)
      ? file.path
      : `${file.path}${exportInfo.ext}`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportInfo.mime)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      console.error(`  SKIP export failed: ${file.name} (${response.status})`);
      return null;
    }
    return { data: await response.arrayBuffer(), filename };
  } else {
    // Regular file — download directly
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      console.error(
        `  SKIP download failed: ${file.name} (${response.status})`
      );
      return null;
    }
    return { data: await response.arrayBuffer(), filename: file.path };
  }
}

async function uploadToGCS(
  token: string,
  bucket: string,
  filename: string,
  data: ArrayBuffer
): Promise<boolean> {
  const objectName = encodeURIComponent(filename);
  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${objectName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "X-Goog-User-Project": "premier-dialysis-search",
      },
      body: data,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error(`  FAIL upload ${filename}: ${response.status} ${err}`);
    return false;
  }
  return true;
}

async function main() {
  console.log("============================================");
  console.log("Drive → GCS Sync");
  console.log("============================================");
  console.log(`Drive Folder: ${DRIVE_FOLDER_ID}`);
  console.log(`GCS Bucket:   gs://${GCS_BUCKET}`);
  console.log("");

  const token = await getAccessToken();

  console.log("Listing files from Google Drive (recursive)...");
  const files = await listFilesRecursive(token, DRIVE_FOLDER_ID);
  console.log(`Found ${files.length} files to sync.\n`);

  let uploaded = 0;
  let failed = 0;

  for (const file of files) {
    process.stdout.write(`  [${uploaded + failed + 1}/${files.length}] ${file.path}...`);

    const result = await downloadFile(token, file);
    if (!result) {
      failed++;
      continue;
    }

    const success = await uploadToGCS(token, GCS_BUCKET, result.filename, result.data);
    if (success) {
      uploaded++;
      console.log(` OK (${(result.data.byteLength / 1024).toFixed(0)}KB)`);
    } else {
      failed++;
    }

    // Rate limit to avoid Drive API throttling
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log("\n============================================");
  console.log(`Results: ${uploaded} uploaded, ${failed} failed out of ${files.length}`);
  console.log("============================================");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
