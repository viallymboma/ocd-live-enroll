import { AccountForm, PasswordForm } from "@/components/admin/AccountForms";
import { getDict } from "@/i18n/server";
import { requireAdmin } from "@/server/auth";

export async function generateMetadata() {
  const { t } = await getDict();
  return { title: t.admin.account.title };
}

/** The signed-in admin's own account: name, login email, password. */
export default async function AccountPage() {
  const admin = await requireAdmin();
  const { t } = await getDict();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-4xl sm:text-5xl">{t.admin.account.title}</h1>
      <p className="mt-3 text-sm text-sand">{t.admin.account.lead}</p>
      <div className="mt-8 grid gap-5">
        <AccountForm name={admin.name} email={admin.email} />
        <PasswordForm />
      </div>
    </div>
  );
}
