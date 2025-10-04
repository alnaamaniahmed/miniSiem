# 🛡️ Mini SIEM

A lightweight **Security Information and Event Management (SIEM)** system built with **Suricata**, **OpenSearch**, and a **React + Node.js dashboard**.  
It detects simulated network threats (DNS, HTTP, ICMP, SSH, TLS) from PCAPs and displays live alerts in a web UI.

---

## 🌐 URLs

| Service | URL | Description |
|----------|-----|-------------|
| **Frontend (React)** | [http://localhost:5173](http://localhost:5173) | Web dashboard for alerts and blocking IPs |
| **API (Node.js)** | [http://localhost:3001](http://localhost:3001) | Backend REST API + SSE stream |
| **OpenSearch** | [http://localhost:9200](http://localhost:9200) | Database storing alerts and blocked IPs |

---

## ⚙️ Architecture Overview

### 🔹 Flow

1. **PCAP Generation (`pcapgen`)**  
   Generates fake malicious network packets (DNS, HTTP, ICMP, SSH, TLS).

2. **Suricata (IDS)**  
   Reads PCAPs, applies detection rules, and outputs alerts to `eve.json`.

3. **Ingest Service**  
   Reads `eve.json`, sends alerts to OpenSearch, and notifies API via SSE.

4. **OpenSearch**  
   Stores alerts and blocked IPs for querying and visualization.

5. **API (Node.js)**  
   Exposes REST endpoints and a live SSE stream for the frontend.

6. **Nginx (Frontend)**  
   Serves the React dashboard and proxies `/api/*` to the backend.

7. **Frontend (React)**  
   Displays alerts, allows searching/filtering, and blocking IPs.

---

## 🧩 Components

| Component | Description |
|------------|-------------|
| **pcapgen** | Python scripts that generate demo PCAP files with simulated attacks. |
| **suricata** | Intrusion detection system that analyzes PCAPs and produces JSON alerts. |
| **ingest** | Python service that ingests Suricata alerts into OpenSearch and pushes updates to the API. |
| **opensearch** | Search and analytics engine to index and query alerts. |
| **api** | Node.js backend that serves alert data and handles IP blocking logic. |
| **frontend** | React dashboard that shows real-time alerts and blocked IPs. |

---

## 🚀 Running Locally

```bash
docker compose up --build
```

Once all services start:
- Open [http://localhost:5173](http://localhost:5173)
- You should see live alerts from Suricata detections.

---

## 🧠 Features

- ✅ Suricata rules for 5 attack types: **DNS, HTTP, ICMP, SSH, TLS**
- ✅ Search & filtering by IP, signature, or protocol
- ✅ Pagination and sorting
- ✅ Manual IP blocking
- ✅ Responsive dashboard (built with ShadCN UI)
- ✅ Easy setup with Docker Compose

---

## 📦 Environment Variables

Create a `.env` file in the project root:

```
OPENSEARCH_URL=http://opensearch:9200
ALERTS_INDEX=suricata-logs
BLOCK_INDEX=blocked-ips
API_KEY=your_random_api_key
FRONTEND_ORIGIN=http://localhost:5173
VITE_API_URL=/api
VITE_API_KEY=your_random_api_key
```

---

## 🧾 Suricata Rules

Located in `suricata/suricata.rules`:

```
# DNS
alert dns any any -> any any (msg:"Demo DNS bad domain"; dns.query; content:"evil.test"; nocase; sid:1000001; rev:2;)

# ICMP
alert icmp any any -> any any (msg:"ICMP Echo Request"; itype:8; sid:1000002; rev:2;)

# HTTP
alert http any any -> any 80 (msg:"Demo HTTP bad host"; http.host; content:"bad.evil"; sid:1000003; rev:4;)

# TLS
alert tls any any -> any 443 (msg:"Demo TLS bad SNI"; tls.sni; content:"bad.tls.test"; nocase; sid:1000004; rev:2;)

# SSH
alert tcp any any -> any 22 (msg:"Demo SSH suspicious client banner"; flow:to_server; app-layer-protocol:ssh; content:"SSH-2.0-evil_client_1.0"; sid:1000005; rev:3;)
```

---

## 📊 Data Flow Summary

| Step | Component | Output |
|------|------------|---------|
| 1️⃣ | **pcapgen** | `/pcaps/*.pcap` |
| 2️⃣ | **suricata** | `/var/log/suricata/eve.json` |
| 3️⃣ | **ingest** | Index alerts to OpenSearch |
| 4️⃣ | **api** | Exposes alerts via REST and SSE |
| 5️⃣ | **frontend** | Displays alerts, supports blocking |

---

## 🧰 Tech Stack

- **Suricata** – Intrusion Detection System  
- **OpenSearch** – Alert indexing and querying  
- **Python** – PCAP generation and ingestion  
- **Node.js + Express** – API backend  
- **React + Vite** – Frontend dashboard  
- **Docker Compose** – Multi-container setup  

---

## ⚠️ Notes

- This is a **local demo SIEM**, not for production use.  
- No authentication, TLS, or log rotation implemented.  
- Works entirely offline on simulated data (PCAPs).

---

