var pid = 0;

function login() {
    // Set login in progress
    $('.login__error').text('');
    $('.login__input--button').val('Logging in...');

    $.post("login?json=true", $('form').serialize(), function(data) {

        loginData = JSON.parse(data);

        if (loginData.success) {

            // Login succeeded
            showSelectionPage();

        } else {

            // Login failed
            $('.login__error').text(loginData.error);
            $('.login__input--button').val('Login');

        }
    });

    // Cancel default form action
    return false;
}

function selectPeriod(form) {
    $(form).find('.selection__status').html('Loading...');
    $(form).find('.selection__button').attr('disabled', true);

    $.ajax({
        method: 'post',
        url: 'listsports.php', 
        data: $(form).serialize(),
        error: listSportsError, 
        success: listSportsSuccess
    });

    // Cancel default form action
    return false;
}

function selectSport(form) {
    $(form).find('.selection__status').html('Enrolling...');
    $(form).find('.selection__button').attr('disabled', true);

    // A satisfying 0.5s delay between clicking on a sport and it enrolling
    setTimeout(function() {
        $.ajax({
            method: 'post',
            url: 'listsports.php', 
            data: $(form).serialize(),
            error: listSportsError, 
            success: listSportsSuccess
        });
    }, 500);

    // Cancel default form action
    return false;
}

function showSelectionPage() {
    $('.login__page').addClass('selection__page');
    $('.login__page').removeClass('login__page');

    $('.login__container').addClass('login__container--selection');
    $('.login__container').empty();
    $('.login__container').append($('<p class="login__title">Loading...</p>'));
    
    $.ajax({
        url: 'listsports.php', 
        error: listSportsError, 
        success: listSportsSuccess
    });
}

function listSportsError(xhr, status, error) {
    $('.login__container').html('<p class="login__title">Error: ' + status + ': ' + error + '</p>');
}

function listSportsSuccess(data) {
    $('.login__container').html(data);
}

            
function prettifyTime(millis) {
    var seconds = Math.floor(millis/1000);
    var minutes = Math.floor(seconds/60);
    var hours = Math.floor(minutes/60);
    var days = Math.floor(hours/24);
    
    if (seconds < 1) {
        return seconds + " seconds";
    } else if (seconds < 2) {
        return "1 second";
    } else if (seconds < 60) {
        return seconds + " seconds";
    } else if (minutes < 2) {
        if (seconds%60 == 1) {
            return minutes + " minute and " + seconds%60 + " second";
        } else {
            return minutes + " minute and " + seconds%60 + " seconds";
        }
    } else if (minutes < 60) {
        if (seconds%60 == 1) {
            return minutes + " minutes and " + seconds%60 + " second";
        } else {
            return minutes + " minutes and " + seconds%60 + " seconds";
        }
    } else if (hours < 2) {
        if (minutes%60 == 1) {
            return hours + " hour and " + minutes%60 + " minute";
        } else {
            return hours + " hour and " + minutes%60 + " minutes";
        }
    } else if (hours < 24) {
        if (minutes%60 == 1) {
            return hours + " hours and " + minutes%60 + " minute";
        } else {
            return hours + " hours and " + minutes%60 + " minutes";
        }
    } else if (days < 2) {
        if (hours%24 == 1) {
            return days + " day and " + hours%24 + " hour";
        } else {
            return days + " day and " + hours%24 + " hours";
        }
    } else {
        if (hours%24 == 1) {
            return days + " days and " + hours%24 + " hour";
        } else {
            return days + " days and " + hours%24 + " hours";
        }
    }
}

function startCountdown(time) {
    var date = new Date(time);
    
    if (Date.now() > date) {
        $('.login__title').text('Selection is opening...');
        setTimeout(showSelectionPage, Math.random() * 4000 + 100);
    } else {
        $('.login__title').text('Selection opens in ' + prettifyTime(date - Date.now()));
        setTimeout(startCountdown, 1000, time);
    }
}