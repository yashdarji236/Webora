
import app from "./src/app.js";
import Connect from "./src/config/database.config.js";

const PORT = process.env.PORT || 5000;
await Connect();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})