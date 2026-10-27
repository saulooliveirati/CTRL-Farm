import { Global, Module } from "@nestjs/common";
import { FirebaseService } from "./firebase.service.js";
import { FirebaseStorageService } from "./firebase-storage.service.js";
import { FirebaseLicenseSyncService } from "./firebase-license-sync.service.js";

@Global()
@Module({
  providers: [FirebaseService, FirebaseStorageService, FirebaseLicenseSyncService],
  exports: [FirebaseService, FirebaseStorageService, FirebaseLicenseSyncService],
})
export class FirebaseModule {}
