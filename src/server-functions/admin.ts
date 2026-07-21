import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";
import { z } from "zod";

export const getAdminDashboardFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireAdmin } = await import("@/integrations/mongodb/auth.server");
    const {
      getUsersCollection,
      getApplicationsCollection,
      getApplicationDocumentsCollection,
    } = await import("@/integrations/mongodb/client.server");

    await requireAdmin();

    const users = await getUsersCollection();
    const applications = await getApplicationsCollection();
    const documents = await getApplicationDocumentsCollection();

    const [allUsers, allApplications, allDocuments] = await Promise.all([
      users.find({}).sort({ createdAt: -1 }).toArray(),
      applications.find({}).toArray(),
      documents.find({}).sort({ created_at: -1 }).toArray(),
    ]);

    const applicationsByUserId = new Map(
      allApplications.map((app) => [app.userId.toString(), app]),
    );
    const documentsByUserId = new Map<string, typeof allDocuments>();
    for (const doc of allDocuments) {
      const key = doc.userId.toString();
      const existing = documentsByUserId.get(key);
      if (existing) {
        existing.push(doc);
      } else {
        documentsByUserId.set(key, [doc]);
      }
    }

    return allUsers.map((user) => {
      const userId = user._id.toString();
      const app = applicationsByUserId.get(userId);
      const docs = documentsByUserId.get(userId) ?? [];

      return {
        userId,
        username: user.username,
        email: user.email,
        signedUpAt: user.createdAt.toISOString(),
        application: app
          ? {
              first_name: app.first_name,
              last_name: app.last_name,
              date_of_birth: app.date_of_birth,
              address: app.address,
              phone: app.phone,
              country: app.country,
              position: app.position,
              submitted: app.submitted,
              status: app.status ?? null,
              submitted_at: app.submitted_at ? app.submitted_at.toISOString() : null,
            }
          : null,
        documents: docs.map((d) => ({
          id: d._id.toString(),
          file_name: d.file_name,
          file_size: d.file_size,
          created_at: d.created_at.toISOString(),
        })),
      };
    });
  },
);

const updateStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
});

export const updateApplicationStatusFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/integrations/mongodb/auth.server");
    const { getApplicationsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    await requireAdmin();

    const applications = await getApplicationsCollection();
    const targetUserId = new ObjectId(data.userId);
    const app = await applications.findOne({ userId: targetUserId });
    if (!app) {
      throw new Error("Application not found.");
    }
    if (!app.submitted) {
      throw new Error("Cannot update an application that has not been submitted.");
    }

    await applications.updateOne(
      { userId: targetUserId },
      { $set: { status: data.status } },
    );

    return { ok: true };
  });

const documentUrlSchema = z.object({
  documentId: z.string().min(1),
});

export const getAdminDocumentUrlFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => documentUrlSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/integrations/mongodb/auth.server");
    const { getApplicationDocumentsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    await requireAdmin();

    const documents = await getApplicationDocumentsCollection();
    const doc = await documents.findOne({ _id: new ObjectId(data.documentId) });
    if (!doc) {
      throw new Error("Document not found.");
    }

    const { getDownloadUrl } = await import("@/integrations/r2/client.server");
    const url = await getDownloadUrl(doc.r2_key);
    return { url };
  });
