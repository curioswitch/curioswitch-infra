import { GoogleProvider } from "@cdktn/provider-google/lib/provider/index.js";
import { GoogleBetaProvider } from "@cdktn/provider-google-beta/lib/provider/index.js";
import { CurioStack, CurioStackHosting } from "@curioswitch/cdktn-constructs";
import { GcsBackend, TerraformStack } from "cdktn";
import type { Construct } from "constructs";

import { Dns } from "./dns.js";
import { OssIntegrationTest } from "./oss-integration-test.js";

export interface CurioSwitchConfig {
  environment: string;
  project: string;
  domain: string;
}

export class CurioSwitchStack extends TerraformStack {
  constructor(scope: Construct, config: CurioSwitchConfig) {
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

    const curiostack = new CurioStack(this, {
      project: config.project,
      location: "asia-northeast1",
      domain: config.domain,
      githubRepo: "curioswitch/curioswitch",
      identityMultiTenant: true,
      googleBeta,
    });

    new CurioStackHosting(this, {
      displayName: "CurioSwitch",
      curiostack,
    });

    new Dns(this, {
      project: config.project,
      domain: config.domain,
    });

    if (config.project === "curioswitch-dev") {
      new OssIntegrationTest(this, {
        curiostack,
      });
    }
  }
}
