FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock* tsconfig.base.json nx.json ./
COPY apps/services/auth-service/package.json ./apps/services/auth-service/
COPY apps/services/pricing-service/package.json ./apps/services/pricing-service/
COPY apps/admin-portal/package.json ./apps/admin-portal/
COPY apps/partner-portal/package.json ./apps/partner-portal/
COPY libs/shared/auth/package.json ./libs/shared/auth/
COPY libs/shared/types/package.json ./libs/shared/types/

RUN yarn install --network-timeout 600000 --frozen-lockfile \
    || yarn install --network-timeout 600000

COPY apps/admin-portal ./apps/admin-portal
COPY libs ./libs

WORKDIR /app/apps/admin-portal
EXPOSE 4201

CMD ["yarn", "dev"]
