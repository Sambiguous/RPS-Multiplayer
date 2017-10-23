
var config = {
    apiKey: "AIzaSyApm8d6QdvEX0iyR4Y5qF1KbPPQH6i7pYM",
    authDomain: "rock-paper-scissors-afad9.firebaseapp.com",
    databaseURL: "https://rock-paper-scissors-afad9.firebaseio.com",
    storageBucket: "rock-paper-scissors-afad9.appspot.com",
  };

firebase.initializeApp(config);

var database = firebase.database();

var playerObjectLocations = {//keeps track of the nodes the player object resides in in the database
};

var listening = false;

var matchListener;

var countDown;

matchObject = {};
var matchKey = "";
var matchStatus = "";
//lets you know if you are player one or player 2 in the current round

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

var firebasePlayerKey = "";


function setLS(obj){//slighty shorter-hand way to update the local storage object
    localStorage.setItem("rps", JSON.stringify(obj));
};

function setDB(){
    database.ref().child("players").child(playerObjectLocations["players"]).set(playerObject);
};

function pushObjToDB(obj, node){//appends object to the specified database node and records the unique key string
    var key = database.ref().child(node).push(obj).key;
    playerObjectLocations[node] = key;
        if(node === "matches"){
            matchKey = key;
        };
};

function removePlayerObj(node){//removes the player object from the designated node in the database
    database.ref().child(node).child(playerObjectLocations[node]).remove();
    delete playerObjectLocations[node];
};

function findMatch(){
    if(playerObject["status"] === "chilling"){
        playerObject["status"] = "searching";
        setDB();
        database.ref().child("players").once("value", function(snap){
            for(var i in snap.val()){
                var opponent = snap.val()[i];
                if(opponent["status"] === "searching" && i != playerObjectLocations["players"]){
                    matchObject = buildMatchObject(playerObject, opponent)
                    pushObjToDB(matchObject, "matches");
                };
            };
        });
    }
    else if(playerObject["status"] === "searching"){
        playerObject["status"] = "chilling";
        setDB();
    };
    if(!listening){
        setUpPlayerListener()
        listening = true;
    };

};


function buildMatchObject(you, opponent){
    matchObj = {}

    matchObj["status"] = "waiting";
    matchObj["round"] = 0;
    matchObj["player1"] = you;
    matchObj["player1choice"] = "";
    matchObj["player2"] = opponent;
    matchObj["player2choice"] = "";


    return matchObj;
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

function win(){
    
}


function evalRound(pc, oc){
    if(pc == "rock"){
        if(oc == "rock"){
            playerObject["ties"] ++
        }
        else if(oc == "paper"){
            playerObject["losses"] ++
        }
        else{
            playerObject["wins"] ++
        }
    }
    else if(pc == "paper"){
        if(oc == "rock"){
            playerObject["wins"] ++
        }
        else if(oc == "paper"){
            playerObject["ties"] ++
        }
        else{
            playerObject["losses"] ++
        }
    }
    else{
        if(oc == "rock"){
            playerObject["losses"] ++
        }
        else if(oc == "paper"){
            playerObject["wins"] ++
        }
        else{
            playerObject["ties"] ++
        }
    } 
    setDB();
}

function startCountDown(){
    var text = ["Rock", "Paper", "Scissors", "Shoot!!"];
    var index = 1;
    var countDisplay = $("<div id='count_down'></div>");
    $("#throws").append(countDisplay);

    
    $("#count_down").html("<h1>Rock</h1>");
    var countDown = setInterval(function(){
        $("#count_down").html("<h1>" + text[index] + "</h1>");
        if(index == text.length){
            clearInterval(countDown);
            database.ref().child("matches").child(matchKey).child("status").set("waiting");
            database.ref().child("matches").child(matchKey).child("player1choice").set("nothing");
            database.ref().child("matches").child(matchKey).child("player2choice").set("nothing");
            $("#display").html("");
        };
        index++;
    }, 1000);


};

function displayResults(obj){
     opThrow = obj[themThisRound + "choice"]
     userThrow = obj[youThisRound + "choice"]



    setTimeout(function(){
        var opUrl = "assets/images/" + opThrow + ".gif";
        var userUrl = "assets/images/flip_" + userThrow + ".gif";
        $("#opponent_choice").attr("src", opUrl);
        $("#player_choice").attr("src", userUrl);
        evalRound(userThrow, opThrow);
    }, 4000);
}

function choiceButton(choice){
    if(playerObject["status"] === "fighting"){
        var match = database.ref().child("matches").child(playerObjectLocations["matches"])
        match.child(youThisRound + "choice").set(choice);
        var opChoice = ""
        match.once("value", function(snap){
           matchObject = snap.val()
           opChoice = matchObject[themThisRound + "choice"];
        });

        console.log("choiceButton opChoice: " + opChoice)
        if(opChoice === "rock" || opChoice === "paper" || opChoice === "scissors"){
            match.child("status").set("throwing")
        }

    };



}

$(window).on("beforeunload", function(){

    //set status back to 'chilling'
    playerObject["status"] = "chilling";

    //save playerObject to local storage
    //setLS(playerObject);

    //delete player object from all nodes
    for(var i in playerObjectLocations){
        removePlayerObj(i);
    };
    removePlayerObj(matchKey);
});

function setUpPlayerListener(){
    database.ref().child("players").child(playerObjectLocations["players"]).on("value", function(snap){
        console.log(snap.val());
        console.log(snap.val()["status"]);
        if(snap.val()["status"] === "searching"){
            $("#find_match_button").html("searching...");
        }
        else if(snap.val()["status"] === "chilling"){
            $("#find_match_button").html("Find Match");
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
        if(snap.key === playerObjectLocations["matches"]){
            delete playerObjectLocations["matches"];
            playerObject["status"] = "chilling";
            setDB();
        };
    });

    database.ref().child("matches").on("value", function(snap){
        var match = snap.val();
        //if you are currently looking for a match... 
        if(playerObject["status"] === "searching"){
            //loop through the whole matches node to see if you're username appears in a match object
            for(var i in match){
                //if it does...
                if(match[i]["player1"]["username"] === playerObject["username"] || match[i]["player2"]["username"] === playerObject["username"]){
                    //record the key that points to your match object
                    playerObjectLocations["matches"] = i;
                    matchKey = i;
                    //set your local playerObject status to 'fighting'
                    playerObject["status"] = "fighting";
                    //update database with latest playerObject
                    setDB();

                    


                    //if you are player1...
                    if(match[i]["player1"]["username"] === playerObject["username"]){
                        //display your opponent
                        var text = "You are now playing against " + match[i]["player2"]["username"];
                        updateDisplay(text, "h2", 4000);
                        //record that you are player1 for use later
                        youThisRound = "player1";
                        themThisRound = "player2";
                    }
                    //if you are player2...
                    else{
                        //display your opponent
                        var text = "you are now playing against " + match[i]["player1"]["username"];
                        updateDisplay(text, "h2", 4000);
                        //record that you are player2 for use later
                        youThisRound = "player2";
                        themThisRound = "player1";
                    };

                    matchListener = database.ref().child("matches").child(i).on("value", function(snap){
                        matchObject = snap.val();
                        if(matchObject["status"] === "throwing"){
                            startCountDown();
                            displayResults(matchObject);
                        }; 
                    });
                };
            };
        };
    });

    $("#rock_button").on("click", function(){
        choiceButton("rock");
    });

    $("#paper_button").on("click", function(){
        choiceButton("paper");
    });

    $("#scissors_button").on("click", function(){
        choiceButton("scissors");
    });

    playerObject["logins"] ++;
});


