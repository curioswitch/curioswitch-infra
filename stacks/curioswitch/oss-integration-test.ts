import { IdentityPlatformTenant } from "@cdktn/provider-google/lib/identity-platform-tenant/index.js";
import { ProjectIamMember } from "@cdktn/provider-google/lib/project-iam-member/index.js";
import { ServiceAccount } from "@cdktn/provider-google/lib/service-account/index.js";
import type { CurioStack } from "@curioswitch/cdktn-constructs";
import { Construct } from "constructs";

export interface OssIntegrationTestConfig {
  curiostack: CurioStack;
}

export class OssIntegrationTest extends Construct {
  constructor(scope: Construct, config: OssIntegrationTestConfig) {
    super(scope, "oss-integration-test");

    const itServiceAccount = new ServiceAccount(this, "integration-test", {
      accountId: "integration-test",
    });

    // For issuing Firebase custom tokens in tests.
    new ProjectIamMember(this, "integration-test-token-creator", {
      project: config.curiostack.project,
      role: "roles/iam.serviceAccountTokenCreator",
      member: itServiceAccount.member,
    });

    new IdentityPlatformTenant(this, "tenant-e2e-test", {
      displayName: "e2e-test",

      allowPasswordSignup: true,

      dependsOn: [config.curiostack.identity.platform],
    });
  }
}
