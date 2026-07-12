FROM node:20-alpine AS web-build
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY scanner/ ./scanner/
COPY graph/ ./graph/
COPY api/ ./api/
COPY --from=web-build /app/dist ./web/dist

ENV API_PORT=8090
ENV API_RELOAD=false
ENV ALLOWED_ORIGINS=https://awsvisualizer.aminuiliyasu.com,http://localhost:5190

EXPOSE 8090
CMD ["python", "-m", "api.main"]
