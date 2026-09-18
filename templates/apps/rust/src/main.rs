use axum::{routing::get, Json, Router};
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Health { status: &'static str, request_id: Uuid }

#[tokio::main]
async fn main() {
    let app = Router::new().route("/health", get(|| async { Json(Health { status: "ok", request_id: Uuid::new_v4() }) }));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
