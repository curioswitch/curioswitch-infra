import { ApikeysKey } from "@cdktn/provider-google/lib/apikeys-key/index.js";
import { CloudRunServiceIamMember } from "@cdktn/provider-google/lib/cloud-run-service-iam-member/index.js";
import { CloudTasksQueue } from "@cdktn/provider-google/lib/cloud-tasks-queue/index.js";
import { CloudTasksQueueIamMember } from "@cdktn/provider-google/lib/cloud-tasks-queue-iam-member/index.js";
import { DataGoogleKmsSecret } from "@cdktn/provider-google/lib/data-google-kms-secret/index.js";
import { ProjectIamCustomRole } from "@cdktn/provider-google/lib/project-iam-custom-role/index.js";
import { ProjectIamMember } from "@cdktn/provider-google/lib/project-iam-member/index.js";
import { SecretManagerSecret } from "@cdktn/provider-google/lib/secret-manager-secret/index.js";
import { SecretManagerSecretVersion } from "@cdktn/provider-google/lib/secret-manager-secret-version/index.js";
import { ServiceAccount } from "@cdktn/provider-google/lib/service-account/index.js";
import { ServiceAccountIamMember } from "@cdktn/provider-google/lib/service-account-iam-member/index.js";
import type { StorageBucket } from "@cdktn/provider-google/lib/storage-bucket/index.js";
import { StorageBucketIamMember } from "@cdktn/provider-google/lib/storage-bucket-iam-member/index.js";
import {
  type CurioStack,
  CurioStackService,
} from "@curioswitch/cdktn-constructs";
import { Construct } from "constructs";

import type { GcpServices } from "./gcp-services.js";

export interface AppsConfig {
  searchEngine: string;

  authorizedEmailsCiphertext?: string;
  openaiAPIKeyCiphertext: string;

  publicFilesBucket: StorageBucket;

  gcpServices: GcpServices;

  curiostack: CurioStack;
}

export class Apps extends Construct {
  constructor(scope: Construct, config: AppsConfig) {
    super(scope, "apps");

    const { project } = config.curiostack.config;

    const aiPredictor = new ProjectIamCustomRole(this, "ai-predictor", {
      project,
      roleId: "aiPredictor",
      title: "AI Predictor",
      description: "Permission to perform predictions with managed AI models.",
      permissions: [
        "aiplatform.endpoints.predict",
        "aiplatform.cachedContents.create",
      ],
    });

    const taskInvoker = new ServiceAccount(this, "task-invoker", {
      accountId: "task-invoker",
    });

    const tasksQueue = new CloudTasksQueue(this, "tasks-queue", {
      name: "tasks-queue",
      project,
      location: config.curiostack.config.location,
      stackdriverLoggingConfig: {
        samplingRatio: 1,
      },
      dependsOn: [config.gcpServices.cloudTasks],
    });

    const geminiApiKey = new ApikeysKey(this, "gemini-api-key", {
      project,
      name: "gemini-api",
      displayName: "Gemini API Key",
      restrictions: {
        apiTargets: [
          {
            service: "generativelanguage.googleapis.com",
          },
        ],
      },
      dependsOn: [config.gcpServices.apiKeys],
    });

    const geminiApiKeySecret = new SecretManagerSecret(
      this,
      "gemini-api-key-secret",
      {
        secretId: "gemini-api-key",
        replication: {
          auto: {},
        },
      },
    );
    const geminiApiKeySecretVersion = new SecretManagerSecretVersion(
      this,
      "gemini-api-key-secret-v1",
      {
        secret: geminiApiKeySecret.id,
        secretDataWo: geminiApiKey.keyString,
      },
    );

    const openaiAPIKey = new DataGoogleKmsSecret(this, "openai-api-key", {
      cryptoKey: `${config.curiostack.project}/global/terraform/secrets`,
      ciphertext: config.openaiAPIKeyCiphertext,
    });
    const openaiAPIKeySecret = new SecretManagerSecret(
      this,
      "openai-api-key-secret",
      {
        secretId: "openai-api-key",
        replication: {
          auto: {},
        },
      },
    );
    const openaiAPIKeySecretVersion = new SecretManagerSecretVersion(
      this,
      "openai-api-key-secret-v1",
      {
        secret: openaiAPIKeySecret.id,
        secretDataWo: openaiAPIKey.plaintext,
      },
    );

    const tasksServer = new CurioStackService(this, {
      name: "tasks-server",
      timeout: "600s",
      envSecrets: {
        GEMINI_API_KEY: geminiApiKeySecretVersion,
      },
      curiostack: config.curiostack,
    });

    new CloudRunServiceIamMember(this, "tasks-server-invoker", {
      service: tasksServer.run.name,
      role: "roles/run.invoker",
      member: taskInvoker.member,
    });

    new ProjectIamMember(this, "tasks-server-firestore", {
      project,
      role: "roles/datastore.user",
      member: tasksServer.serviceAccount.member,
    });

    new StorageBucketIamMember(this, "tasks-server-public-files", {
      bucket: config.publicFilesBucket.name,
      role: "roles/storage.objectUser",
      member: tasksServer.serviceAccount.member,
    });

    new ProjectIamMember(this, "tasks-server-vertexai", {
      project,
      role: aiPredictor.name,
      member: tasksServer.serviceAccount.member,
    });

    const frontendServerEnv: Record<string, string> = {
      SEARCH_ENGINE: config.searchEngine,
      TASKS_QUEUE: tasksQueue.id,
      TASKS_INVOKER: taskInvoker.email,
      TASKS_URL: tasksServer.run.uri,
    };
    if (config.authorizedEmailsCiphertext) {
      const decryptedEmails = new DataGoogleKmsSecret(
        this,
        "authorized-emails",
        {
          cryptoKey: `${config.curiostack.project}/global/terraform/secrets`,
          ciphertext: config.authorizedEmailsCiphertext,
        },
      );
      frontendServerEnv.AUTHORIZATION_EMAILS = decryptedEmails.plaintext;
    }

    const frontendServer = new CurioStackService(this, {
      name: "frontend-server",
      public: true,
      timeout: "300s",
      env: frontendServerEnv,
      envSecrets: {
        GEMINI_API_KEY: geminiApiKeySecretVersion,
        OPENAI_API_KEY: openaiAPIKeySecretVersion,
      },
      curiostack: config.curiostack,
    });

    new ProjectIamMember(this, "frontend-server-firestore", {
      project,
      role: "roles/datastore.user",
      member: frontendServer.serviceAccount.member,
    });

    new ProjectIamMember(this, "frontend-server-discovery-engine", {
      project,
      role: "roles/discoveryengine.user",
      member: frontendServer.serviceAccount.member,
    });

    new StorageBucketIamMember(this, "frontend-server-public-files", {
      bucket: config.publicFilesBucket.name,
      role: "roles/storage.objectUser",
      member: frontendServer.serviceAccount.member,
    });

    new ProjectIamMember(this, "frontend-server-vertexai", {
      project,
      role: aiPredictor.name,
      member: frontendServer.serviceAccount.member,
    });

    new ServiceAccountIamMember(this, "frontend-server-act-as-task-invoker", {
      serviceAccountId: taskInvoker.name,
      role: "roles/iam.serviceAccountUser",
      member: frontendServer.serviceAccount.member,
    });

    new CloudTasksQueueIamMember(this, "tasks-queue-invoker", {
      name: tasksQueue.name,
      role: "roles/cloudtasks.enqueuer",
      member: frontendServer.serviceAccount.member,
    });
  }
}
