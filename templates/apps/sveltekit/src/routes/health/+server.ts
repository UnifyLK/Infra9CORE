import { json } from "@sveltejs/kit";

export const GET = ({ request }) => json({ status: "ok", requestId: request.headers.get("x-request-id") ?? crypto.randomUUID() });
