FROM rust:1.88-slim AS build
WORKDIR /src
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=build /src/target/release/{{PROJECT_SLUG}}-api-rust /server
EXPOSE 8080
USER 65532:65532
ENTRYPOINT ["/server"]
