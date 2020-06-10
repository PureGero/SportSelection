// callback(success, error) where `success` is true if the login was successful,
// false otherwise. `error` is optional and should be the error message of why
// the login was unsuccessful.
function login(username, password, callback) {
    // --- Replace this with your own authentication system --- //
    
    if (callback) {
        callback((username == 'testuser' && password == 'password')
              || (username == 'testuser2' && password == 'password'),
                 'Invalid username/password');
    }
}

module.exports = login;