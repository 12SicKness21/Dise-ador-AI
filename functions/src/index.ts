import * as admin from "firebase-admin";

// Inicializar Admin SDK una sola vez
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export { processUpload } from "./processUpload";
export { adminCreateUser, adminDeleteUser } from "./adminUsers";
