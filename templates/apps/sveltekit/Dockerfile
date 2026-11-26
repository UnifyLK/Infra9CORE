ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE} AS build
ARG APP_PATH
ARG PACKAGE_MANAGER
WORKDIR /workspace
COPY . .
RUN case "${PACKAGE_MANAGER}" in \
      npm) npm ci ;; \
      pnpm) corepack enable && pnpm install --frozen-lockfile ;; \
      yarn) corepack enable && yarn install --immutable ;; \
      bun) npm install --global bun@{{PACKAGE_MANAGER_VERSION}} && bun install --frozen-lockfile ;; \
      *) echo "Unsupported package manager: ${PACKAGE_MANAGER}" >&2; exit 1 ;; \
    esac
RUN cd "${APP_PATH}" && case "${PACKAGE_MANAGER}" in \
      npm) npm run build ;; pnpm) pnpm run build ;; yarn) yarn run build ;; bun) bun run build ;; \
    esac

FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
ARG APP_PATH
COPY --from=build /workspace/${APP_PATH}/build ./build
COPY --from=build /workspace/${APP_PATH}/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "build/index.js"]
