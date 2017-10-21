var config = {
    apiKey: "AIzaSyApm8d6QdvEX0iyR4Y5qF1KbPPQH6i7pYM",
    authDomain: "rock-paper-scissors-afad9.firebaseapp.com",
    databaseURL: "https://rock-paper-scissors-afad9.firebaseio.com",
    storageBucket: "rock-paper-scissors-afad9.appspot.com",
  };

firebase.initializeApp(config);

var database = firebase.database();


var playerObject = {
    "logins": 0,
    "wins": 0,
    "losses": 0,
    "ties": 0,
    "username": "Player", 
};

var firebasePlayerKey = ""


function setLocalStorage(obj){//slighty shorter-hand way to update the local storage object
    localStorage.setItem("rps", JSON.stringify(obj));
};

function pushPlayerObjToDatabase(obj){//does exactly what you think it does, it also stores the firebase key associated with this playerObject in the database
    database.ref().child("players").push(obj);

    //grab key associated with local playerObject and store value as a variable
    database.ref().child("players").once("value", function(snapshot){

            setPlayerKey(snapshot.val());
        
    });
};

function removePlayerObjFromDatabase(){
    database.ref().child("players").child(firebasePlayerKey).remove();
};

function setPlayerKey(object){
    var un = playerObject["username"]
    for(var i in object){
        if(object[i].username === un){
            firebasePlayerKey = i;
        };
    };
};

database.ref().child("players").on("child_removed", function(snap){
    //do stuff here when a player leaves the lobby
});

function checkLocalStorage(){
    if(localStorage.getItem("rps") === null){
        localStorage.setItem("rps", JSON.stringify(playerObject)); 
    }
    else{
        playerObject = JSON.parse(localStorage.getItem("rps"));
    };
}

function submitUsername(){
    //grab the user's input
    var userName = $("#username_input").val().trim();

    //update playerObject
    playerObject["username"] = userName;

    //set updat local Storage to mirror the most most recent playerObject
    setLocalStorage(playerObject);

    //hide overlay
    $("#overlay").hide();

    pushPlayerObjToDatabase(playerObject);
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
    removePlayerObjFromDatabase();
});




$(document).ready(function(){

    //localStorage.clear()
    checkLocalStorage();

    if(playerObject["logins"] === 0){
        createOverlay();
    }
    else{
        pushPlayerObjToDatabase(playerObject);
    };

    $("#rock_button").on("click", function(){//lol
        database.ref().set({});
    });

    playerObject["logins"] ++;
    setLocalStorage(playerObject);


});


