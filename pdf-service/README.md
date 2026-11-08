# PDF service

Renders the document PDFs (quotation, invoice, delivery order, delivery confirmation, receipt).
Vercel can't run WeasyPrint (no Pango), so the main API calls this service.

## Deploy on Render
Web Service -> Docker. Dockerfile path `pdf-service/Dockerfile`, build context = repo root,
health check `/health`, env var `PDF_SERVICE_SECRET` (any long random string).

In Vercel (Production) set:
- `PDF_SERVICE_URL`    = the Render URL, e.g. https://invmatics-pdf.onrender.com
- `PDF_SERVICE_SECRET` = the same secret
then redeploy.

Free-tier Render sleeps when idle: the first PDF after a quiet spell can take ~30-50 s.

## Check
`curl https://<service>/health` -> {"status":"ok"}
