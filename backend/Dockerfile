# ---------- Stage 1: Build ----------
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml README.md ./
COPY app/ ./app/

# Install Python dependencies and pre-download tiktoken encodings
ENV TIKTOKEN_CACHE_DIR=/app/tiktoken_cache
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir . \
    && playwright install chromium --with-deps \
    && mkdir -p /app/tiktoken_cache \
    && python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')"

# ---------- Stage 2: Runtime ----------
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install system dependencies for Playwright and Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    wget \
    gnupg \
    libnss3 \
    libatk-bridge2.0-0 \
    libxss1 \
    libgtk-3-0 \
    libasound2 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 --shell /bin/bash appuser

# Copy installed packages and playwright browsers from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

# Copy pre-downloaded tiktoken encodings
ENV TIKTOKEN_CACHE_DIR=/app/tiktoken_cache
COPY --from=builder /app/tiktoken_cache /app/tiktoken_cache

# Copy application code
COPY . .

# Ensure uploads directory exists
RUN mkdir -p /app/uploads

# EXPOSE 8000

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
