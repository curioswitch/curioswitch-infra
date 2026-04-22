import { DataGoogleDnsManagedZone } from "@cdktn/provider-google/lib/data-google-dns-managed-zone/index.js";
import { DnsRecordSet } from "@cdktn/provider-google/lib/dns-record-set/index.js";
import { Construct } from "constructs";

export interface DnsConfig {
  project: string;
  domain: string;
}

export class Dns extends Construct {
  constructor(scope: Construct, config: DnsConfig) {
    super(scope, "dns");

    // Can't automatically provision due to https://github.com/hashicorp/terraform-provider-google/issues/16873
    // We also can't use the same configuration for dev and prod since root URLs have different settings.
    // Because this is technically temporary, assuming that gets fixed, we hackily branch on the domain rather
    // than parameterizing.
    if (config.project === "cookchat-dev") {
      const zone = new DataGoogleDnsManagedZone(this, "old-dns-zone", {
        project: config.project,
        name: "alpha-cookchat-curioswitch-org",
      });
      // Need to get details from console since we use a subdomain zone, GCP rejects CNAME records, likely
      // incorrectly.
      new DnsRecordSet(this, "root-hosting-a", {
        managedZone: zone.name,
        name: zone.dnsName,
        type: "A",
        ttl: 300,
        rrdatas: ["199.36.158.100"],
      });
      new DnsRecordSet(this, "root-hosting-txt", {
        managedZone: zone.name,
        name: zone.dnsName,
        type: "TXT",
        ttl: 300,
        rrdatas: ["hosting-site=cookchat-dev"],
      });
      new DnsRecordSet(this, "root-hosting-acme-txt", {
        managedZone: zone.name,
        name: `_acme-challenge.${zone.dnsName}`,
        type: "TXT",
        ttl: 300,
        rrdatas: ["rg0g57-If-Qw8sJcF1wfDkItG6BEXPgMT_OlW4US0f8"],
      });
    }
    if (config.domain === "alpha.coopii.app") {
      const zone = new DataGoogleDnsManagedZone(this, "dns-zone", {
        project: config.project,
        name: `${config.domain.replaceAll(".", "-")}`,
      });
      // Need to get details from console since we use a subdomain zone, GCP rejects CNAME records, likely
      // incorrectly.
      new DnsRecordSet(this, "root-firebase-a", {
        managedZone: zone.name,
        name: zone.dnsName,
        type: "A",
        ttl: 300,
        rrdatas: ["199.36.158.100"],
      });
      new DnsRecordSet(this, "root-firebase-txt", {
        managedZone: zone.name,
        name: zone.dnsName,
        type: "TXT",
        ttl: 300,
        rrdatas: ["hosting-site=cookchat-dev"],
      });
      new DnsRecordSet(this, "root-firebase-acme-txt", {
        managedZone: zone.name,
        name: `_acme-challenge.${zone.dnsName}`,
        type: "TXT",
        ttl: 300,
        rrdatas: ["2ns-OGpsxyD-9saUdwFNq9AKsF7ImNp1pRCtup5sNPs"],
      });
    }
  }
}
