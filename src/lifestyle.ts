import { authedFetch } from "./api";

export type LifestyleAuthor = { id: string; username: string | null; name: string; avatarUrl: string | null; verified?: boolean };

export type LifestylePost = {
  id: string;
  kind: "photo" | "video";
  caption: string;
  photo: string;
  createdAt: string;
  mine: boolean;
  author: LifestyleAuthor;
  likeCount: number;
  liked: boolean;
  commentCount: number;
};

async function send<T>(path: string, method: string, body: unknown, fallback: string): Promise<T> {
  try {
    return (await authedFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })) as T;
  } catch (e: any) {
    throw new Error(e?.message || fallback);
  }
}

export type LifestyleFeedPage = { posts: LifestylePost[]; nextBefore: string | null };

// Load more (M4548): pass the nextBefore from the last page. nextBefore is null on the last page.
export const apiLifestyleFeed = async (before?: string | null): Promise<LifestyleFeedPage> => {
  const r = await send<{ posts: LifestylePost[]; nextBefore?: string | null }>(
    before ? `/api/lifestyle/feed?before=${encodeURIComponent(before)}` : "/api/lifestyle/feed", "GET", undefined, "Could not load Lifestyle right now.");
  return { posts: r.posts || [], nextBefore: r.nextBefore || null };
};

export const apiLifestylePost = async (photo: string, caption?: string, kind: "photo" | "video" = "photo"): Promise<LifestylePost> =>
  (await send<{ post: LifestylePost }>("/api/lifestyle/posts", "POST", { photo, caption, kind }, "Could not post that right now.")).post;

export const apiLifestyleDelete = (id: string) =>
  send<{ ok: true }>(`/api/lifestyle/posts/${encodeURIComponent(id)}`, "DELETE", undefined, "Could not delete that post.");

export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

export type LifestyleComment = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  mine: boolean;
  author: LifestyleAuthor;
};
export type LifestyleCounts = { likeCount: number; liked: boolean; commentCount: number };

export const apiLifestyleLike = (id: string) =>
  send<LifestyleCounts>(`/api/lifestyle/posts/${encodeURIComponent(id)}/like`, "POST", {}, "Could not like that right now.");

export const apiLifestyleComments = async (id: string): Promise<LifestyleComment[]> =>
  (await send<{ comments: LifestyleComment[] }>(`/api/lifestyle/posts/${encodeURIComponent(id)}/comments`, "GET", undefined, "Could not load comments.")).comments;

export const apiLifestyleComment = (id: string, body: string) =>
  send<{ comment: LifestyleComment; commentCount: number }>(`/api/lifestyle/posts/${encodeURIComponent(id)}/comments`, "POST", { body }, "Could not post that comment.");

export const apiLifestyleCommentDelete = (commentId: string) =>
  send<{ ok: true; commentCount: number }>(`/api/lifestyle/comments/${encodeURIComponent(commentId)}`, "DELETE", undefined, "Could not delete that comment.");

export const LIFESTYLE_REPORT_REASONS: Array<{ key: "spam" | "nudity" | "harassment" | "other"; label: string }> = [
  { key: "spam", label: "Spam" },
  { key: "nudity", label: "Nudity" },
  { key: "harassment", label: "Harassment" },
  { key: "other", label: "Something else" },
];

export const apiLifestyleReport = (id: string, reason: string) =>
  send<{ ok: true }>(`/api/lifestyle/posts/${encodeURIComponent(id)}/report`, "POST", { reason }, "Could not send that report.");

export const apiLifestyleCommentReport = (commentId: string, reason: string) =>
  send<{ ok: true }>(`/api/lifestyle/comments/${encodeURIComponent(commentId)}/report`, "POST", { reason }, "Could not send that report.");

// Adds only the posts not already on screen, so a page is never shown twice.
export function mergeFeedPage(current: LifestylePost[], page: LifestylePost[]): LifestylePost[] {
  const seen = new Set(current.map((p) => p.id));
  return [...current, ...page.filter((p) => !seen.has(p.id))];
}

// One post, for opening the exact post from an alert (B323). A 404 means it is gone, hidden or no longer visible to you.
export const apiLifestyleGetPost = async (id: string): Promise<LifestylePost> =>
  (await send<{ post: LifestylePost }>(`/api/lifestyle/posts/${encodeURIComponent(id)}`, "GET", undefined, "That post is no longer available.")).post;

// Only plain ids may come from an alert payload.
export const isSafePostId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9._:-]{1,160}$/.test(v);
