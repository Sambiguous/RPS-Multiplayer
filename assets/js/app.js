//------------------initialize database connection----------------------

var config = {
    apiKey: "AIzaSyApm8d6QdvEX0iyR4Y5qF1KbPPQH6i7pYM",
    authDomain: "rock-paper-scissors-afad9.firebaseapp.com",
    databaseURL: "https://rock-paper-scissors-afad9.firebaseio.com",
    storageBucket: "rock-paper-scissors-afad9.appspot.com",
  };
firebase.initializeApp(config);
var database = firebase.database();


//-----------------------DECLARE GLOBAL VARIABLES--------------------------

var isQuitter = false;
var listening = false;

//various listeners and intervals that will be defined later
var matchListener;
var matchChatListener;
var lobbyListener;
var countDown;

//stores either "player1" or "player2" depending on the current match
var youThisMatch = "";
var themThisMatch = "";

//keeps track of the nodes the player object resides in in the database
var playerKey;
var matchKey;

//stores opponenst lifetime record: re-assigned every time you enter a new match
var opStats = {
    "username": "Opponent",
    "wins": 0,
    "losses": 0,
    "ties": 0
};

//keeps track of all of user's stats
var playerObject = {
    "status": "chilling",
    "logins": 0,
    "wins": 0,
    "losses": 0,
    "ties": 0,
    "username": "Player", 
};

//-------------------FIREBASE UTILITY FUNCTIONS---------------------

