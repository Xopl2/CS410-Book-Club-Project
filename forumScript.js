const signupButton = document.getElementById("navSignup");
const loginButton = document.getElementById("navLogin");

signupButton.addEventListener("click", function() {
    window.open("signup.html", "_self");
});

loginButton.addEventListener("click", function() {
    window.open("login.html", "_self");
});