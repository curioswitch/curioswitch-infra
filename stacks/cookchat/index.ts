import { GoogleProvider } from "@cdktn/provider-google/lib/provider/index.js";
import { GoogleFirebaseHostingCustomDomain } from "@cdktn/provider-google-beta/lib/google-firebase-hosting-custom-domain/index.js";
import { GoogleBetaProvider } from "@cdktn/provider-google-beta/lib/provider/index.js";
import { CurioStack, CurioStackHosting } from "@curioswitch/cdktn-constructs";
import { GcsBackend, TerraformStack } from "cdktn";
import type { Construct } from "constructs";

import { Apps } from "./apps.js";
import { Database } from "./database.js";
import { Dns } from "./dns.js";
import { GcpServices } from "./gcp-services.js";
import { Identity } from "./identity.js";
import { Storage } from "./storage.js";

export interface CookchatConfig {
  environment: string;
  project: string;
  domain: string;
  googleAuthClientId: string;
  googleAuthClientSecretCiphertext: string;

  authorizedEmailsCiphertext?: string;
  openaiAPIKeyCiphertext: string;
}

export class CookchatStack extends TerraformStack {
  constructor(scope: Construct, config: CookchatConfig) {
    super(scope, config.environment);

    new GcsBackend(this, {
      bucket: `${config.project}-tfstate`,
    });

    new GoogleProvider(this, "google", {
      project: config.project,
      region: "asia-northeast1",
      userProjectOverride: true,
    });

    const googleBeta = new GoogleBetaProvider(this, "google-beta", {
      project: config.project,
      region: "asia-northeast1",
      userProjectOverride: true,
    });

    const gcpServices = new GcpServices(this, {
      project: config.project,
    });

    const curiostack = new CurioStack(this, {
      project: config.project,
      location: "asia-northeast1",
      domain: config.domain,
      githubRepo: "curioswitch/cookchat",
      googleBeta,
    });

    const database = new Database(this);

    const storage = new Storage(this, {
      curiostack,
    });

    new Apps(this, {
      searchEngine: database.searchEngine.name,
      authorizedEmailsCiphertext: config.authorizedEmailsCiphertext,
      openaiAPIKeyCiphertext: config.openaiAPIKeyCiphertext,
      publicFilesBucket: storage.publicFiles,
      gcpServices,
      curiostack,
    });

    new CurioStackHosting(this, {
      displayName: "Cookchat",
      curiostack,
    });

    new GoogleFirebaseHostingCustomDomain(this, "old-custom-domain", {
      siteId: config.project,
      customDomain: "alpha.cookchat.curioswitch.org",
      provider: googleBeta,
    });

    new Dns(this, {
      project: config.project,
      domain: config.domain,
    });

    new Identity(this, {
      project: config.project,
      domain: config.domain,
      googleAuthClientId: config.googleAuthClientId,
      googleAuthClientSecretCiphertext: config.googleAuthClientSecretCiphertext,
    });
  }
}
