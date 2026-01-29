

# Azure Blob Storage Integration for Video Uploads

## Oversigt

Denne plan tilføjer Azure Blob Storage som video-storage løsning, hvilket fjerner den nuværende 20MB filstørrelses-begrænsning og giver mulighed for at uploade videoer af enhver størrelse.

---

## Sådan fungerer det

### For Platform Admins (Upload af videoer)

1. I lesson editoren vælges "Video" som lesson type
2. En ny `AzureVideoUpload` komponent vises med drag-and-drop eller klik-til-upload
3. Filen uploades direkte til Azure Blob Storage via en pre-signed URL (SAS token)
4. Upload-progress vises i real-time
5. Når upload er færdig, gemmes blob-stien i databasen

### For Learners (Afspilning)

Videoen streames direkte fra Azure Blob Storage via en tidsbegrænset SAS URL, som genereres on-demand når lektionen indlæses.

---

## Opsætning i Azure Portal

Før implementeringen kan bruges, skal du oprette følgende i Azure:

| Ressource | Beskrivelse |
|-----------|-------------|
| **Storage Account** | Opret en ny eller brug eksisterende storage account |
| **Container** | Opret en container kaldet `lms-videos` med **Private** access level |
| **Access Key** | Find storage account name og access key under "Access keys" |

---

## Ændringsoversigt

### Database

| Ændring | Beskrivelse |
|---------|-------------|
| Tilføj `azure_blob_path` kolonne til `lessons` | Gemmer blob-stien til Azure-hostede videoer (nullable text) |

### Nye/Ændrede Filer

| Fil | Ændringer |
|-----|-----------|
| `supabase/functions/azure-upload-url/index.ts` | **Ny** - Edge function der genererer SAS upload URL |
| `supabase/functions/azure-view-url/index.ts` | **Ny** - Edge function der genererer SAS view URL |
| `src/components/ui/azure-video-upload.tsx` | **Ny** - Upload komponent med progress tracking |
| `src/lib/types.ts` | Tilføj `azure_blob_path` felt til Lesson interface |
| `src/pages/platform-admin/CourseEditor.tsx` | Brug AzureVideoUpload for video lessons |
| `src/pages/learner/CoursePlayer.tsx` | Hent Azure signed URL når lesson har azure_blob_path |

### Secrets (krævet)

| Secret Navn | Beskrivelse |
|-------------|-------------|
| `AZURE_STORAGE_ACCOUNT_NAME` | Dit Azure storage account navn |
| `AZURE_STORAGE_ACCOUNT_KEY` | Din Azure storage access key |
| `AZURE_STORAGE_CONTAINER_NAME` | Container navn (f.eks. `lms-videos`) |

---

## Tekniske Detaljer

### Upload Flow

```text
+------------------+     +-------------------------+     +-------------------+
| CourseEditor     | --> | azure-upload-url        | --> | Azure Blob        |
| (Admin browser)  |     | (Edge Function)         |     | Storage           |
+------------------+     +-------------------------+     +-------------------+
        |                          |                              |
        | 1. Request SAS URL       |                              |
        |------------------------->|                              |
        |                          | 2. Generate SAS token        |
        |                          |----------------------------->|
        |    3. Return upload URL  |                              |
        |<-------------------------|                              |
        |                                                         |
        | 4. Direct upload to Azure (PUT with SAS)                |
        |-------------------------------------------------------->|
        |                                                         |
        | 5. Store blob path in database                          |
        |                                                         |
```

### View Flow

```text
+------------------+     +-------------------------+     +-------------------+
| CoursePlayer     | --> | azure-view-url          | --> | Azure Blob        |
| (Learner browser)|     | (Edge Function)         |     | Storage           |
+------------------+     +-------------------------+     +-------------------+
        |                          |                              |
        | 1. Request view URL      |                              |
        |   (with blob_path)       |                              |
        |------------------------->|                              |
        |                          | 2. Validate user access      |
        |                          | 3. Generate read-only SAS    |
        |    4. Return signed URL  |                              |
        |<-------------------------|                              |
        |                                                         |
        | 5. Stream video directly from Azure                     |
        |-------------------------------------------------------->|
```

### SAS Token Parametre

| Parameter | Upload | View |
|-----------|--------|------|
| Permission | `write`, `create` | `read` |
| Expiry | 30 minutter | 2 timer |
| IP restriction | Nej | Nej |
| HTTPS only | Ja | Ja |

### Edge Function: azure-upload-url

```typescript
// Pseudocode for SAS generation
const sasToken = generateBlobSASQueryParameters({
  containerName: CONTAINER_NAME,
  blobName: uniqueFileName,
  permissions: BlobSASPermissions.parse("cw"), // create, write
  expiresOn: new Date(Date.now() + 30 * 60 * 1000), // 30 min
  protocol: SASProtocol.Https,
}, sharedKeyCredential);

return {
  uploadUrl: `https://${ACCOUNT_NAME}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasToken}`,
  blobPath: blobName
};
```

### AzureVideoUpload Komponent

```typescript
// Nøglefunktioner
- Anmod om upload-URL fra edge function
- Upload direkte til Azure via PUT request
- Track upload progress via XMLHttpRequest
- Returnér blob path til parent component
- Vis preview efter upload (via signed view URL)
```

### Sikkerhed

| Bekymring | Løsning |
|-----------|---------|
| Uautoriseret upload | Edge function validerer JWT (kun platform admins) |
| Uautoriseret view | Edge function validerer at bruger har adgang til kurset |
| Token leakage | Korte expiry tider (30 min upload, 2 timer view) |
| CORS | Azure container konfigureres med tilladt origin |

---

## Implementeringsrækkefølge

1. **Database migration** - Tilføj `azure_blob_path` kolonne til lessons table
2. **Secrets setup** - Tilføj Azure credentials som Supabase secrets
3. **Edge function: azure-upload-url** - Generér SAS tokens til upload
4. **Edge function: azure-view-url** - Generér SAS tokens til visning
5. **AzureVideoUpload komponent** - Upload UI med progress
6. **Opdater Lesson type** - Tilføj `azure_blob_path` til TypeScript interface
7. **Opdater CourseEditor** - Brug AzureVideoUpload for video lessons
8. **Opdater CoursePlayer** - Hent og brug Azure signed URLs

---

## Begrænsninger

- **CORS-opsætning kræves**: Azure container skal konfigureres til at tillade requests fra din applikations domæne
- **Ingen automatisk transcoding**: Videoer afspilles som uploadet - overvej format-krav (MP4 H.264 anbefales)
- **Ingen CDN**: For global performance kan Azure CDN tilføjes senere

---

## Azure Portal CORS Opsætning

I Azure Storage Account under "Resource sharing (CORS)":

| Allowed Origins | Allowed Methods | Allowed Headers | Exposed Headers | Max Age |
|-----------------|-----------------|-----------------|-----------------|---------|
| `https://learn-wings.lovable.app` | `GET, PUT, OPTIONS` | `*` | `*` | `3600` |
| `https://*.lovable.app` | `GET, PUT, OPTIONS` | `*` | `*` | `3600` |

