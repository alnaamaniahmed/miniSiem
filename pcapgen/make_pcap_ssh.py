from scapy.all import Ether, IP, TCP, Raw, wrpcap

pkts = []
src_ip = "10.0.0.2"
dst_ip = "10.0.0.22"

# TCP handshake
syn = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=12345, dport=22, flags="S", seq=1000)
synack = Ether()/IP(src=dst_ip, dst=src_ip)/TCP(sport=22, dport=12345, flags="SA", seq=2000, ack=1001)
ack = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=12345, dport=22, flags="A", seq=1001, ack=2001)

# Server banner first (normal SSH flow)
server_banner = b"SSH-2.0-OpenSSH_8.0\r\n"
srv = Ether()/IP(src=dst_ip, dst=src_ip)/TCP(sport=22, dport=12345, flags="PA", seq=2001, ack=1001)/Raw(load=server_banner)

# Client banner (malicious)
client_banner = b"SSH-2.0-evil_client_1.0\r\n"
cli = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=12345, dport=22, flags="PA", seq=1001, ack=2001+len(server_banner))/Raw(load=client_banner)

pkts = [syn, synack, ack, srv, cli]
wrpcap("/pcaps/ssh.pcap", pkts)
print("Generated SSH PCAP ✅")