# Content Studio image attachments

Choose one JPEG/PNG up to 1 MiB and 12 megapixels, then save the draft to upload it. The server decodes the bytes, strips metadata, rotates, flattens transparency onto white, resizes to at most 1600 x 1600, and converts to JPEG. Files that still exceed 256 KiB are rejected. SVG, animation, malformed input and other formats are rejected. A caption is required. A draft contains either one image or one link; put additional links in the caption.

This bounded first release stores encoded images in the existing private ContentDraft.mediaUrl field. No public object URL, filesystem persistence, storage subscription or schema migration is required. Ownership, stale-edit protection and delivery locks apply to the image with the rest of the draft. Deleting an editable draft removes its attachment; delivery history remains locked. This increases database and draft-list payload sizes. Move images to owned object storage and paginate the library before scaling to large libraries; this is not an unlimited media service. Backups also contain images. Tab recovery is best effort and subject to browser storage limits.

X: reconnect to grant media.write alongside tweet.write. Publishing uploads the image with POST /2/media/upload, validates its returned ID/readiness, then sends POST /2/tweets with media.media_ids. Upload failures never fall back to text-only posting. Upload-only failures are retryable; uncertainty after the post request retains the existing UNKNOWN lock. One operation reservation covers the flow, but provider billing can count upload and post separately.

Facebook and TikTok images: download the saved image, copy/open the platform and attach it manually. The API rejects direct image delivery on these platforms before claiming a receipt or consuming publishing allowance. Existing Facebook text/link publishing continues. Opening a platform never marks a draft delivered.

Acceptance: choose image, save, reopen the library, verify the saved preview and download, edit the caption, save, and confirm the image remains. Test too-large/corrupt images, another user's draft, stale updates, X upload rejection, publication timeout and repeated publish clicks. Provider calls in automated tests are mocked; real posting requires separate explicit confirmation and working provider access.

Reference: https://docs.x.com/x-api/media/upload-media
