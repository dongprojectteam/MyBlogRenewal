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
      title="홈 콘텐츠 관리"
      description="홈에 노출할 유틸리티와 게임 메타데이터를 등록하고 정렬합니다."
    >
      <AdminVisualizationEditor items={items} showCategoryStorageNotice={showCategoryStorageNotice} />
    </AdminShell>
  );
}
