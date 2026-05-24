import {
  deleteProfileLinkAction,
  deleteProfileProjectAction,
  saveProfileLinkAction,
  saveProfileProjectAction,
} from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { ProfilePhoto } from "@/components/profile-photo";
import { ProfilePhotoUploadForm } from "@/components/profile-photo-upload-form";
import { ProfileTextForm } from "@/components/profile-text-form";
import { requireAdmin } from "@/lib/auth";
import { getProfileBundle, getProfilePhotoUrl } from "@/lib/data";

const photoMessages: Record<string, { tone: "success" | "error"; text: string }> = {
  success: { tone: "success", text: "Profile photo saved." },
  missing_file: { tone: "error", text: "Choose an image to upload." },
  missing_profile: { tone: "error", text: "Profile information could not be found." },
  upload_failed: { tone: "error", text: "Profile photo upload failed." },
};

export default async function AdminProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const bundle = await getProfileBundle();
  const photoUrl = await getProfilePhotoUrl(bundle.profile.photo_path);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const photoKey = typeof resolvedSearchParams?.photo === "string" ? resolvedSearchParams.photo : "";
  const photoMessage = photoMessages[photoKey];

  return (
    <AdminShell
      current="/admin/profile"
      title="Profile Content"
      description="Edit the about-page copy, profile photo, projects, and external links."
    >
      <div className="admin-profile-manager">
        <section className="admin-profile-section">
          <h3>Profile Copy</h3>
          <ProfileTextForm profile={bundle.profile} />
        </section>

        <section className="admin-profile-section">
          <h3>Profile Photo</h3>
          {photoMessage ? (
            <div className={photoMessage.tone === "success" ? "notice notice-success" : "notice notice-error"}>
              {photoMessage.text}
            </div>
          ) : null}
          <div className="admin-profile-photo-grid">
            <ProfilePhoto url={photoUrl} />
            <ProfilePhotoUploadForm profileId={bundle.profile.id} />
          </div>
        </section>

        <section className="admin-profile-section">
          <h3>Add Project</h3>
          <form action={saveProfileProjectAction} className="compact-form">
            <div className="admin-profile-form-grid">
              <div className="field">
                <label className="label">Title</label>
                <input className="input" name="title" />
              </div>
              <div className="field">
                <label className="label">URL</label>
                <input className="input" name="project_url" placeholder="/diff or https://..." />
              </div>
              <div className="field">
                <label className="label">Start Year</label>
                <input className="input" name="start_year" type="number" min={0} max={9999} placeholder="2024" />
              </div>
              <div className="field">
                <label className="label">End Year</label>
                <input className="input" name="end_year" type="number" min={0} max={9999} placeholder="2026" />
              </div>
              <div className="field admin-profile-span-3">
                <label className="label">Screenshot URL</label>
                <input className="input" name="screenshot_url" placeholder="https://..." />
              </div>
              <div className="field">
                <label className="label">Sort Order</label>
                <input className="input" name="sort_order" type="number" defaultValue={0} />
              </div>
              <div className="field admin-profile-span-full">
                <label className="label">Description</label>
                <textarea className="textarea admin-profile-textarea" name="description" />
              </div>
            </div>
            <div className="actions admin-form-actions">
              <AdminSubmitButton idleText="Add Project" pendingText="Saving..." />
            </div>
          </form>
        </section>

        <section className="admin-profile-section">
          <div className="admin-compact-heading">
            <h3>Projects</h3>
            <span className="muted">{bundle.projects.length}</span>
          </div>
          <div className="admin-profile-list">
            {bundle.projects.map((project) => (
              <article key={project.id} className="admin-profile-item">
                <div className="list-item-header">
                  <h3>{project.title || "Untitled Project"}</h3>
                  <form action={deleteProfileProjectAction}>
                    <input type="hidden" name="id" value={project.id} />
                    <AdminSubmitButton className="danger-button" idleText="Delete" pendingText="Deleting..." />
                  </form>
                </div>
                <form action={saveProfileProjectAction} className="compact-form">
                  <input type="hidden" name="id" value={project.id} />
                  <div className="admin-profile-form-grid">
                    <div className="field">
                      <label className="label">Title</label>
                      <input className="input" name="title" defaultValue={project.title} />
                    </div>
                    <div className="field">
                      <label className="label">URL</label>
                      <input className="input" name="project_url" defaultValue={project.project_url} />
                    </div>
                    <div className="field">
                      <label className="label">Start Year</label>
                      <input
                        className="input"
                        name="start_year"
                        type="number"
                        min={0}
                        max={9999}
                        defaultValue={project.start_year ?? ""}
                      />
                    </div>
                    <div className="field">
                      <label className="label">End Year</label>
                      <input
                        className="input"
                        name="end_year"
                        type="number"
                        min={0}
                        max={9999}
                        defaultValue={project.end_year ?? ""}
                      />
                    </div>
                    <div className="field admin-profile-span-3">
                      <label className="label">Screenshot URL</label>
                      <input className="input" name="screenshot_url" defaultValue={project.screenshot_url ?? ""} />
                    </div>
                    <div className="field">
                      <label className="label">Sort Order</label>
                      <input className="input" name="sort_order" type="number" defaultValue={project.sort_order} />
                    </div>
                    <div className="field admin-profile-span-full">
                      <label className="label">Description</label>
                      <textarea
                        className="textarea admin-profile-textarea"
                        name="description"
                        defaultValue={project.description}
                      />
                    </div>
                  </div>
                  <div className="actions admin-form-actions">
                    <AdminSubmitButton idleText="Save Changes" pendingText="Saving..." />
                  </div>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-profile-section">
          <h3>Add External Link</h3>
          <form action={saveProfileLinkAction} className="compact-form">
            <div className="admin-profile-link-grid">
              <div className="field">
                <label className="label">Name</label>
                <input className="input" name="label" placeholder="LinkedIn" />
              </div>
              <div className="field">
                <label className="label">URL</label>
                <input className="input" name="url" placeholder="https://..." />
              </div>
              <div className="field">
                <label className="label">Sort Order</label>
                <input className="input" name="sort_order" type="number" defaultValue={0} />
              </div>
            </div>
            <div className="actions admin-form-actions">
              <AdminSubmitButton idleText="Add Link" pendingText="Saving..." />
            </div>
          </form>
        </section>

        <section className="admin-profile-section">
          <div className="admin-compact-heading">
            <h3>External Links</h3>
            <span className="muted">{bundle.links.length}</span>
          </div>
          <div className="admin-profile-list">
            {bundle.links.map((link) => (
              <article key={link.id} className="admin-profile-item">
                <div className="list-item-header">
                  <h3>{link.label || "Untitled Link"}</h3>
                  <form action={deleteProfileLinkAction}>
                    <input type="hidden" name="id" value={link.id} />
                    <AdminSubmitButton className="danger-button" idleText="Delete" pendingText="Deleting..." />
                  </form>
                </div>
                <form action={saveProfileLinkAction} className="compact-form">
                  <input type="hidden" name="id" value={link.id} />
                  <div className="admin-profile-link-grid">
                    <div className="field">
                      <label className="label">Name</label>
                      <input className="input" name="label" defaultValue={link.label} />
                    </div>
                    <div className="field">
                      <label className="label">URL</label>
                      <input className="input" name="url" defaultValue={link.url} />
                    </div>
                    <div className="field">
                      <label className="label">Sort Order</label>
                      <input className="input" name="sort_order" type="number" defaultValue={link.sort_order} />
                    </div>
                  </div>
                  <div className="actions admin-form-actions">
                    <AdminSubmitButton idleText="Save Changes" pendingText="Saving..." />
                  </div>
                </form>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
