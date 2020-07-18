// callback(usernamer, error) where `username` is the username of the user if
// the login was successful. `error` is optional and should be the error message
// of why the login was unsuccessful.
function login(username, password, callback) {
    // --- Replace this with your own authentication system --- //
    
    if (callback) {
        let success = username.startsWith('test') && password == 'password';
        
        if (success) {
            callback(username, null);
        } else {
            callback(null, 'Invalid username/password');
        }
    }
}

// The same as `login`, but for admins trying to access admin.html
function loginAdmin(username, password, callback) {
    // --- Replace this with your own authentication system --- //
    
    if (callback) {
        let success = username.startsWith('admin') && password == 'password';
        
        if (success) {
            callback(username, null);
        } else {
            callback(null, 'Invalid username/password');
        }
    }
}

module.exports = login;
module.exports.loginAdmin = loginAdmin;