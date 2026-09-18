Deno.serve((request: Request) => {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  return Response.json(
    { status: "ok", requestId },
    {
      headers: {
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
    },
  );
});
