import { DiscoveryEngineDataStore } from "@cdktn/provider-google/lib/discovery-engine-data-store/index.js";
import { DiscoveryEngineSearchEngine } from "@cdktn/provider-google/lib/discovery-engine-search-engine/index.js";
import { FirestoreDatabase } from "@cdktn/provider-google/lib/firestore-database/index.js";
import { FirestoreField } from "@cdktn/provider-google/lib/firestore-field/index.js";
import { FirestoreIndex } from "@cdktn/provider-google/lib/firestore-index/index.js";
import { ProjectService } from "@cdktn/provider-google/lib/project-service/index.js";
import { Construct } from "constructs";

export class Database extends Construct {
  public readonly searchEngine: DiscoveryEngineSearchEngine;

  constructor(scope: Construct) {
    super(scope, "database");

    const firestoreService = new ProjectService(this, "firestore", {
      service: "firestore.googleapis.com",
    });

    const discoveryEngineService = new ProjectService(
      this,
      "discovery-engine",
      {
        service: "discoveryengine.googleapis.com",
      },
    );

    // We use (default) database to take advantage of free tier.
    const db = new FirestoreDatabase(this, "firestore-db", {
      name: "(default)",
      locationId: "asia-northeast1",
      type: "FIRESTORE_NATIVE",
      dependsOn: [firestoreService],
    });

    new FirestoreIndex(this, "recipe-source-index", {
      database: db.name,
      collection: "recipes",
      fields: [
        {
          fieldPath: "source",
          order: "ASCENDING",
        },
        {
          fieldPath: "sourceId",
          order: "ASCENDING",
        },
      ],
    });

    new FirestoreIndex(this, "recipe-source-id-index", {
      database: db.name,
      collection: "recipes",
      fields: [
        {
          fieldPath: "source",
          order: "ASCENDING",
        },
        {
          fieldPath: "id",
          order: "ASCENDING",
        },
      ],
    });

    new FirestoreIndex(this, "recipe-id-source-index", {
      database: db.name,
      collection: "recipes",
      fields: [
        {
          fieldPath: "id",
          order: "ASCENDING",
        },
        {
          fieldPath: "source",
          order: "ASCENDING",
        },
      ],
    });

    new FirestoreField(this, "plans-id", {
      database: db.name,
      collection: "plans",
      field: "id",

      indexConfig: {
        indexes: [
          {
            order: "ASCENDING",
            queryScope: "COLLECTION_GROUP",
          },
        ],
      },
    });

    const recipesStore = new DiscoveryEngineDataStore(this, "discovery-store", {
      dataStoreId: "cookchat-recipes",
      displayName: "Cookchat Recipes",
      location: "global",
      industryVertical: "GENERIC",
      contentConfig: "NO_CONTENT",
      solutionTypes: ["SOLUTION_TYPE_SEARCH"],
      dependsOn: [discoveryEngineService],
    });

    this.searchEngine = new DiscoveryEngineSearchEngine(
      this,
      "recipe-search-engine",
      {
        engineId: "cookchat-recipes",
        displayName: "Cookchat Recipes",
        location: recipesStore.location,
        collectionId: "default_collection",
        dataStoreIds: [recipesStore.dataStoreId],
        searchEngineConfig: {},
      },
    );
  }
}
