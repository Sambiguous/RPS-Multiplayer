var config = {
    apiKey: "AIzaSyApm8d6QdvEX0iyR4Y5qF1KbPPQH6i7pYM",
    authDomain: "rock-paper-scissors-afad9.firebaseapp.com",
    databaseURL: "https://rock-paper-scissors-afad9.firebaseio.com",
    storageBucket: "rock-paper-scissors-afad9.appspot.com",
  };

firebase.initializeApp(config);

var database = firebase.database();

playerObjectLocations = {//keeps track of the nodes the player object resides in in the database

}

var playerObject = {
    "status": "chilling",
    "logins": 0,
    "wins": 0,
    "losses": 0,
    "ties": 0,
    "username": "Player", 
};

var firebasePlayerKey = ""


function setLS(obj){//slighty shorter-hand way to update the local storage object
    localStorage.setItem("rps", JSON.stringify(obj));
};

function setDB(){
    console.log(database.ref().child("players").child(playerObjectLocations["players"]).set(playerObject));
}

function pushPlayerObj(obj, node){//appends player object to the specified node

    var key = database.ref().child(node).push(obj).key;
    playerObjectLocations[node] = key;
};

function removePlayerObj(node){//removes the player object from the designated node in the database
    database.ref().child(node).child(playerObjectLocations[node]).remove();
    delete playerObjectLocations[node];
};



function findMatch(){
    playerObject["status"] = "searching";
    setDB();
    database.ref().child("players").once("value", function(snap){
        for(var i in snap.val()){
            var player = snap.val()[i];
            if(player["status"] === "searching" && i != playerObjectLocations["players"]){
                console.log("found an opponent yo");
            };
        };

        console.log("couldn't find anybody");
    });


};

database.ref().child("players").on("child_removed", function(snap){
    //do stuff here when a player leaves the lobby
});

function checkLocalStorage(){//check to see if user has played before

    //if user has not played, set local storage equal to default playerObject
    if(localStorage.getItem("rps") === null){
        setLS(playerObject); 
    }
    //if they have played before, set playerObject equal to the stored object
    else{
        playerObject = JSON.parse(localStorage.getItem("rps"));
    };
}

function submitUsername(){//only executes if it is the first time the player has visited the page
    //grab the user's input
    var userName = $("#username_input").val().trim();

    //update playerObject
    playerObject["username"] = userName;

    //update local Storage to mirror the most most recent playerObject
    setLS(playerObject);

    //hide overlay
    $("#overlay").hide();

    pushPlayerObj(playerObject, "players");
};

function createOverlay(){//creates overlay where players input their username if it is their first time playing
    var overlay = $("<div id='overlay'</div>");
    var userPrompt = $("<div id='username_prompt'</div>");
    userPrompt.append($("<h1>Welcome to Rock Paper Scissors!!</h1>"));
    userPrompt.append($("<h4>Please create a new username.</h4>"));
    userPrompt.append($("<form><span><input id='username_input' type='text' placeholder='Enter Username'/><input id='user_button' type='submit'></span></form>"));
    overlay.append(userPrompt); 
    $("body").append(overlay);

    $("#user_button").on("click", function(ev){
        ev.preventDefault();
        submitUsername();
    });
};

$(window).on("beforeunload", function(){

    //set status back to 'chilling'
    playerObject["status"] = "chilling";

    //save playerObject to local storage
    setLS(playerObject);

    //delete player object from all nodes
    for(var i in playerObjectLocations){
        removePlayerObj(i);
    };
});


$(document).ready(function(){

    //localStorage.clear()
    checkLocalStorage();

    if(playerObject["logins"] === 0){
        createOverlay();
    }
    else{
        pushPlayerObj(playerObject, "players");
    };

    $("#rock_button").on("click", function(){//lol
        database.ref().set({});
    });

    playerObject["logins"] ++;
    setLS(playerObject);
});


