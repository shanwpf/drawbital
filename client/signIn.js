var signInDiv = document.getElementById('signInDiv');
var signInDivUsername = document.getElementById('signInDiv-username');
var signInDivSignIn = document.getElementById('signInDiv-signIn');
var signInDivSignUp = document.getElementById('signInDiv-signUp');
var signInDivPassword = document.getElementById('signInDiv-password');

signInDivSignIn.onclick = function () {
    if (signInDivUsername.value.trim() === "" || signInDivPassword.value.trim() === "" )
        alert("dont it blank :(");
    else
    socket.emit('signIn', { username: signInDivUsername.value.trim(), password: signInDivPassword.value });
}

signInDivSignUp.onclick = function () {
    if (signInDivUsername.value.trim() === "" || signInDivPassword.value.trim() === "" )
        alert("dont it blank :(");
    else
        socket.emit('signUp', { username: signInDivUsername.value.trim(), password: signInDivPassword.value });
}

socket.on('signInResponse', function (data) {
    if (data.success) {
        signInDiv.style.display = 'none';
        displayDiv.style.display = 'inline-block';
    } else
        alert("Sign in unsuccessful.");
});


socket.on('signUpResponse', function (data) {
    if (data.success) {
        alert("Sign up successful.");
    } else
        alert("Sign up unsuccessful, Username taken");
});