FROM node:20-alpine

WORKDIR /app

# Copy the full workspace manifest set first so `yarn install` has a complete
# picture of every workspace package. Copying only some workspaces' package.json
# files causes yarn to stall trying to resolve workspaces it can't find.
COPY package.json yarn.lock* tsconfig.base.json nx.json ./
COPY apps/services/auth-service/package.json ./apps/services/auth-service/
COPY apps/services/pricing-service/package.json ./apps/services/pricing-service/
COPY apps/partner-portal/package.json ./apps/partner-portal/
COPY libs/shared/auth/package.json ./libs/shared/auth/
COPY libs/shared/types/package.json ./libs/shared/types/

# Network-friendly defaults. Falls back without --frozen-lockfile if the lock
# file is missing or out of sync.
RUN yarn install --network-timeout 600000 --frozen-lockfile \
    || yarn install --network-timeout 600000

# Source code last so an unchanged dep tree gets cached.
COPY apps/services/pricing-service ./apps/services/pricing-service
COPY libs ./libs

WORKDIR /app/apps/services/pricing-service
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["yarn", "start:dev"]
