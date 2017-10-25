//------------------initialize database connection----------------------

var config = {
    apiKey: "AIzaSyApm8d6QdvEX0iyR4Y5qF1KbPPQH6i7pYM",
    authDomain: "rock-paper-scissors-afad9.firebaseapp.com",
    databaseURL: "https://rock-paper-scissors-afad9.firebaseio.com",
    storageBucket: "rock-paper-scissors-afad9.appspot.com",
  };
firebase.initializeApp(config);
var database = firebase.database();


//-----------------------Declare variables--------------------------------

//keeps track of the nodes the player object resides in in the database
var keys = {};

var listening = false;
//
var matchListener;
var playerListener;
var countDown;


var matchKey = "";

//stores either "player1" or "player2" depending on the current match
youThisRound = "";
themThisRound = "";

var playerObject = {
    "status": "chilling",
    "logins": 0,
    "wins": 0,
    "losses": 0,
    "ties": 0,
    "username": "Player", 
};

function setLS(obj){//slighty shorter-hand way to update the local storage object
    localStorage.setItem("rps", JSON.stringify(obj));
};

function setDBInfo(path = [], value = playerObject){
    var sz = path.length;
    if(sz === 0){
        database.ref().child("players").child(keys["players"]).set(value);
    }
    else if(sz === 1){
        database.ref().child(path[0]).set(value);
    }
    else if(sz === 2){
        database.ref().child(path[0]).child(path[1]).set(value);
    }
    else if(sz === 3){
        database.ref().child(path[0]).child(path[1]).child(path[2]).set(value);
    } 
};

function getDBInfo(path){
    var output;
    if(path.length === 1){
        database.ref().child(path[0]).once("value", function(snap){
            output = snap.val();
        })
    }
    else if(path.length === 2){
        database.ref().child(path[0]).child(path[1]).once("value", function(snap){
            output = snap.val();
        })
    }
    else if(path.length === 3){
        database.ref().child(path[0]).child(path[1]).child(path[2]).once("value", function(snap){
            output = snap.val();
        })
    };
    return output;
}

function pushObjToDB(obj, node){//appends object to the specified database node and records the unique key string
    var key = database.ref().child(node).push(obj).key;
    keys[node] = key;
        if(node === "matches"){
            matchKey = key;
        };
};

function removePlayerObj(node){//removes the player object from the designated node in the database
    database.ref().child(node).child(keys[node]).remove();
    delete keys[node];
};

function findMatch(){
    if(playerObject["status"] === "chilling"){
        playerObject["status"] = "searching";
        setDBInfo();
        database.ref().child("players").once("value", function(snap){
            for(var i in snap.val()){
                var opponent = snap.val()[i];
                if(opponent["status"] === "searching" && i != keys["players"]){
                    pushObjToDB(buildMatchObject(playerObject, opponent), "matches");
                };
            };
        });
    }
    else if(playerObject["status"] === "searching"){
        playerObject["status"] = "chilling";
        setDBInfo();
    };
    if(!listening){
        setUpPlayerListener()
        listening = true;
    };

};


function buildMatchObject(you, opponent){
    output = {}

    output["status"] = "waiting";
    output["round"] = 0;
    output["player1"] = you;
    output["player1choice"] = "";
    output["player1ready"] = false;
    output["player2"] = opponent;
    output["player2choice"] = "";
    output["player2ready"] = false;


    return output;
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
};

function submitUsername(){//only executes if it is the first time the player has visited the page
    //grab the user's input
    var userName = $("#username_input").val().trim();

    //update playerObject
    playerObject["username"] = userName;

    //hide overlay
    $("#overlay").hide();

    pushObjToDB(playerObject, "players");
};

