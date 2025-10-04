import sys
from scapy.all import Ether, IP, UDP, DNS, DNSQR, wrpcap

out = sys.argv[1] if len(sys.argv) > 1 else "/pcaps/attacker.pcap"
pkt = Ether() / IP(src="10.0.0.2", dst="10.0.0.53") / UDP(sport=3333, dport=53) / DNS(rd=1, qd=DNSQR(qname="evil.test"))
wrpcap(out, [pkt])
print("Generated PCAP:", out)