"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { InboxConversation, InboxThread, SocialComment } from "@/features/shared/types";

type Envelope<T> = { success: boolean; data: T };

export interface ConversationFilter {
  status?: "open" | "closed";
  channel?: string;
  search?: string;
}

/** Meta inbox — `/api/admin/inbox/*` on the NestJS messaging module. */
export const inboxApi = createApi({
  reducerPath: "inboxApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Conversations", "Thread", "Comments", "Counts"],
  endpoints: (build) => ({
    getCounts: build.query<{ unreadConversations: number; openComments: number }, void>({
      query: () => "/admin/inbox/counts",
      transformResponse: (r: Envelope<{ unreadConversations: number; openComments: number }>) => r.data,
      providesTags: ["Counts"],
    }),
    getConversations: build.query<InboxConversation[], ConversationFilter>({
      query: (f) => ({ url: "/admin/inbox/conversations", params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }),
      transformResponse: (r: Envelope<InboxConversation[]>) => r.data,
      providesTags: ["Conversations"],
    }),
    getThread: build.query<InboxThread, string>({
      query: (id) => `/admin/inbox/conversations/${id}`,
      transformResponse: (r: Envelope<InboxThread>) => r.data,
      providesTags: (_r, _e, id) => [{ type: "Thread", id }],
    }),
    sendMessage: build.mutation<{ messageId: string; mode: string }, { conversationId: string; text: string }>({
      query: ({ conversationId, text }) => ({ url: `/admin/inbox/conversations/${conversationId}/messages`, method: "POST", body: { text } }),
      transformResponse: (r: Envelope<{ messageId: string; mode: string }>) => r.data,
      invalidatesTags: (_r, _e, a) => [{ type: "Thread", id: a.conversationId }, "Conversations"],
    }),
    setConversationStatus: build.mutation<void, { id: string; status: "open" | "closed" }>({
      query: ({ id, status }) => ({ url: `/admin/inbox/conversations/${id}`, method: "PATCH", body: { status } }),
      invalidatesTags: ["Conversations"],
    }),
    getComments: build.query<SocialComment[], { platform?: string; status?: string }>({
      query: (f) => ({ url: "/admin/inbox/comments", params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }),
      transformResponse: (r: Envelope<SocialComment[]>) => r.data,
      providesTags: ["Comments"],
    }),
    replyToComment: build.mutation<{ replyId: string }, { id: string; text: string; kind: "public" | "private" }>({
      query: ({ id, text, kind }) => ({ url: `/admin/inbox/comments/${id}/replies`, method: "POST", body: { text, kind } }),
      transformResponse: (r: Envelope<{ replyId: string }>) => r.data,
      invalidatesTags: ["Comments", "Counts"],
    }),
    patchComment: build.mutation<void, { id: string; hidden?: boolean; status?: "open" | "done" }>({
      query: ({ id, ...body }) => ({ url: `/admin/inbox/comments/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Comments", "Counts"],
    }),
  }),
});

export const {
  useGetCountsQuery,
  useGetConversationsQuery,
  useGetThreadQuery,
  useSendMessageMutation,
  useSetConversationStatusMutation,
  useGetCommentsQuery,
  useReplyToCommentMutation,
  usePatchCommentMutation,
} = inboxApi;
