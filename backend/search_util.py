"""Search text goes into PostgREST or_() filters: strip characters that could change the filter."""
import re


def clean_search(text) -> str:
    return re.sub(r"[,()%*\\:.]", " ", str(text or ""))[:100].strip()
