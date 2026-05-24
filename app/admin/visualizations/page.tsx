import { AdminShell } from "@/components/admin-shell";
import { AdminVisualizationEditor } from "@/components/admin-visualization-editor";
import { requireAdmin } from "@/lib/auth";
import { getAllVisualizations } from "@/lib/data";

export default async function AdminVisualizationsPage() {
  await requireAdmin();
  const items = await getAllVisualizations();
  const showCategoryStorageNotice =
    items.length > 0 && !items.some((item) => item.category === "utility" || item.category === "game");

  return (
    <AdminShell
      current="/admin/visualizations"
      title="Home Content"
      description="Register, edit, and sort utility and game metadata shown on the home page."
    >
      <AdminVisualizationEditor items={items} showCategoryStorageNotice={showCategoryStorageNotice} />
    </AdminShell>
  );
}
