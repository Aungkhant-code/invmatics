# Build from the REPO ROOT:  docker build -f pdf-service/Dockerfile .
FROM python:3.12-slim

# WeasyPrint's native libraries + fonts (incl. Thai, since documents are for SEA businesses)
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libffi8 shared-mime-info \
      fonts-noto-core fonts-noto-ui-core fonts-thai-tlwg fontconfig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pdf-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pdf-service/main.py .
COPY backend/pdf_service.py .
COPY backend/templates ./templates

ENV PORT=8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
