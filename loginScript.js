const signupButton = document.getElementById("loginSwitchToSignup");
const backToForum = document.getElementById("loginSwitchToForum");

signupButton.addEventListener("click", function() {
    window.open("signup.html", "_self");
});

backToForum.addEventListener("click", function() {
    window.open("forum.html", "_self");
});