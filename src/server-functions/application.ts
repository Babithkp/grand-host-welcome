import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getApplicationFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const applications = await getApplicationsCollection();
    const app = await applications.findOne({ userId });
    if (!app) return null;

    return {
      first_name: app.first_name,
      last_name: app.last_name,
      date_of_birth: app.date_of_birth,
      address: app.address,
      phone: app.phone,
      country: app.country,
      position: app.position,
      submitted: app.submitted,
      status: app.status ?? null,
    };
  },
);

const applicationSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  date_of_birth: z.string().nullable(),
  address: z.string(),
  phone: z.string(),
  country: z.string(),
  position: z.string(),
  submit: z.boolean().optional(),
});

export const saveApplicationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => applicationSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationsCollection, getApplicationDocumentsCollection } =
      await import("@/integrations/mongodb/client.server");

    const userId = await requireUserId();

    if (data.submit) {
      const documents = await getApplicationDocumentsCollection();
      const docCount = await documents.countDocuments({ userId });
      if (docCount === 0) {
        throw new Error(
          "Please upload at least one document before submitting.",
        );
      }
    }

    const applications = await getApplicationsCollection();
    const now = new Date();
    await applications.updateOne(
      { userId },
      {
        $set: {
          userId,
          first_name: data.first_name,
          last_name: data.last_name,
          date_of_birth: data.date_of_birth,
          address: data.address,
          phone: data.phone,
          country: data.country,
          position: data.position,
          updated_at: now,
          ...(data.submit
            ? { submitted: true, submitted_at: now, status: "pending" as const }
            : {}),
        },
        $setOnInsert: {
          created_at: now,
          ...(data.submit ? {} : { submitted: false }),
        },
      },
      { upsert: true },
    );

    return { ok: true };
  });
