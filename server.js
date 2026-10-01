const http = require("http");
const fs = require("fs");
const bcrypt = require("bcryptjs");

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
function nameAvailable(username) {
    //return a promise that resolves to true if the username is available, false if it is not
    return new Promise((resolve, reject) => {
        fs.readFile("users.txt", "utf8", (err, fileData) => { //read file on server side
            if (err) { //if there is an error reading the file, reject the promise
                reject(err);
                return;
            }

            const users = fileData.split("\n");
            for (let user of users) { //loop through each user in the file
                user = user.trim();
                if (user === "") { //skip empty lines
                    continue;
                }

                const parts = user.split(",");
                if (parts[0] === username) { //username already exists 
                    resolve(false);
                    return;
                }
            }
            resolve(true); //username is available
        });
    });
}
//helper function to check if a username is available
function loginUser(username, password) {
    //return a promise that resolves to true if the username and password are correct, false if they are not
    return new Promise((resolve, reject) => {
        fs.readFile("users.txt", "utf8",async (err, fileData) => { //read file on server side
            if (err) { //if there is an error reading the file, reject the promise
                reject(err);
                return;
            }

            const users = fileData.split("\n");
            for (let user of users) { //loop through each user in the file
                user = user.trim();
                if (user === "") { //skip empty lines
                    continue;
                }

                const parts = user.split(",");

                if (parts[0] === username) { //username found, check password
                    if (await bcrypt.compare(password, parts[1])) { //compare the password with the hashed password
                        resolve(true); //passwords match, login successful
                        return;
                    } else { //incorrect password
                        resolve(false); 
                        return;
                    }
                }
            }
            resolve(false); //username not found
        });
    });
}


//function to add a new user
function addUser(username, hashedPassword) {
    return new Promise((resolve, reject) => { //return a promise that resolves when the user is added to the file
        //add the username and hashed password to the end of the users.txt file
        fs.appendFile(
            "users.txt",
            username + "," + hashedPassword + "\n",
            err => { 
                if (err) { //if there is an error writing to the file, reject the promise
                    reject(err);
                    return;
                }
                resolve(); //user added successfully
            }
        );
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
                await addUser(username, hashedPassword);

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
    //unknown URL or method, return 404
    else {
        res.writeHead(404);
        res.end("Not found");
    }
});

//start the server and listen on port 3000
server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
