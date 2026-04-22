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
    const zone = new DataGoogleDnsManagedZone(this, "dns-zone", {
      project: config.project,
      name: `${config.domain.replaceAll(".", "-")}`,
    });

    // Can't automatically provision due to https://github.com/hashicorp/terraform-provider-google/issues/16873
    // We also can't use the same configuration for dev and prod since root URLs have different settings.
    // Because this is technically temporary, assuming that gets fixed, we hackily branch on the domain rather
    // than parameterizing.
    if (config.project === "curioswitch-dev") {
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
        rrdatas: ["hosting-site=curioswitch-dev"],
      });
      new DnsRecordSet(this, "root-hosting-acme-txt", {
        managedZone: zone.name,
        name: `_acme-challenge.${zone.dnsName}`,
        type: "TXT",
        ttl: 300,
        rrdatas: ["CPpw6UFgM8reBQRSP_7d608ORiHhIKLqt3wlSE_eeeU"],
      });
    }
    if (config.project === "curioswitch-prod") {
      new DnsRecordSet(this, "curioswitch-org", {
        managedZone: zone.name,
        name: "curioswitch.org.",
        type: "A",
        ttl: 300,
        rrdatas: ["199.36.158.100"],
      });

      new DnsRecordSet(this, "curioswitch-org-txt", {
        managedZone: zone.name,
        name: "curioswitch.org.",
        type: "TXT",
        ttl: 300,
        rrdatas: [
          '"google-site-verification=F1MEXE9dJl8B8ggcYK8-cD23Cnl70LyrGzzfUyqjYpg"',
          '"v=spf1 include:_spf.google.com ?all"',
          "hosting-site=curioswitch-prod",
        ],
      });

      new DnsRecordSet(this, "curioswitch-org-mx", {
        managedZone: zone.name,
        name: "curioswitch.org.",
        type: "MX",
        ttl: 3600,
        rrdatas: ["1 smtp.google.com."],
      });

      new DnsRecordSet(this, "developers-curioswitch-org", {
        managedZone: zone.name,
        name: "developers.curioswitch.org.",
        type: "CNAME",
        ttl: 300,
        rrdatas: ["curioswitch-developers.web.app."],
      });

      new DnsRecordSet(this, "heros-curioswitch-org", {
        managedZone: zone.name,
        name: "heros.curioswitch.org.",
        type: "A",
        ttl: 300,
        rrdatas: ["199.36.158.100"],
      });

      new DnsRecordSet(this, "google-_domainkey-curioswitch-org", {
        managedZone: zone.name,
        name: "google._domainkey.curioswitch.org.",
        type: "TXT",
        ttl: 3600,
        rrdatas: [
          '"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCe13ONTkQz3NoTITiTasjfnvTjLRPEK2ltwRW2CrPHqV3J0q0l0Hi7XcDxZ1dHw5ZZaNbv8M3VRJv7hrR2kO/QIQwqbsmNyd0wXoRmauQRp/sJpJBb4aGqCXe/4DplsfsuIAG1UEMIigL/7X0dRnae/ZJfywsEs37bzOacDI1OqwIDAQAB"',
        ],
      });

      new DnsRecordSet(this, "_dmarc", {
        managedZone: zone.name,
        name: "_dmarc.curioswitch.org.",
        type: "TXT",
        ttl: 3600,
        rrdatas: ['"v=DMARC1; p=none; rua=mailto:dmarc@curioswitch.org"'],
      });

      new DnsRecordSet(this, "vscode-marketplace", {
        managedZone: zone.name,
        name: "_visual-studio-marketplace-curioswitch.curioswitch.org.",
        type: "TXT",
        ttl: 3600,
        rrdatas: ["fc90e6aa-fe3f-4bd6-ac00-b840d589c7be"],
      });

      new DnsRecordSet(this, "aiceo-delegate-ns", {
        managedZone: zone.name,
        name: "minnano-shacho.curioswitch.org.",
        type: "NS",
        ttl: 21600,
        rrdatas: [
          "ns-cloud-e1.googledomains.com.",
          "ns-cloud-e2.googledomains.com.",
          "ns-cloud-e3.googledomains.com.",
          "ns-cloud-e4.googledomains.com.",
        ],
      });
    }
  }
}
