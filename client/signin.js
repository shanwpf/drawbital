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
        return false;
    else{
        if(signInDivUsername.value.length<3){
            showSnackBar("User name should be at least 3 character long");
        }
        else if(signInDivPassword.value.length<3){
            showSnackBar("password should be at least 3 character long");

        }else{
            disableButtons(true);
            socket.emit('signUp', { username: signInDivUsername.value.trim(), password: signInDivPassword.value });
        }
        return false;
    }
}

socket.on('signInResponse', function (data) {
    if (data.success) {
        signInDiv.style.display = 'none';
        lobbyDiv.style.display = 'inline';
    } else{
        disableButtons(false);
        showSnackBar("Sign in unsuccessful.");
    }
    return false;
});

socket.on('signedIn', function (data) {
        disableButtons(false);
        showSnackBar("Already logged in.");
        return false;
});


socket.on('signUpResponse', function (data) {
    if (data.success) {
        showSnackBar("Sign up successful.");
    }else{
        showSnackBar("Sign up unsuccessful, Username taken");
    }
    disableButtons(false);
    return false;
});
