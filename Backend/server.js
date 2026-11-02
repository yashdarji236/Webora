import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

import app from "./src/app.js";
import Connect from "./src/config/database.config.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  Connect().catch((err) => {
    console.warn("MongoDB initial connection error:", err.message);
  });
});
