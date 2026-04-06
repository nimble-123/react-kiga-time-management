import { requireAdmin } from "@/lib/auth";
import { getUsers } from "@/actions/users";
import { UsersView } from "./users-view";

export default async function UsersPage() {
  await requireAdmin();
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
      <UsersView users={users} />
    </div>
  );
}
