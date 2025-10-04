from scapy.all import Ether, IP, ICMP, wrpcap

pkt = Ether()/IP(src="10.0.0.2", dst="10.0.0.53")/ICMP(type=8)  # Echo request
wrpcap("/pcaps/icmp.pcap", [pkt])
print("Generated ICMP PCAP: /pcaps/icmp.pcap")
