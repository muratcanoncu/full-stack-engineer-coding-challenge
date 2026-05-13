FROM node:20-alpine

WORKDIR /app

# Copy the full workspace manifest set first so `yarn install` resolves every
# workspace package, not just the partner-portal one.
COPY package.json yarn.lock* tsconfig.base.json nx.json ./
COPY apps/services/auth-service/package.json ./apps/services/auth-service/
COPY apps/services/pricing-service/package.json ./apps/services/pricing-service/
COPY apps/partner-portal/package.json ./apps/partner-portal/
COPY libs/shared/auth/package.json ./libs/shared/auth/
COPY libs/shared/types/package.json ./libs/shared/types/

RUN yarn install --network-timeout 600000 --frozen-lockfile \
    || yarn install --network-timeout 600000

COPY apps/partner-portal ./apps/partner-portal
COPY libs ./libs

WORKDIR /app/apps/partner-portal
EXPOSE 4200

CMD ["yarn", "dev"]
