import { GithubProvider } from "@cdktn/provider-github/lib/provider/index.js";
import { DataGoogleBillingAccount } from "@cdktn/provider-google/lib/data-google-billing-account/index.js";
import { DataGoogleOrganization } from "@cdktn/provider-google/lib/data-google-organization/index.js";
import { GoogleProvider } from "@cdktn/provider-google/lib/provider/index.js";
import { GoogleBetaProvider } from "@cdktn/provider-google-beta/lib/provider/index.js";
import { RandomProvider } from "@cdktn/provider-random/lib/provider/index.js";
import { Bootstrap } from "@curioswitch/cdktn-constructs";
import { GcsBackend, TerraformStack } from "cdktn";
import type { Construct } from "constructs";

export class SysadminStack extends TerraformStack {
  constructor(scope: Construct) {
    super(scope, "sysadmin");

    new GithubProvider(this, "github", {
      owner: "curioswitch",
    });

    new GoogleProvider(this, "google", {
      project: "curioswitch-sysadmin",
      region: "asia-northeast1",
    });

    new RandomProvider(this, "random");

    const googleBeta = new GoogleBetaProvider(this, "google-beta", {
      project: "curioswitch-sysadmin",
      region: "asia-northeast1",
    });

    const org = new DataGoogleOrganization(this, "curioswitch-org", {
      domain: "curioswitch.org",
    });

    const billing = new DataGoogleBillingAccount(this, "curioswitch-billing", {
      displayName: "curioswitch-billing",
    });

    const bootstrap = new Bootstrap(this, {
      name: "curioswitch",
      organizationId: org.orgId,
      billingAccountId: billing.id,
      githubOrg: "curioswitch",
      domain: "curioswitch.org",
      appRepositoryConfig: {
        description: "The CurioSwitch landing page",
        hasIssues: true,
        hasProjects: true,
        hasWiki: false,
        homepageUrl: "https://curioswitch.org",
      },
      googleBeta,
    });

    new GcsBackend(this, {
      bucket: bootstrap.sysadminProject.tfstateBucketName,
    });
  }
}
