# Observability runbook

## Required signals

- JSON logs containing timestamp, severity, service, deployment environment,
  request ID, trace ID, operation, outcome, duration, and safe error details.
- RED metrics for request rate, errors, and duration at each HTTP boundary.
- USE metrics for utilization, saturation, and errors on infrastructure resources.
- Distributed traces across edge, API, background jobs, database calls, and
  external integrations.

Never log credentials, authorization headers, session tokens, personal data, or
raw request bodies by default.

## Request correlation

Caddy accepts or generates an edge request ID. Applications must validate and
propagate it as `x-request-id`, create a trace context when absent, and include
both identifiers in responses and structured logs. Background jobs must carry
the initiating trace or create a linked trace.

## Alert response

1. Confirm impact using health probes and error-rate/latency dashboards.
2. Correlate edge and application logs by request ID, then inspect the trace.
3. Record timeline, affected release and image digests, and mitigations.
4. Roll back through the deployment runbook when release causality is clear.
5. Create a blameless incident report and track corrective actions.
