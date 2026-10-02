const signupButton = document.getElementById("loginSwitchToSignup");
const backToForum = document.getElementById("loginSwitchToForum");
const loginForum = document.getElementById("loginSubmit");

signupButton.addEventListener("click", function() {
    window.open("signup.html", "_self");
});

backToForum.addEventListener("click", function() {
    window.open("forum.html", "_self");
});

loginForum.addEventListener("click", function(event) {

    //prevent the form from refreshing the page
    event.preventDefault();

    //get the username and password from the form
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    //send the username and password to the server
    fetch("/login", {
        method: "POST",
        credentials: "include", //include credentials (cookies) in the request
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    }) 
    .then(response => response.text()) //get the response text
    .then(data => { 
        //handle the response from the server
        if(data === "Login successful"){ //if the server responds with "Login successful" 
            console.log("Login successful");
            window.location.href = "forum.html";
            alert("Login successful! Welcome, " + username + "!");

        } else { //if the server responds with anything else, login failed
            console.log("Login failed");
            alert("Login failed. Please check your username and password.\nNOTE: Usernames and passwords ARE case sensitive.");
        }
    });
});