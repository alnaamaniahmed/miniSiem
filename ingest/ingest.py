import os
import time
import json
import requests
from typing import List, Iterable

OPENSEARCH_URL = os.environ.get("OPENSEARCH_URL", "http://opensearch:9200").rstrip("/")
INDEX_NAME = os.environ.get("INDEX_NAME", "suricata-logs")
EVE_PATH = os.environ.get("EVE_PATH", "/var/log/suricata/eve.json")
API_URL = os.environ.get("API_URL")
API_KEY = os.environ.get("API_KEY")

S = requests.Session()
S.headers.update({"User-Agent": "minisiem-ingest/1.0"})


def sleep(s):
    time.sleep(s)


def wait_for_opensearch(timeout_s: int = 120):
    deadline = time.time() + timeout_s
    url = f"{OPENSEARCH_URL}/"
    while time.time() < deadline:
        try:
            r = S.get(url, timeout=3)
            if r.ok:
                return
        except requests.RequestException:
            pass
        sleep(2)
    raise RuntimeError(f"OpenSearch not reachable at {OPENSEARCH_URL}")


def ensure_index():
    head = S.head(f"{OPENSEARCH_URL}/{INDEX_NAME}", timeout=5)
    if head.status_code == 404:
        payload = {
            "settings": {"index": {"number_of_shards": 1}},
            "mappings": {
                "properties": {
                    "timestamp": {"type": "date"},
                    "src_ip": {"type": "ip"},
                    "dest_ip": {"type": "ip"},
                    "alert": {"type": "object", "enabled": True},
                }
            },
        }
        r = S.put(f"{OPENSEARCH_URL}/{INDEX_NAME}", json=payload, timeout=10)
        r.raise_for_status()


def bulk_ndjson(docs: Iterable[dict], index: str) -> str:
    lines = []
    for d in docs:
        lines.append(json.dumps({"index": {"_index": index}}))
        lines.append(json.dumps(d))
    return "\n".join(lines) + ("\n" if lines else "")


def opensearch_bulk(docs: List[dict]):
    if not docs:
        return
    data = bulk_ndjson(docs, INDEX_NAME)
    r = S.post(
        f"{OPENSEARCH_URL}/_bulk",
        data=data,
        headers={"Content-Type": "application/x-ndjson"},
        timeout=15,
    )
    r.raise_for_status()
    resp = r.json()
    if resp.get("errors"):
        for item in resp.get("items", []):
            if "index" in item and item["index"].get("error"):
                print("Bulk item error:", item["index"]["error"])
                break


def notify_api(alert: dict):
    if not API_URL or not API_KEY:
        return
    try:
        S.post(
            f"{API_URL.rstrip('/')}/alert",
            json=alert,
            headers={"x-api-key": API_KEY},
            timeout=1.5,
        )
    except requests.RequestException:
        pass


def only_alerts(obj: dict) -> bool:
    return obj.get("event_type") == "alert"


def read_existing(file_path: str, batch_size: int = 1000):
    if not os.path.exists(file_path):
        return
    batch = []
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if only_alerts(obj):
                batch.append(obj)
                if len(batch) >= batch_size:
                    opensearch_bulk(batch)
                    for a in batch:
                        notify_api(a)
                    batch = []
    if batch:
        opensearch_bulk(batch)
        for a in batch:
            notify_api(a)


def tail_file(file_path: str):
    while not os.path.exists(file_path):
        sleep(0.5)
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        f.seek(0, os.SEEK_END)
        buf = []
        while True:
            line = f.readline()
            if not line:
                sleep(0.5)
                continue
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                buf.append(line)
                try:
                    obj = json.loads("".join(buf))
                    buf.clear()
                    yield obj
                except json.JSONDecodeError:
                    if len(buf) > 1000:
                        buf.clear()
                    continue


def main():
    print(f"[ingest] OPENSEARCH_URL={OPENSEARCH_URL}")
    print(f"[ingest] INDEX_NAME={INDEX_NAME}")
    print(f"[ingest] EVE_PATH={EVE_PATH}")
    if API_URL:
        print(f"[ingest] API_URL={API_URL} (SSE notify enabled)")
    else:
        print(f"[ingest] API_URL not set (SSE notify disabled)")

    wait_for_opensearch()
    ensure_index()
    read_existing(EVE_PATH)

    batch = []
    last_flush = time.time()
    for obj in tail_file(EVE_PATH):
        if only_alerts(obj):
            batch.append(obj)
            notify_api(obj)
        now = time.time()
        if len(batch) >= 200 or (batch and now - last_flush > 1.5):
            try:
                opensearch_bulk(batch)
            except requests.RequestException as e:
                print("[ingest] bulk error:", str(e))
                sleep(1.0)
                try:
                    opensearch_bulk(batch)
                except Exception as e2:
                    print(
                        "[ingest] bulk failed again, dropping batch of",
                        len(batch),
                        ":",
                        str(e2),
                    )
            batch.clear()
            last_flush = now


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[ingest] interrupted, exiting.")
