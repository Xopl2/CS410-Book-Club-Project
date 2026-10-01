const signupButton = document.getElementById("signupSubmit");
const loginButton = document.getElementById("signupSwitchToLogin");
const backToForum = document.getElementById("signupSwitchToForum");

loginButton.addEventListener("click", function() {
    window.open("login.html", "_self");
});

backToForum.addEventListener("click", function() {
    window.open("forum.html", "_self");
});

signupButton.addEventListener("click", function(event) {
    event.preventDefault();
    //get info from the user input fields
    const guestName = document.getElementById("signupUsername").value;
    const guestPassword = document.getElementById("signupPasswordFirst").value;
    const guestPasswordConfirm = document.getElementById("signupPasswordConfirm").value;

    if(guestPassword != ""){ //check if password is not blank
        if(guestPassword == guestPasswordConfirm){ //check if passwords match
            if (guestName != "") {  //check if username is not blank
                addUser(guestName, guestPassword); //call the addUser function to send the username and password to the server
            } else {alert("Invalid username, please try again.");}  //error message for blank username
        } else {alert("Passwords do not match, please try again.");} //error message for passwords not matching
    } else {alert("Password is blank or invalid, please try again.");} //error message for blank password
});

//helper function to send the username and password to the server
function addUser(guestName, guestPassword) {
    //send the username and password to the server to the locaton /signup
    fetch("http://127.0.0.1:3000/signup", { 
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: guestName, //username: guestName
            password: guestPassword //password: guestPassword
        }) 
    })
    .then(async response => { // get the response text

        const data = await response.text();

        //handle the response from the server
        if (response.status === 409) { // username already exists
            console.log("Signup failed:", data);
            alert("Signup failed: Username already exists. Please choose a different username.");
            return;
        }

        if (response.ok) {  //account creation successful
            console.log("Account created!");
            // console.log("ALERT CLOSED");
            window.open("http://127.0.0.1:5500/login.html", "_self");
            alert("Account created successfully! You can now log in.");    
            return;
        } else {    //account creation failed
            console.log("Signup error:", data);
            alert("Something went wrong. Please try again.");
            return;
        }
    })
    .catch(error => {   // not able to connect to the server
        console.error("Connection error:", error);
        alert("Unable to connect to the server.");
    });
}