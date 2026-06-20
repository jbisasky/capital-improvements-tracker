import { type Project } from "@/domain/schemas";

const MAX_FOLDER_NAME_LENGTH = 80;

export function sanitizeDriveFolderName(name: string): string {
  return name
    .replace(/[/\\?*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FOLDER_NAME_LENGTH);
}

export function projectFolderDisplayName(
  project: Pick<Project, "title" | "completionDate" | "id">,
): string {
  const titlePart = sanitizeDriveFolderName(project.title);
  if (titlePart.length > 0) {
    return sanitizeDriveFolderName(`${titlePart} - ${project.completionDate}`);
  }
  return sanitizeDriveFolderName(`Project ${project.id.slice(0, 8)}`);
}