function test(){
    console.log("done worked");
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

function updateDisplay(text, tag, delay){
    target = $("#display")
    target.html("<" + tag + ">" + text + "</" + tag + ">");
    setTimeout(function(){
       target.empty();
     }, delay);
};


//evaluates the round and returns an object containing the results
function evalRound(match_obj){
    var pc = match_obj[youThisRound + "choice"];
    var oc = match_obj[themThisRound + "choice"];
    var op = match_obj[themThisRound]["username"]
    output = {};

    output["opUrl"] = "assets/images/" + oc + ".gif";
    output["playerUrl"] = "assets/images/flip_" + pc + ".gif";

    //tie condition
    if(pc === oc){
        output["result"] = op + " threw " + oc + ". Tie Game!";
        playerObject["ties"]++;
    }
    //win condition
    else if(pc === "rock" && oc === "scissors" || pc === "paper" && oc === "rock" || pc == "scissors" && oc === "paper"){
        output["result"] = op + " threw " + oc + ". You Win";
        playerObject["wins"]++;
    }
    //loss condition
    else{
        output["result"] = op + " threw " + oc + ". You Lose";
        playerObject["losses"]++;
    };
    setDBInfo();
    return output;
};

function initiateRound(match_obj){
    //set the firebase matchObject status to 'in progress', which dissables the game buttons
    setDBInfo(["matches", keys["matches"], "status"], "in progress");

    //start the count down
    startCountDown();

    var outcome = evalRound(match_obj);

    displayResults(outcome);
};

//displays the 'rock, paper, scissors, shoot' count down
function startCountDown(){
    var target = $("#display");
    var text = ["Rock", "Paper", "Scissors", "Shoot!!"];
    var index = 1;
    var countDiv = $("<div id='count_down'></div>");

    countDiv.html("<h1>Rock</h1>");
    target.append(countDiv);

    countDown = setInterval(function(){
        $("#count_down").html("<h1>" + text[index] + "</h1>");
        if(index === text.length){
            clearInterval(countDown);
            setDBInfo(["matches", keys["matches"], "status"], "waiting");
            setDBInfo(["matches", keys["matches"], "player1ready"], false);
            setDBInfo(["matches", keys["matches"], "player2ready"], false);
            $("#display").html("");
        };
        index++;
    }, 750);
};

function displayResults(obj){
    
    setTimeout(function(){
        $("#opponent_choice").attr("src", obj["opUrl"]);
        $("#player_choice").attr("src", obj["playerUrl"]);
        setDBInfo(["matches", keys["matches"], "status"], "waiting");

    }, 2250);
};

function choiceButton(choice){
    //grab current match status
    var status = getDBInfo(["matches", keys["matches"], "status"])

    //ensure match is awating user input
    if(status === "waiting"){

        //set your choice for the round, and playerready attribute to true
        setDBInfo(["matches", keys["matches"], youThisRound + "ready"], true);
        setDBInfo(["matches", keys["matches"], youThisRound + "choice"], choice);

        //'opponentReady' will be set to a boolean based on whether the opponent has picked yet
        var opponentReady = getDBInfo(["matches", keys["matches"], themThisRound + "ready"]);
            
        //if they are ready, set the firebase matchObject status to 'throwing'. this is heard by  
        //the matchListener and triggers the round
        if(opponentReady){
            setDBInfo(["matches", keys["matches"], "status"], "throwing");
        }
        //if they are not ready, display a waiting message
        else{
            $("#display").html("waiting for opponent")
        };
    };
};


$(window).on("beforeunload", function(){

    //set status back to 'chilling'
    playerObject["status"] = "chilling";

    //save playerObject to local storage
    //setLS(playerObject);

    //delete player object from all nodes
    for(var i in keys){
        removePlayerObj(i);
    };
    removePlayerObj(matchKey);
});

//creates a listener for the playerObject in firebase: mainly used for updating the button text
function setUpPlayerListener(){
    database.ref().child("players").child(keys["players"]).on("value", function(snap){

        var button = $("#find_match_button")
        if(snap.val()["status"] === "searching"){
            button.html("Cancel Search");
            $("display").html("Searching for Match");
        }
        else if(snap.val()["status"] === "chilling"){
            button.removeClass("faded");
            button.html("Find Match");
            $("display").html("");
        }
        else if(snap.val()["status"] === "fighting"){
            button.html("fighting");
            button.addClass("faded");
        };
    });
};


$(document).ready(function(){

    localStorage.clear()
    checkLocalStorage();

    if(playerObject["logins"] === 0){
        createOverlay();
    }
    else{
        pushObjToDB(playerObject, "players");
    };

    database.ref().child("matches").on("child_removed", function(snap){
        if(playerObject["status"] === "fighting"){
            if(snap.key === keys["matches"]){
                delete keys["matches"];
                playerObject["status"] = "chilling";
                console.log("match listener works")
                setDBInfo();
            };
        };
    });

    database.ref().child("matches").on("child_added", function(snap){
        var newMatch = snap.val()
        var inMatch = false;
        var text = "You are now playing against "

        if(newMatch["player1"]["username"] === playerObject["username"]){
            text += newMatch["player2"]["username"];
            youThisRound = "player1";
            themThisRound = "player2";
            inMatch = true;
        }
        else if(newMatch["player2"]["username"] === playerObject["username"]){
            text += newMatch["player1"]["username"];
            youThisRound = "player2";
            themThisRound = "player1";
            inMatch = true
        };

        if(inMatch){
            //unfade game buttons buttons
            $(".game-btn").removeClass("faded");

            //record node unique key for this match in the 'keys' object
            keys["matches"] = snap.key;

            //set playerObject status to fighting (unlocks the game buttons and prevents user from being selected for another match)
            playerObject["status"] = "fighting";

            //update firebase playerObject to show that we are in a match 
            setDBInfo();

            //display the 'text' variable in the #display div
            updateDisplay(text, "h2", 4000);

            //create a listener that reacts to changes in the match status
            matchListener = database.ref().child("matches").child(snap.key).child("status").on("value", function(snap){

                //if the match status is set to "throwing"...
                if(snap.val() === "throwing"){

                    //grab the entire matchObject from firebase and pass it to the 'initiateRound' function.
                    initiateRound(getDBInfo(["matches", keys["matches"]]))
                };
            });
        }
    });




    //------------------------Bind Game Buttons--------------------------------

    //the 'status' attribute of the playerObject is only set to 'fighting' when
    //user is currently in a match. buttons therefore do nothing outside of a match
    $("#rock_button").on("click", function(){
        if(playerObject["status"] === "fighting"){
            choiceButton("rock");
        };
    });

    $("#paper_button").on("click", function(){
        if(playerObject["status"] === "fighting"){
            choiceButton("paper");
        };
    });

    $("#scissors_button").on("click", function(){
        if(playerObject["status"] === "fighting"){
            choiceButton("scissors");
        };
    });

    playerObject["logins"] ++;
});