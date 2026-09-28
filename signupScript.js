const loginButton = document.getElementById("signupSwitchToLogin");
const backToForum = document.getElementById("signupSwitchToForum");

loginButton.addEventListener("click", function() {
    window.open("login.html", "_self");
});

backToForum.addEventListener("click", function() {
    window.open("forum.html", "_self");
});