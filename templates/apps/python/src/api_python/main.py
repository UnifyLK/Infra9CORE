from uuid import uuid4

from fastapi import FastAPI, Request

app = FastAPI(title="{{PROJECT_NAME}} API")

@app.get("/health")
async def health(request: Request) -> dict[str, str]:
    return {"status": "ok", "requestId": request.headers.get("x-request-id", str(uuid4()))}