function setDBInfo(path = [], value = playerObject){//updates info in a specific firebase node
    var sz = path.length;
    if(sz === 0){
        database.ref().child("players").child(playerKey).set(value);
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

function getDBInfo(path){//grabs info from a specific firebase node
    var output;
    if(path.length === 1){
        database.ref().child(path[0]).once("value", function(snap){
            output = snap.val();
        });
    }
    else if(path.length === 2){
        database.ref().child(path[0]).child(path[1]).once("value", function(snap){
            output = snap.val();
        });
    }
    else if(path.length === 3){
        database.ref().child(path[0]).child(path[1]).child(path[2]).once("value", function(snap){
            output = snap.val();
        });
    };
    return output;
};


//-------------------LOCAL STORAGE FUNCTIONS--------------------------

function checkLocalStorage(){//check to see if user has played before
    
        //if user has not played, set local storage equal to default playerObject
        if(localStorage.getItem("rps") === null){
            localStorage.setItem("rps", JSON.stringify(playerObject)); 
        }
        //if they have played before, set playerObject equal to the stored object
        else{
            playerObject = JSON.parse(localStorage.getItem("rps"));
        };
    };



function findMatch(){
    //if user is currently chilling...
    if(playerObject["status"] === "chilling"){
        //set playerObject status to 'searching'
        playerObject["status"] = "searching";
        
        //display message on #display div
        $("#display").html("<h4>Searching for match...</h4>");

        setDBInfo();
        database.ref().child("players").once("value", function(snap){
            for(var i in snap.val()){
                var opponent = snap.val()[i];

                if(opponent["status"] === "searching" && i != playerKey){
                    //grab opponent record
                    getOpStats(opponent);
                    displayRecord();
                    matchKey = database.ref().child("matches").push(buildMatchObject(playerObject, opponent)).key;
                    database.ref().child("matches").child(matchKey).onDisconnect().remove()
                };
            };
        });
    }
    else if(playerObject["status"] === "searching"){
        $("#display").html("");
        playerObject["status"] = "chilling";
        setDBInfo();
    };
    //if not already listening, initialize player listener, which is mainly used to
    //change the matchbutton text by reading the status of the player object in firebase
    if(!listening){
        setUpPlayerListener()
        listening = true;
    };
};


function buildMatchObject(user, opponent){
    output = {}

    output["status"] = "waiting";
    output["round"] = 0;
    output["player1"] = user;
    output["player1choice"] = "";
    output["player1ready"] = false;
    output["player2"] = opponent;
    output["player2choice"] = "";
    output["player2ready"] = false;

    return output;
};



function submitUsername(){//only executes if it is the first time the player has visited the page
    //grab the user's input
    var userName = $("#username_input").val().trim();
    if(userName.length === 0){
        $("#username_prompt").empty();
        $("#username_prompt").append($("<h3>Username must contain at least 1 character</h3>"))
        return;
    };

    //update playerObject
    playerObject["username"] = userName;

    //hide overlay
    $("#overlay").hide();

    playerKey = database.ref().child("players").push(playerObject).key;
    playerObject["key"] = playerKey;
    database.ref().child("players").child(playerKey).onDisconnect().remove();
    displayRecord();
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
    var pc = match_obj[youThisMatch + "choice"];
    var oc = match_obj[themThisMatch + "choice"];
    var op = match_obj[themThisMatch]["username"]
    output = {};

    output["opUrl"] = "assets/images/" + oc + ".gif";
    output["playerUrl"] = "assets/images/flip_" + pc + ".gif";

    //tie condition
    if(pc === oc){
        output["result"] = op + " threw " + oc + ". Tie Game!";
        playerObject["ties"]++;
        opStats["ties"]++;
    }
    //win condition
    else if(pc === "rock" && oc === "scissors" || pc === "paper" && oc === "rock" || pc == "scissors" && oc === "paper"){
        output["result"] = op + " threw " + oc + ". You Win";
        playerObject["wins"]++;
        opStats["losses"]++;
    }
    //loss condition
    else{
        output["result"] = op + " threw " + oc + ". You Lose";
        playerObject["losses"]++;
        opStats["wins"]++;
    };
    setDBInfo();
    return output;
};

function initiateRound(match_obj){
    //set the firebase matchObject status to 'in progress', which dissables the game buttons
    setDBInfo(["matches", matchKey, "status"], "in progress");

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

    target.html("<h1>Rock</h1>");

    countDown = setInterval(function(){
        target.html("<h1>" + text[index] + "</h1>");
        if(index === text.length){
            clearInterval(countDown);
            setDBInfo(["matches", matchKey, "status"], "waiting");
            setDBInfo(["matches", matchKey, "player1ready"], false);
            setDBInfo(["matches", matchKey, "player2ready"], false);
            target.html("");
        };
        index++;
    }, 750);
};

function displayRecord(){
    
    $("#title").html(playerObject["username"]);
    $("#wins").html(playerObject["wins"]);
    $("#losses").html(playerObject["losses"]);
    $("#ties").html(playerObject["ties"]);
    $("#rounds").html(playerObject["wins"] + playerObject["losses"] + playerObject["ties"]);

    $("#op_title").html(opStats["username"]);
    $("#op_wins").html(opStats["wins"]);
    $("#op_losses").html(opStats["losses"]);
    $("#op_ties").html(opStats["ties"]);
    $("#op_rounds").html(opStats["wins"] + opStats["losses"] + opStats["ties"]);

};

function displayResults(obj){
    
    setTimeout(function(){
        clearInterval(countDown);
        $("#opponent_choice").attr("src", obj["opUrl"]);
        $("#player_choice").attr("src", obj["playerUrl"]);
        $("#display").html("<h2>" + obj["result"] + "<h2>");
        setDBInfo(["matches", matchKey, "status"], "waiting");
        displayRecord();
        setTimeout(function(){
            $("#display").html("");
        }, 2000);
    }, 3000);
};

function choiceButton(choice){
    //grab current match status
    var status = getDBInfo(["matches", matchKey, "status"])

    //ensure match is awating user input
    if(status === "waiting"){

        //set your choice for the round, and playerready attribute to true
        setDBInfo(["matches", matchKey, youThisMatch + "ready"], true);
        setDBInfo(["matches", matchKey, youThisMatch + "choice"], choice);

        //'opponentReady' will be set to a boolean based on whether the opponent has picked yet
        var opponentReady = getDBInfo(["matches", matchKey, themThisMatch + "ready"]);
            
        //if they are ready, set the firebase matchObject status to 'throwing'. this is heard by  
        //the matchListener and triggers the round
        if(opponentReady){
            setDBInfo(["matches", matchKey, "status"], "throwing");
        }
        //if they are not ready, display a waiting message
        else{
            $("#display").html("<h3>waiting for " + opStats["username"] + "</h3>")
        };
    };
};



//creates a listener for the playerObject in firebase: mainly used for updating the 'Find Match' button text
function setUpPlayerListener(){
    database.ref().child("players").child(playerKey).on("value", function(snap){
        
        var status = snap.val()["status"];
        var button = $("#find_match_button")
        
        if(status === "searching"){
            button.html("Cancel Search");
        }
        else if(status === "chilling"){
            button.removeClass("faded");
            button.html("Find Match");
            $("display").html("");
        }
        else if(status === "fighting"){
            button.html("fighting");
            button.addClass("faded");
        };
    });
};

function getOpStats(obj){
    opStats["username"] = obj["username"];
    opStats["wins"] = obj["wins"];
    opStats["losses"] = obj["losses"];
    opStats["ties"] = obj["ties"];
};

function initializeMatchChat(){
    $("#chat_log").html("");
    $("#chat_log").append($("<ul id='chat'></ul>"))
    matchChatListener = database.ref().child("matches").child(matchKey).child("chat").on("child_added", function(snap){
        var obj = snap.val();
        var entryClass;
        if(obj["username"] === playerObject["username"]){entryClass = "you"}
        else{entryClass = "enemy"}
        
        var entry = $("<li class='entry'><span class='" + entryClass + "'>" + snap.val()["username"] + ":</span> " + snap.val()["text"] + "</li>")
        $("#chat").append(entry)
    })
};


$(window).on("beforeunload", function(){

    //set status back to 'chilling'
    playerObject["status"] = "chilling";
    
    //save playerObject to local storage
    localStorage.setItem("rps", JSON.stringify(playerObject));
});

function displayLobby(){
    return "";
};



$(document).ready(function(){

    database.ref().child("players").on("child_added", function(snap){
        $("#lobby").append($("<div id='" + snap.key + "'>" + snap.val()["username"] + "</div>"));
    });

    database.ref().child("players").on("child_removed", function(snap){
        ($("#" + snap.key)).remove();
    });

    database.ref().child("matches").on("child_added", function(snap){
        var newMatch = snap.val()
        var inMatch = false;
        var text = "You are now playing against "

        if(newMatch["player1"]["key"] === playerKey){
            text += newMatch["player2"]["username"];
            youThisMatch = "player1";
            themThisMatch = "player2";
            inMatch = true;
        }
        else if(newMatch["player2"]["key"] === playerKey){
            text += newMatch["player1"]["username"];
            youThisMatch = "player2";
            themThisMatch = "player1";
            inMatch = true
        };

        if(inMatch){
            //unfade game buttons buttons
            $(".game-btn").removeClass("faded");

            //save unique node key to the matchKey variable and define disconnect behavior
            matchKey = snap.key;
            database.ref().child("matches").child(matchKey).onDisconnect().remove()

            //grab opponent record
            getOpStats(getDBInfo(["matches", snap.key, themThisMatch]));
            displayRecord();

            //set playerObject status to fighting (unlocks the game buttons and prevents user from being selected for another match)
            playerObject["status"] = "fighting";

            //update firebase playerObject to show that user is in a match 
            setDBInfo();

            //display the 'text' variable in the #display div
            updateDisplay(text, "h2", 4000);

            //create a listener that reacts to changes in the match status
            matchListener = database.ref().child("matches").child(snap.key).child("status").on("value", function(snap){

                //if the match status is set to "throwing"...
                if(snap.val() === "throwing"){

                    //grab the entire matchObject from firebase and pass it to the 'initiateRound' function.
                    initiateRound(getDBInfo(["matches", matchKey]))
                };
            });

            initializeMatchChat();

        }
    });

    database.ref().child("matches").on("child_removed", function(snap){
        if(playerObject["status"] === "fighting"){
            if(snap.key === matchKey){
                matchKey = "";
                playerObject["status"] = "chilling";
                setDBInfo();
                if(!isQuitter){
                    var text = opStats["username"] + " has left the match.";
                    updateDisplay(text, "h2", 4000);
                }
                else{
                    isQuitter = false;
                };
            };
        };
    });


    checkLocalStorage();

    if(playerObject["logins"] === 0){
        createOverlay();
    }
    else{
        playerKey = database.ref().child("players").push(playerObject).key;
        playerObject["key"] = playerKey;
        database.ref().child("players").child(playerKey).onDisconnect().remove();
        displayRecord();
    };

    //------------------------Game Button Bindings--------------------------------

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
        database.ref().child("players").remove();
        if(playerObject["status"] === "fighting"){
            choiceButton("scissors");
        };
    });

    $("#match_chat_submit").on("click", function(event){
        if(playerObject["status"] === "fighting"){
            event.preventDefault();
            var textSubmition = {
                "username": playerObject["username"],
                "text": $("#match_chat_input").val().trim()
            };

            if(textSubmition["text"].length != 0){
                database.ref().child("matches").child(matchKey).child("chat").push(textSubmition);
            };

            $("#match_chat_input").val("");
        };
    });

    playerObject["logins"] ++;
    console.log(playerObject);
});