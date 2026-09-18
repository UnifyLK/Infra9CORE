package main

import (
  "encoding/json"
  "log/slog"
  "net/http"
  "os"
)

func main() {
  logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
  mux := http.NewServeMux()
  mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "requestId": r.Header.Get("X-Request-Id")})
  })
  logger.Info("server_started", "address", ":8080")
  if err := http.ListenAndServe(":8080", mux); err != nil { logger.Error("server_stopped", "error", err); os.Exit(1) }
}
