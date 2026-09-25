package com.kaifdrop;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

/**
 * Scans the local platform's active NetworkInterface cards to isolate the proper local IPv4 address.
 * Architect: Khan Mohammed Kaif
 */
public class NetworkDiscovery {

    public static class InterfaceRecord {
        public final String name;
        public final String displayName;
        public final String ipAddress;
        public final boolean isLoopback;

        public InterfaceRecord(String name, String displayName, String ipAddress, boolean isLoopback) {
            this.name = name;
            this.displayName = displayName;
            this.ipAddress = ipAddress;
            this.isLoopback = isLoopback;
        }

        @Override
        public String toString() {
            return String.format("%s (%s) - %s", name, displayName, ipAddress);
        }
    }

    public static List<InterfaceRecord> discoverInterfaces() {
        List<InterfaceRecord> records = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            if (interfaces == null) return records;

            for (NetworkInterface netIf : Collections.list(interfaces)) {
                if (!netIf.isUp()) continue;

                Enumeration<InetAddress> addresses = netIf.getInetAddresses();
                for (InetAddress addr : Collections.list(addresses)) {
                    // Isolate IPv4 addresses only
                    if (addr instanceof java.net.Inet4Address) {
                        records.add(new InterfaceRecord(
                            netIf.getName(),
                            netIf.getDisplayName(),
                            addr.getHostAddress(),
                            addr.isLoopbackAddress()
                        ));
                    }
                }
            }
        } catch (SocketException e) {
            System.err.println("[NetworkDiscovery] Error querying interfaces: " + e.getMessage());
        }
        return records;
    }

    public static String isolatePrimaryIPv4() {
        List<InterfaceRecord> records = discoverInterfaces();
        // First try to find a non-loopback address on active Wi-Fi or Ethernet
        for (InterfaceRecord rec : records) {
            if (!rec.isLoopback && !rec.ipAddress.startsWith("127.")) {
                return rec.ipAddress;
            }
        }
        // Fallback to loopback if isolated
        return "127.0.0.1";
    }
}
