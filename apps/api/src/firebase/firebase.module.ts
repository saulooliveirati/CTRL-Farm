import { Global, Module } from "@nestjs/common";
import { FirebaseService } from "./firebase.service.js";
import { FirebaseStorageService } from "./firebase-storage.service.js";
import { FirebaseFirestoreService } from "./firebase-firestore.service.js";
import { FirebaseMessagingService } from "./firebase-messaging.service.js";
import { FirebaseSyncService } from "./firebase-sync.service.js";
import { FirebaseController } from "./firebase.controller.js";

@Global()
@Module({
  controllers: [FirebaseController],
  providers: [
    FirebaseService,
    FirebaseStorageService,
    FirebaseFirestoreService,
    FirebaseMessagingService,
    FirebaseSyncService,
  ],
  exports: [
    FirebaseService,
    FirebaseStorageService,
    FirebaseFirestoreService,
    FirebaseMessagingService,
    FirebaseSyncService,
  ],
})
export class FirebaseModule {}
