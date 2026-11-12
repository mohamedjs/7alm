/** Webhook bodies shaped after Meta's reference docs (read 2026-11-12). */
export const messengerText = {
  object: "page",
  entry: [
    {
      id: "PAGE_1",
      time: 1762934400000,
      messaging: [{ sender: { id: "PSID_9" }, recipient: { id: "PAGE_1" }, timestamp: 1762934400000, message: { mid: "m_abc", text: "السعر كام؟" } }],
    },
  ],
};

export const messengerEcho = {
  object: "page",
  entry: [
    {
      id: "PAGE_1",
      time: 1762934401000,
      messaging: [{ sender: { id: "PAGE_1" }, recipient: { id: "PSID_9" }, timestamp: 1762934401000, message: { mid: "m_echo", text: "349 جنيه", is_echo: true } }],
    },
  ],
};

export const messengerDelivery = {
  object: "page",
  entry: [{ id: "PAGE_1", time: 1, messaging: [{ sender: { id: "PSID_9" }, recipient: { id: "PAGE_1" }, timestamp: 1762934402000, delivery: { mids: ["m_out_1"], watermark: 1762934402000 } }] }],
};

export const facebookComment = {
  object: "page",
  entry: [
    {
      id: "PAGE_1",
      time: 1762934500,
      changes: [
        {
          field: "feed",
          value: {
            from: { id: "USER_5", name: "Mona Ali" },
            item: "comment",
            verb: "add",
            comment_id: "POST_7_COMMENT_3",
            post_id: "PAGE_1_POST_7",
            parent_id: "PAGE_1_POST_7",
            message: "متاح توصيل اسكندرية؟",
            created_time: 1762934500,
          },
        },
        { field: "feed", value: { item: "reaction", verb: "add", post_id: "PAGE_1_POST_7", reaction_type: "like" } },
      ],
    },
  ],
};

export const instagramDm = {
  object: "instagram",
  entry: [{ id: "IG_1", time: 1762934600000, messaging: [{ sender: { id: "IGSID_4" }, recipient: { id: "IG_1" }, timestamp: 1762934600000, message: { mid: "ig_mid_1", text: "hi" } }] }],
};

/** Facebook Login for Business shape: `comment_id`. */
export const instagramCommentFbLogin = {
  object: "instagram",
  entry: [{ id: "IG_1", time: 1762934700, changes: [{ field: "comments", value: { from: { id: "IGU_2", username: "sara.m" }, comment_id: "IGC_1", text: "بكام؟", media: { id: "MEDIA_1" } } }] }],
};

/** Business Login for Instagram shape: `id`. */
export const instagramCommentIgLogin = {
  object: "instagram",
  entry: [{ id: "IG_1", time: 1762934701, changes: [{ field: "comments", value: { from: { id: "IGU_3", username: "omar" }, id: "IGC_2", text: "😍", media: { id: "MEDIA_1", media_product_type: "FEED" } } }] }],
};

export const whatsappText = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA_1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "201000000000", phone_number_id: "PNID_1" },
            contacts: [{ profile: { name: "Ahmed" }, wa_id: "201012345678" }],
            messages: [{ from: "201012345678", id: "wamid.AAA", timestamp: "1749416383", type: "text", text: { body: "عايز اطلب" } }],
          },
        },
      ],
    },
  ],
};

export const whatsappUsernameOnly = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA_1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "201000000000", phone_number_id: "PNID_1" },
            contacts: [{ profile: { name: "Hidden" }, user_id: "BSUID_77" }],
            messages: [{ from_user_id: "BSUID_77", id: "wamid.BBB", timestamp: "1749416390", type: "image", image: { id: "MEDIA_9", caption: "ده المقاس" } }],
          },
        },
      ],
    },
  ],
};

export const whatsappStatuses = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA_1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "201000000000", phone_number_id: "PNID_1" },
            statuses: [
              { id: "wamid.OUT1", status: "delivered", timestamp: "1750263773", recipient_id: "201012345678" },
              { id: "wamid.OUT2", status: "failed", timestamp: "1750263774", recipient_id: "201012345678", errors: [{ code: 131047, title: "Re-engagement message" }] },
            ],
          },
        },
      ],
    },
  ],
};
