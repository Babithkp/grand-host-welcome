import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";
import { z } from "zod";

const MAX_DOCUMENTS = 10;

export const listDocumentsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationDocumentsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const documents = await getApplicationDocumentsCollection();
    const docs = await documents
      .find({ userId })
      .sort({ created_at: -1 })
      .toArray();

    return docs.map((d) => ({
      id: d._id.toString(),
      file_name: d.file_name,
      file_size: d.file_size,
      created_at: d.created_at.toISOString(),
    }));
  },
);

const requestUploadSchema = z.object({
  file_name: z.string().min(1),
  content_type: z.string().min(1),
});

export const requestUploadFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => requestUploadSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationDocumentsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const documents = await getApplicationDocumentsCollection();
    const count = await documents.countDocuments({ userId });
    if (count >= MAX_DOCUMENTS) {
      throw new Error("You can upload a maximum of 10 documents.");
    }

    const { buildDocumentKey, getUploadUrl } = await import(
      "@/integrations/r2/client.server"
    );
    const key = buildDocumentKey(userId.toString(), data.file_name);
    const uploadUrl = await getUploadUrl(key, data.content_type);
    return { uploadUrl, key };
  });

const confirmUploadSchema = z.object({
  key: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().nonnegative(),
});

export const confirmUploadFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => confirmUploadSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationDocumentsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const documents = await getApplicationDocumentsCollection();
    await documents.insertOne({
      _id: new ObjectId(),
      userId,
      file_name: data.file_name,
      r2_key: data.key,
      file_size: data.file_size,
      created_at: new Date(),
    });
    return { ok: true };
  });

const deleteDocumentSchema = z.object({
  id: z.string().min(1),
});

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteDocumentSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationDocumentsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const documents = await getApplicationDocumentsCollection();
    const doc = await documents.findOne({
      _id: new ObjectId(data.id),
      userId,
    });
    if (!doc) {
      throw new Error("Document not found.");
    }

    const { deleteDocument } = await import("@/integrations/r2/client.server");
    await deleteDocument(doc.r2_key);
    await documents.deleteOne({ _id: doc._id });
    return { ok: true };
  });
