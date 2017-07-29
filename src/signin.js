var signInDiv = document.getElementById('signInDiv');
var loggedIn = false;

$('#login-submit').on("click", () => {
    socket.emit('signIn', { username: $('#login-username').val().trim(), password: $('#login-password').val() }, data => {
        if (data.loggedIn)
            showSnackBar("Already logged in", 'danger');
        else if (!data.success)
            showSnackBar("Incorrect username/password", 'danger');
        else {
            gotoLobby();
            loggedIn = true;
            $('#login-modal').modal('hide');
            $('#user-menu').css('display', 'inline');
            $('#greeting').prepend(`Welcome, ${$('#login-username').val().trim()}`);
        }
        return false;
    });
    return false;
});

$('#register-submit').on("click", () => {
    if ($('#register-password').val() != $('#register-password2').val()) {
        showSnackBar("Passwords don't match", 'danger');
    }
    else if ($('#register-username').val().length < 3) {
        showSnackBar("Username should be at least 3 characters long", 'danger');
    }
    else if ($('#register-password').val().length < 3) {
        showSnackBar("Password should be at least 3 characters long", 'danger');
    }
    else {
        socket.emit('signUp', { username: $('#register-username').val().trim(), password: $('#register-password').val() }, data => {
            if (data.success) {
                showSnackBar("Sign up successful", 'success');
                $('#register-modal').modal('hide');
            }
            else
                showSnackBar("Sign up unsuccessful, username taken", 'danger');
            return false;
        });
        return false;
    }
    return false;
})