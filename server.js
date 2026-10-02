const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");

//MongoDB connection settings (can be changed with environment variables)
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "bookclub";
const PORT = process.env.PORT || 3000;

const mongoClient = new MongoClient(MONGO_URI);
let usersCollection; //set once we connect to MongoDB (see startServer at the bottom)
let sessionsCollection; //logged in sessions, also set in stateServer
const SESSION_DAYS = 7; //how long a login lasts before the user has to log in again

//encode/hash a password
async function encodePassword(plainTextPassword) {
    const saltNum = 10;
    //generate a salt and hash the password
    const hashedPassword = await bcrypt.hash(
        plainTextPassword,
        saltNum
    );
    return hashedPassword; //return the hashed/erncrypted password
}


//helper function to check if a username is available
async function nameAvailable(username) {
    //look for a user with this username in the database
    const existingUser = await usersCollection.findOne({ username: username });
    return existingUser === null; //available if no user was found
}
//helper function to check if a username and password are correct
async function loginUser(username, password) {
    //look up the user in the database
    const user = await usersCollection.findOne({ username: username });
    if (user === null) { //username not found
        return false;
    }
    //compare the password with the hashed password stored in the database
    return await bcrypt.compare(password, user.password);
}


//function to add a new user
async function addUser(username, hashedPassword) {
    //save the username and hashed password as a new document in the users collection
    await usersCollection.insertOne({
        username: username,
        password: hashedPassword,
        role: "registered",
        createdAt: new Date()
    });
}


//--------------------------
//serve the website files (html, css, js, images) from this folder
const FILE_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};
//files that should never be sent to the browser
const PRIVATE_FILES = ["server.js", "importUsers.js", "package.json", "package-lock.json", "users.txt"];

function serveFile(req, res) {
    let urlPath = decodeURIComponent(req.url.split("?")[0]); //remove any ?query from the url
    if (urlPath === "/") {
        urlPath = "/index.html";
    }

    const fileName = path.basename(urlPath);
    const fileType = FILE_TYPES[path.extname(fileName).toLowerCase()];
    const filePath = path.join(__dirname, urlPath);

    //only send known file types, stay inside the project folder, and skip private files
    if (!fileType || !filePath.startsWith(__dirname + path.sep) || PRIVATE_FILES.includes(fileName)
        || urlPath.includes("node_modules") || urlPath.includes("/.")) {
        res.writeHead(404);
        res.end("Not found");
        return;
    }

    fs.readFile(filePath, (err, fileData) => {
        if (err) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }
        res.writeHead(200, { "Content-Type": fileType });
        res.end(fileData);
    });
}


const server = http.createServer((req, res) => {
    //set CORS headers to allow requests from the frontend
    res.setHeader(
        "Access-Control-Allow-Origin",
        "http://127.0.0.1:5500"
    );
    //allow the following methods for CORS requests
    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );
    //allow content-type header for CORS requests
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );
    //allow credentials (cookies) to be sent with CORS requests
    res.setHeader(
    "Access-Control-Allow-Credentials",
    "true"
    );

    //handle CORS preflight request
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

//--------------------------
    //create a new user account
    if (req.url === "/signup" && req.method === "POST") {

        let body = "";
        req.on("data", chunk => { //listen for data events and append the data to the body variable
            body += chunk;
        });

        req.on("end", async () => { //listen for the end event and parse the body as JSON

            console.log("BODY RECEIVED:");
            console.log(body);

            if (body === "") { //if the body is empty, return a 400 error
                res.writeHead(400);
                res.end("Empty request body");
                return;
            }

            try {
                const data = JSON.parse(body);

                const username = data.username;
                const password = data.password;

                console.log("Username:", username);

                //check if username is available
                const available = await nameAvailable(username);
                if (!available) {
                    //username already exists, return a 409 error
                    res.writeHead(409);
                    res.end("Username already exists");
                    return;
                }
                
                //username is available, hash the password and add the user to the file
                const hashedPassword = await encodePassword(password);
                console.log("Password hash:", hashedPassword);

                //call the addUser function to add the user to the file
                try {
                    await addUser(username, hashedPassword);
                } catch (error) {
                    if (error.code === 11000) { //MongoDB duplicate key error, username was just taken
                        res.writeHead(409);
                        res.end("Username already exists");
                        return;
                    }
                    throw error;
                }

                console.log("User successfully added!"); //user added successfully, return a 200 status code
                res.writeHead(200);
                res.end("User created");

            } catch (error) { //if there is an error parsing the body or adding the user, return a 400 error
                console.error("Signup error:", error);
                res.writeHead(400);
                res.end("Invalid request");
            }
        });
        return; //end of signup request handling
    }

    //--------------------------
        //login user
        else if (
            req.url === "/login" &&
            req.method === "POST"
        ) {
            let body = "";
            req.on("data", chunk => { //listen for data events and append the data to the body variable
                body += chunk;
            });

            req.on("end", async () => { //listen for the end event and parse the body as JSON

                console.log("Login BODY RECEIVED:");
                console.log(body);

                if (body === "") { //if the body is empty, return a 400 error
                    res.writeHead(400);
                    res.end("Empty request body");
                    return;
                }
                
                try {
                    const data = JSON.parse(body); //parse the body as JSON

                    //call the loginUser function to check if the username and password are correct
                    const loginStatus = await loginUser(data.username, data.password);

                    if(!loginStatus) { //if the username and password are incorrect, return a 401 error
                        res.writeHead(401);
                        res.end("Invalid username or password");
                        return;
                    }

                    res.writeHead(200, { //set the username cookie and return a 200 status code (login successful)
                        "Set-Cookie": `username=${encodeURIComponent(data.username)}; Path=/`, //sends back a cookie with the username to the client
                        "Content-Type": "text/plain"
                    });

                    res.end("Login successful");

                } catch (error) { //if there is an error parsing the body or logging in the user, return a 400 error
                    console.error("Login error:", error);
                    res.writeHead(400);
                    res.end("Invalid request");
                }
            });
            return; //end of login request handling
        }


//--------------------------
    //any other GET request is for a website file (forum.html, style.css, ...)
    else if (req.method === "GET") {
        serveFile(req, res);
    }

//--------------------------
    //unknown URL or method, return 404
    else {
        res.writeHead(404);
        res.end("Not found");
    }
});

//connect to MongoDB, then start the server and listen on port 3000
async function startServer() {
    await mongoClient.connect();
    usersCollection = mongoClient.db(DB_NAME).collection("users");
    //make the database reject duplicate usernames
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    //sessions collection: one document per logged in broweser
    sessionsCollection = mongoClient.db(DB_NAME).collection("sessions");
    //MongoDB automatically deletes a session once it expiresAt time has passed
    await sessionsCollection.createIndex({ expiresAt:1 }, { expireAfterSeconds: 0});
    //each session id must be unique, and this also makes looking one up fast
    await sessionsCollection.createIndex({ sessionId: 1 }, { unique: true });

    console.log("Connected to MongoDB at " + MONGO_URI + " (database: " + DB_NAME + ")");

    server.listen(PORT, () => {
        console.log("Server running at http://localhost:" + PORT);
    });
}

startServer().catch(error => {
    console.error("Could not start the server. Is MongoDB running?");
    console.error(error);
    process.exit(1);
});
