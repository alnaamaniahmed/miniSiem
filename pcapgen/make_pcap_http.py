from scapy.all import Ether, IP, TCP, Raw, wrpcap

pkts = []
src_ip = "10.0.0.2"
dst_ip = "10.0.0.80"

# Complete TCP handshake
syn = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=12345, dport=80, flags="S", seq=1000)
synack = Ether()/IP(src=dst_ip, dst=src_ip)/TCP(sport=80, dport=12345, flags="SA", seq=2000, ack=1001)
ack = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=12345, dport=80, flags="A", seq=1001, ack=2001)

# HTTP request (Host: bad.evil)
payload = b"GET / HTTP/1.1\r\nHost: bad.evil\r\nUser-Agent: curl/7.0\r\nConnection: close\r\n\r\n"
http = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=12345, dport=80, flags="PA", seq=1001, ack=2001)/Raw(load=payload)

# Response
resp = Ether()/IP(src=dst_ip, dst=src_ip)/TCP(sport=80, dport=12345, flags="PA", seq=2001, ack=1001+len(payload))/Raw(load=b"HTTP/1.1 200 OK\r\n\r\n")

pkts = [syn, synack, ack, http, resp]
wrpcap("/pcaps/http.pcap", pkts)
print("Generated HTTP PCAP")