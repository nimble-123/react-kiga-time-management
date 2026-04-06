import { requireAdmin } from "@/lib/auth";
import { getAllReviews } from "@/actions/monthly-reviews";
import { ApprovalsView } from "./approvals-view";

export default async function ApprovalsPage() {
  await requireAdmin();
  const reviews = await getAllReviews();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Genehmigungen</h1>
      <ApprovalsView reviews={reviews} />
    </div>
  );
}
