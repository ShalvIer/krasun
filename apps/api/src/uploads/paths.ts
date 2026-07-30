export function messageMediaPath(attachmentId: string) {
  return `/api/uploads/media/${encodeURIComponent(attachmentId)}`;
}
