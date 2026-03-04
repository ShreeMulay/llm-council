FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# Copy source
COPY app/ ./app/

EXPOSE 8081
ENV PORT=8081

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8081"]
