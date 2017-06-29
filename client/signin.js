var signInDiv = document.getElementById('signInDiv');
var signInDivUsername = document.getElementById('signInDiv-username');
var signInDivSignIn = document.getElementById('signInDiv-signIn');
var signInDivSignUp = document.getElementById('signInDiv-signUp');
var signInDivPassword = document.getElementById('signInDiv-password');
var lobbyDiv = document.getElementById('lobbyDiv');

function disableButtons(bool)
{
    signInDivSignIn.disabled = bool;
    signInDivSignUp.disabled = bool;
}

signInDivSignIn.onclick = function () {
    if (signInDivUsername.value.trim() === "" || signInDivPassword.value.trim() === "" )
        return;
    else
    {
        disableButtons(true);
        socket.emit('signIn', { username: signInDivUsername.value.trim(), password: signInDivPassword.value });
    }
}

signInDivSignUp.onclick = function () {
    if (signInDivUsername.value.trim() === "" || signInDivPassword.value.trim() === "" )
        return;
    else{
        disableButtons(true);
        socket.emit('signUp', { username: signInDivUsername.value.trim(), password: signInDivPassword.value });
    }
}

socket.on('signInResponse', function (data) {
    if (data.success) {
        signInDiv.style.display = 'none';
        lobbyDiv.style.display = 'inline';
        // displayDiv.style.display = 'inline-block';
    } else{
        disableButtons(false);
        alert("Sign in unsuccessful.");
    }
});


socket.on('signUpResponse', function (data) {
    if (data.success) {
        alert("Sign up successful.");
    }else{
        alert("Sign up unsuccessful, Username taken");
    }
    disableButtons(false);
});
