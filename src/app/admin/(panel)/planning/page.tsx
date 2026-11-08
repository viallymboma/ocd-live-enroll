import { ScheduleEditor } from "@/components/admin/ScheduleEditor";
import { getDict } from "@/i18n/server";
import { getRules } from "@/server/settings";

export default async function SchedulePage() {
  const { t } = await getDict();
  const rules = await getRules();
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="display text-4xl sm:text-5xl">{t.admin.schedule.title}</h1>
      <p className="mt-3 text-sm text-sand">{t.admin.schedule.lead}</p>
      <div className="mt-8"><ScheduleEditor rules={rules} /></div>
    </div>
  );
}
