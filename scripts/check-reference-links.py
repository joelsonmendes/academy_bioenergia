#!/usr/bin/env python3
"""Check public reference links with GET, redirects, and basic content checks.

Uses only the Python standard library and the environment's proxy/CA settings.
Example: python3 scripts/check-reference-links.py --input src/references.json
"""
import argparse
import concurrent.futures
import datetime
import html
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.request


def check(item):
    started = time.monotonic()
    row = {"reference_id": item["id"], "role": item["role"], "url": item["url"]}
    request = urllib.request.Request(item["url"], headers={
        "User-Agent": "Mozilla/5.0 (compatible; BioEnergiaReferenceReview/2.0)",
        "Accept": "text/html,application/pdf;q=0.9,*/*;q=0.8",
    })
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            # Read enough to distinguish a document from an empty/error page.
            sample = response.read(524288)
            content_type = response.headers.get("Content-Type", "")
            text = sample.decode("utf-8", errors="replace")
            title = re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
            title = html.unescape(re.sub(r"\s+", " ", title.group(1)).strip()) if title else None
            is_pdf = sample.startswith(b"%PDF-")
            error_title = bool(title and re.search(
                r"(^|\b)(404|403|not found|access denied|forbidden|just a moment|page not found|página não encontrada|site unavailable|service unavailable|temporarily unavailable)(\b|$)",
                title, re.I))
            expected_pdf = ".pdf" in item["url"].split("?")[0].lower()
            passed = (200 <= response.status < 300 and bool(sample) and not error_title
                      and (not expected_pdf or is_pdf))
            row.update(status=response.status, final_url=response.url, content_type=content_type,
                       sampled_bytes=len(sample), title=title, pdf_signature=is_pdf,
                       passed=passed, result="content_received" if passed else "review_content")
    except urllib.error.HTTPError as error:
        row.update(status=error.code, final_url=error.url, passed=False,
                   result="http_error", error=str(error))
    except Exception as error:
        row.update(status=None, passed=False, result="transport_error",
                   error=f"{type(error).__name__}: {error}")
    row["elapsed_seconds"] = round(time.monotonic() - started, 2)
    return row


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="src/references.json")
    parser.add_argument("--output", default="docs/LINKS_VERIFICADOS.json")
    args = parser.parse_args()
    catalog = json.loads(Path(args.input).read_text())
    items = []
    for reference in catalog:
        items.append({"id": reference["id"], "role": "primary", "url": reference["url"]})
        if reference.get("alternateUrl"):
            items.append({"id": reference["id"], "role": "alternative", "url": reference["alternateUrl"]})
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        rows = list(pool.map(check, items))
    report = {
        "checked_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "method": "HTTPS GET, follows redirects; checks status, content and PDF signature when relevant",
        "limitations": "A successful response is a point-in-time check, not a guarantee of future availability. Subject relevance is reviewed separately.",
        "references": len(catalog), "links": len(rows),
        "passed": sum(row["passed"] for row in rows),
        "failed": sum(not row["passed"] for row in rows), "results": rows,
    }
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    for row in rows:
        print(f"{row['reference_id']:18s} {row['role']:11s} {str(row['status']):4s} {'OK' if row['passed'] else 'REVIEW'} {row.get('title') or row.get('error') or row.get('content_type')}")
    print(json.dumps({key: report[key] for key in ("references", "links", "passed", "failed")}))
    return 1 if report["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
