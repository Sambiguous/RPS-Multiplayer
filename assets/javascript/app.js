var playerObject = {
    "logins": 0,
    "wins": 0,
    "losses": 0,
    "ties": 0,
    "username": "", 
};

function setLocalStorage(obj){//slighty shorter-hand way to update the local storage object
    localStorage.setItem("rps", JSON.stringify(obj));
};

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

    console.log(playerObject)
    console.log(localStorage.getItem("rps"));
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


$(document).ready(function(){
    checkLocalStorage();

    if(playerObject["logins"] === 0){
        createOverlay();
    };




    //localStorage.clear()
    playerObject["logins"] ++;
    setLocalStorage(playerObject);
});