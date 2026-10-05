// builds the forum page by loading mock data and setting up event listeners

const signupButton = document.getElementById("navSignup");
const loginButton = document.getElementById("navLogin");
const signoutButton = document.getElementById("navSignout");

signupButton.addEventListener("click", function() {
    window.open("signup.html", "_self");
});

loginButton.addEventListener("click", function() {
    window.open("login.html", "_self");
});

window.onload = startForum; //load data when page loads

let mockData = null; // holds the data once loaded
let selectedUserId = null; // id of user mod picked

function startForum() { //grab mock data and fill in page
    fetch('mockData.json').then(function(response) { //Grab DB file (will eventually go to real Node JS server)
        return response.json();
    }).then(function(data) {
        mockData = data; //save data so other functions can use it
        showBookInfo(mockData.book); //update page to show book info
        showModInfo(mockData.modName); //update page to show mod name
        showCurrentSpeaker(mockData.currentSpeaker); //update page to show cur speaker
        loadComments(); //get all saved comments from the server and show them
        showUserList(mockData.users); //update page to show user buttons
    });
}

function showBookInfo(book) { //set cover, title, author
    document.getElementById("bookCover").src = book.coverUrl;
    document.getElementById("bookName").innerText = book.title;
    document.getElementById("authorName").innerText = book.author;
}

function showModInfo(modName) { //update page to show mod name
    document.getElementById("modName").innerText = modName;
}

function showCurrentSpeaker(speakerName) { //Get cur speaker from DB or show that there currently isnt one
    if(speakerName) { //someone has the turn
        document.getElementById("currentSpeaker").innerText = speakerName;
    } else { //nobody has a turn
        document.getElementById("currentSpeaker").innerText = "None";
    }
}

function addComment(comment) { //build and add one comment div to the page
    let commentsPanel = document.getElementById("commentsPanel");

    let commentDiv = document.createElement("div"); //outer div for this comment
    commentDiv.className = "comment";

    let commentInfo = document.createElement("div"); //holds the author name
    commentInfo.className = "commentInfo";

    let authorSpan = document.createElement("span"); //set author name
    authorSpan.className = "commentAuthor";
    authorSpan.innerText = comment.username;

    commentInfo.appendChild(authorSpan);

    let textSpan = document.createElement("span"); //set comment text
    textSpan.className = "commentText";
    textSpan.innerText = comment.text;

    commentDiv.appendChild(commentInfo);
    commentDiv.appendChild(textSpan);

    commentsPanel.appendChild(commentDiv); //add comment to panel
}

function showAllComments(comments) { //clear page then show every comment
    let commentsPanel = document.getElementById("commentsPanel");
    commentsPanel.innerHTML = ""; //clear old comments off the page

    for(let i = 0; i < comments.length; i++) { //go through each comment one at a time
        addComment(comments[i]);
    }
}

function showUserList(users) { //clear page then show one button per user
    let usersPanel = document.getElementById("usersPanel");
    usersPanel.innerHTML = ""; //clear old buttons off the page

    for(let i = 0; i < users.length; i++) { //go through each user one at a time
        let userButton = document.createElement("input"); //new button for this user
        userButton.type = "button";
        userButton.className = "selectUserButton";
        userButton.value = users[i].username; //set button text to their name
        userButton.id = "user-" + users[i].id; //tag button with id so we can find it later
        usersPanel.appendChild(userButton);
    }
}

function loadComments() { // ask the server for all saved comments
    fetch("/comments")
        .then(response => response.json())
        .then(comments => {
            showAllComments(comments); // update page to show all comments
        })
        .catch(error => {
            console.error("Could not load comments:", error);
        });
}

function sendComment() { // send the comment to the server as a new comment
    let writeCommentBox = document.getElementById("writeCommentBox"); // grab the textbox
    let text = writeCommentBox.value; //grab what the user typed

    if(text.trim() === "") { // don't post empty comments
        return;
    }

    if(currentUser === null) { // user is not logged in
        alert("Please log in to post a comment.");
        return;
    }

    fetch("/comments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: text }) //only send the text, sever knows poster from the session
    })
    .then( async response => {
        const data = await response.json();
        if(!response.ok) { // sevrer said no (e.g. not logged in)
            alert(data.error);
            return;
        }
        addComment(data); //server saved, add to page
        writeCommentBox.value = ""; //clear the textbox
    })
    .catch(error => {
        console.error("Could not send comment:", error);
        alert("Unable to connect to the server.");
    });
}

function pickUser(event) { //update selectedUserId to whichever user was clicked
    if(event.target.className !== "selectUserButton") { //make sure a user button was clicked
        return;
    }
    let clickedId = event.target.id; //grab id string off the clicked button
    let idNumber = clickedId.substring(5); //cut off the "user-" part, id starts at index 5
    selectedUserId = Number(idNumber); //update selectedUserId to that user
}

function startTurn() { //give selected user the turn
    if(selectedUserId === null) { //nobody picked yet so theres no one to give the turn to
        return;
    }

    let foundUser = null;
    for(let i = 0; i < mockData.users.length; i++) { //go through each user looking for a match
        if(mockData.users[i].id === selectedUserId) {
            foundUser = mockData.users[i];
        }
    }

    if(foundUser === null) { //safety check in case something went wrong
        return;
    }

    mockData.currentSpeaker = foundUser.username; //update cur speaker to this user
    showCurrentSpeaker(mockData.currentSpeaker); //update page to show cur speaker
}

function endTurn() { //clear whoever has the turn
    mockData.currentSpeaker = null; //update cur speaker to nobody
    showCurrentSpeaker(mockData.currentSpeaker); //update page to show current speaker
}

document.getElementById("sendCommentButton").addEventListener("click", sendComment); //send button posts the comment
document.getElementById("usersPanel").addEventListener("click", pickUser); //user buttons update selectedUserId
document.getElementById("startTurn").addEventListener("click", startTurn); //start turn button gives selected user the turn
document.getElementById("endTurn").addEventListener("click", endTurn); //end turn button clears the current speaker

//allow pressing Enter in the comment box to post the comment (Shift+Enter still makes a new line)
document.getElementById("writeCommentBox").addEventListener("keydown", function(event) {
    if(event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); //stop Enter from adding a newline
        sendComment();
    }
});

//user pressed the sign out button, clear the username cookie and navigate to the forum page
signoutButton.addEventListener("click", function() {
    fetch("/logout", {method: "POST"})
    .then(function() {
        window.location.href = "forum.html"; // reload the forum as a guest
    })
});

let currentUser = null; // the logged in user or null for guests

//ask the server who is logged in, then show thr appropriate nav buttons
function loadCurrentUser() {
    fetch("/me")
        .then(response => response.json())
        .then(user => {
            if (user.username !== null) { // user is logged in
                currentUser = user;
                document.getElementById("navLogin").style.display = "none"; // hide login and signup buttons and display logout button
                document.getElementById("navSignup").style.display = "none";
                console.log("Logged in as: " + currentUser.username + " (" + currentUser.role + ")");
            }
            else { //user is not logged in
                currentUser = null;
                document.getElementById("navSignout").style.display = "none"; // hide logout button
                console.log("Not logged in");
            }
        })
        .catch(error => {
            console.error("Could not check login:", error);
        });
}

loadCurrentUser();