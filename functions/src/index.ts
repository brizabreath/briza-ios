import {setGlobalOptions} from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import {defineSecret} from "firebase-functions/params";

setGlobalOptions({maxInstances: 10});

admin.initializeApp();

// ===== 0) Comment reply notifications (unchanged) =====
export const onCommentReplyCreate = onDocumentCreated(
  "videos/{videoId}/comments/{commentId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const videoId = event.params.videoId as string;
    const commentId = event.params.commentId as string;
    const data = snap.data() as any;

    const parentId = data.parentId;
    if (!parentId || typeof parentId !== "string") return;

    const replierUid = data.userId as string | undefined;
    const replierName = String(data.userName || data.name || "Someone");

    const parentPath = `videos/${videoId}/comments/${parentId}`;
    const parentRef = admin.firestore().doc(parentPath);
    const parentSnap = await parentRef.get();
    if (!parentSnap.exists) return;

    const parentData = parentSnap.data() as any;
    const parentUserId = parentData?.userId;

    if (!parentUserId || typeof parentUserId !== "string") return;
    if (replierUid && parentUserId === replierUid) return;

    const notifPath = `users/${parentUserId}/notifications/${commentId}`;
    const notifRef = admin.firestore().doc(notifPath);

    await notifRef.set(
      {
        type: "commentReply",
        videoId,
        replyCommentId: commentId,
        parentCommentId: parentId,
        replierUid: replierUid || null,
        replierName,
        seen: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    logger.info("Created comment reply notification", {
      videoId,
      commentId,
      parentId,
      parentUserId,
      replierUid,
    });
  }
);

// ===== Secrets / Config =====
const BREVO_API_KEY = defineSecret("BREVO_API_KEY");

// EN list (default) + PT list
const BREVO_NEWSLETTER_LIST_ID = 3; // EN
const BREVO_PT_NEWSLETTER_LIST_ID = 8; // PT

function isValidEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const e = email.trim();
  return e.includes("@") && e.includes(".") && e.length <= 254;
}

function desiredLangFromUserDoc(data: any): "EN" | "PT" {
  const lang = String(data?.language || "EN").toUpperCase();
  return lang === "PT" ? "PT" : "EN";
}

function listIdForLang(lang: "EN" | "PT"): number {
  return lang === "PT" ? BREVO_PT_NEWSLETTER_LIST_ID : BREVO_NEWSLETTER_LIST_ID;
}

