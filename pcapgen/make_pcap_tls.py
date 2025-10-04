from scapy.all import Ether, IP, TCP, Raw, wrpcap
import struct

pkts = []
src_ip = "10.0.0.2"
dst_ip = "10.0.0.53"

# TCP handshake
syn = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=12345, dport=443, flags="S", seq=1000)
synack = Ether()/IP(src=dst_ip, dst=src_ip)/TCP(sport=443, dport=12345, flags="SA", seq=2000, ack=1001)
ack = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=12345, dport=443, flags="A", seq=1001, ack=2001)

# TLS ClientHello with SNI extension
sni_name = b"bad.tls.test"
sni_ext = struct.pack("!HH", 0, len(sni_name) + 5) + struct.pack("!HB", len(sni_name) + 3, 0) + struct.pack("!H", len(sni_name)) + sni_name

# ClientHello
client_hello = (
    b"\x03\x03" +  # TLS 1.2
    b"\x00" * 32 +  # Random
    b"\x00" +  # Session ID length
    b"\x00\x02\x13\x01" +  # Cipher suites
    b"\x01\x00" +  # Compression methods
    struct.pack("!H", len(sni_ext)) + sni_ext  # Extensions
)

handshake = b"\x01" + struct.pack("!I", len(client_hello))[1:] + client_hello
tls_record = b"\x16\x03\x01" + struct.pack("!H", len(handshake)) + handshake

tls_pkt = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=12345, dport=443, flags="PA", seq=1001, ack=2001)/Raw(load=tls_record)

pkts = [syn, synack, ack, tls_pkt]
wrpcap("/pcaps/tls.pcap", pkts)
print("Generated TLS PCAP")