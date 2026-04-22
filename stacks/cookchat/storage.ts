import { StorageBucket } from "@cdktn/provider-google/lib/storage-bucket/index.js";
import { StorageBucketIamMember } from "@cdktn/provider-google/lib/storage-bucket-iam-member/index.js";
import type { CurioStack } from "@curioswitch/cdktn-constructs";
import { Construct } from "constructs";

export interface StorageConfig {
  curiostack: CurioStack;
}

export class Storage extends Construct {
  public readonly publicFiles: StorageBucket;

  constructor(scope: Construct, config: StorageConfig) {
    super(scope, "storage");

    this.publicFiles = new StorageBucket(this, "public", {
      name: `${config.curiostack.project}-public`,
      location: config.curiostack.location.toUpperCase(),
    });

    new StorageBucketIamMember(this, "public-allusers", {
      bucket: this.publicFiles.name,
      role: "roles/storage.objectViewer",
      member: "allUsers",
    });
  }
}