async function brevoRequest(
  apiKey: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: any
) {
  const url = `https://api.brevo.com/v3${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = {raw: text};
  }

  if (!res.ok) {
    throw new Error(
      `Brevo API ${method} ${path} failed: 
      ${res.status} ${res.statusText} :: ${text}`
    );
  }

  return json;
}

export const addNewUserToNewsletterBrevo = onDocumentCreated(
  {document: "users/{uid}", secrets: [BREVO_API_KEY]},
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const uid = event.params.uid as string;
    const data = snap.data() as any;

    const email = data?.email;
    if (!isValidEmail(email)) {
      logger.info("addNewUserToNewsletterBrevo: "+
        "no valid email, skipping", {uid, email});
      return;
    }

    // Auto-subscribe new users
    if (data?.newsletterActive !== true) {
      await snap.ref.set({newsletterActive: true}, {merge: true});
    }

    const apiKey = BREVO_API_KEY.value();
    const lang = desiredLangFromUserDoc(data);

    await brevoRequest(apiKey, "POST", "/contacts", {
      email,
      attributes: {LANG: lang},
      updateEnabled: true,
    });

    logger.info("addNewUserToNewsletterBrevo: "+
      "ensured newsletterActive true + upserted contact", {
      uid,
      email,
      lang,
      hasLanguageField: data?.language != null,
    });
  }
);

export const syncNewsletterListsToBrevo = onDocumentUpdated(
  {document: "users/{uid}", secrets: [BREVO_API_KEY]},
  async (event) => {
    const before = event.data?.before?.data() as any;
    const after = event.data?.after?.data() as any;
    if (!before || !after) return;

    const email = after.email ?? before.email;
    if (!isValidEmail(email)) {
      logger.info("syncNewsletterListsToBrevo: "+
        "no valid email, skipping", {email});
      return;
    }

    const beforeLang = desiredLangFromUserDoc(before);
    const afterLang = desiredLangFromUserDoc(after);

    const beforeActive = !!before.newsletterActive;
    const afterActive = !!after.newsletterActive;

    const langChanged = beforeLang !== afterLang;
    const activeChanged = beforeActive !== afterActive;

    // Also run if email changed (rare, but safe)
    const emailChanged = (before.email ?? null) !== (after.email ?? null);

    if (!langChanged && !activeChanged && !emailChanged) return;

    const apiKey = BREVO_API_KEY.value();

    logger.info("syncNewsletterListsToBrevo: change detected", {
      email,
      beforeLang,
      afterLang,
      beforeActive,
      afterActive,
      emailChanged,
    });

    // Upsert contact with latest LANG
    await brevoRequest(apiKey, "POST", "/contacts", {
      email,
      attributes: {LANG: afterLang},
      updateEnabled: true,
    });

    // If unsubscribed -> ensure removed from BOTH lists
    if (!afterActive) {
      const errors: string[] = [];

      try {
        await brevoRequest(
          apiKey,
          "POST",
          `/contacts/lists/${BREVO_NEWSLETTER_LIST_ID}/contacts/remove`,
          {emails: [email]}
        );
      } catch (e: any) {
        errors.push("remove EN failed: " + String(e?.message || e));
      }

      try {
        await brevoRequest(
          apiKey,
          "POST",
          `/contacts/lists/${BREVO_PT_NEWSLETTER_LIST_ID}/contacts/remove`,
          {emails: [email]}
        );
      } catch (e: any) {
        errors.push("remove PT failed: " + String(e?.message || e));
      }

      if (errors.length) {
        logger.error("syncNewsletterListsToBrevo: "+
          "unsubscribe had errors", {email, errors});
        throw new Error(errors.join(" | "));
      }

      logger.info("syncNewsletterListsToBrevo: "+
        "unsubscribed removed from both lists", {email});
      return;
    }

    // Subscribed -> ensure exactly one list based on language
    const targetListId = listIdForLang(afterLang);
    const otherListId =
      targetListId === BREVO_NEWSLETTER_LIST_ID ?
        BREVO_PT_NEWSLETTER_LIST_ID :
        BREVO_NEWSLETTER_LIST_ID;

    await brevoRequest(
      apiKey,
      "POST",
      `/contacts/lists/${targetListId}/contacts/add`,
      {emails: [email]}
    );

    await brevoRequest(
      apiKey,
      "POST",
      `/contacts/lists/${otherListId}/contacts/remove`,
      {emails: [email]}
    );

    logger.info("syncNewsletterListsToBrevo: "+
      "subscribed ensured correct list", {
      email,
      afterLang,
      targetListId,
      otherListId,
    });
  }
);

export const syncNewsletterToBrevo = onDocumentUpdated(
  {document: "users/{uid}", secrets: [BREVO_API_KEY]},
  async (event) => {
    const before = event.data?.before?.data() as any;
    const after = event.data?.after?.data() as any;
    if (!before || !after) return;

    const beforeActive = !!before.newsletterActive;
    const afterActive = !!after.newsletterActive;

    // Only react when changed
    if (beforeActive === afterActive) return;

    const email = after.email ?? before.email;
    if (!isValidEmail(email)) {
      logger.info("syncNewsletterToBrevo: no valid email, skipping", {email});
      return;
    }

    const apiKey = BREVO_API_KEY.value();
    const lang = desiredLangFromUserDoc(after);
    const targetListId = listIdForLang(lang);

    // Upsert contact with LANG attribute
    await brevoRequest(apiKey, "POST", "/contacts", {
      email,
      attributes: {LANG: lang},
      updateEnabled: true,
    });

    if (afterActive) {
      // Add to correct language list
      await brevoRequest(
        apiKey,
        "POST",
        `/contacts/lists/${targetListId}/contacts/add`,
        {emails: [email]}
      );

      // Ensure removed from the other list
      const otherListId =
        targetListId === BREVO_NEWSLETTER_LIST_ID ?
          BREVO_PT_NEWSLETTER_LIST_ID :
          BREVO_NEWSLETTER_LIST_ID;

      await brevoRequest(
        apiKey,
        "POST",
        `/contacts/lists/${otherListId}/contacts/remove`,
        {emails: [email]}
      );

      logger.info("syncNewsletterToBrevo: subscribed,"+
        " added to correct list", {
        email,
        lang,
        listId: targetListId,
      });
    } else {
      // Remove from both lists (independent of language)
      await brevoRequest(
        apiKey,
        "POST",
        `/contacts/lists/${BREVO_NEWSLETTER_LIST_ID}/contacts/remove`,
        {emails: [email]}
      );
      await brevoRequest(
        apiKey,
        "POST",
        `/contacts/lists/${BREVO_PT_NEWSLETTER_LIST_ID}/contacts/remove`,
        {emails: [email]}
      );

      logger.info("syncNewsletterToBrevo: "+
        "unsubscribed, removed from both lists", {
        email,
      });
    }
  }
);
