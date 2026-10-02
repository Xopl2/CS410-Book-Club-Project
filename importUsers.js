//one-time script: copy the accounts in users.txt into MongoDB
//run with: node importUsers.js
const fs = require("fs");
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "bookclub";

async function importUsers() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const users = client.db(DB_NAME).collection("users");
    await users.createIndex({ username: 1 }, { unique: true });

    const lines = fs.readFileSync("users.txt", "utf8").split("\n");
    let added = 0;
    let skipped = 0;

    for (let line of lines) {
        line = line.trim();
        if (line === "") { //skip empty lines
            continue;
        }
        const parts = line.split(",");
        const username = parts[0];
        const hashedPassword = parts[1];

        //only add the user if they are not already in the database
        const result = await users.updateOne(
            { username: username },
            { $setOnInsert: { username: username, password: hashedPassword, role: "registered", createdAt: new Date() } },
            { upsert: true }
        );
        if (result.upsertedCount === 1) {
            added++;
        } else {
            skipped++;
        }
    }

    console.log("Imported " + added + " users (" + skipped + " were already in the database)");
    await client.close();
}

importUsers().catch(error => {
    console.error("Import failed. Is MongoDB running?");
    console.error(error);
    process.exit(1);
});
