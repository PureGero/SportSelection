function login() {
    // Set login in progress
    var loginError = document.querySelector('.login__error');
    var loginButton = document.querySelector('.login__input--button');

    if (loginError) {
        loginError.innerHTML = '';
    }

    if (loginButton) {
        loginButton.value = 'Logging in...';
    }

    var form = document.querySelector('form');
    var data = new FormData(form);
    var req = new XMLHttpRequest();

    req.onreadystatechange = function() {
        if (this.readyState == 4) {
            var data = JSON.parse(req.responseText);

            if (data.success) {
                // Login succeeded

                showSelectionPage();

            } else {
                // Login failed

                if (loginError) {
                    loginError.innerHTML = data.error ? data.error : 'Failed to login';
                }

                if (loginButton) {
                    loginButton.value = 'Login';
                }

            }
        }
    };

    req.open("POST", "login?json=true", true);
    req.send(data);

    // Cancel default form action
    return false;
}

function selectPeriod(form) {
    var selectionStatus = form.querySelector('.selection__status');
    var selectionTab = form.querySelector('.selection--tab');

    if (selectionStatus) {
        selectionStatus.innerHTML = 'Loading...';
    }

    if (selectionTab) {
        selectionTab.disabled = true;
    }

    listSports(form);

    // Cancel default form action
    return false;
}

function selectSport(form) {
    var selectionButton = form.querySelector('.selection--button');

    if (selectionButton) {
        selectionButton.innerHTML = 'Enrolling...';
        selectionButton.disabled = true;
    }

    listSports(form);

    // Cancel default form action
    return false;
}

function openSportDetails(div) {
    var details = div.parentElement.querySelector('.selection__details');

    if (details.classList.contains('selection__details--shown')) {

        // Hide details

        details.classList.remove('selection__details--shown');

        return;
    }

    // Show details

    var otherShownDetails = document.body.querySelector('.selection__details--shown');

    if (otherShownDetails) {

        otherShownDetails.classList.remove('selection__details--shown');

    }

    details.classList.add('selection__details--shown');
}


function showSelectionPage() {
    var loginPage = document.querySelector('.login__page');
    var loginContainer = document.querySelector('.login__container');

    if (loginPage) {
        loginPage.classList.remove('login__page');
        loginPage.classList.add('selection__page');
    }

    if (loginContainer) {
        loginContainer.classList.add('login__container--selection');
        loginContainer.innerHTML = '<p class="login__title">Loading...</p>';
    }

    var req = new XMLHttpRequest();

    req.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                var data = JSON.parse(req.responseText);

                listSportsSuccess(data);
            } else {
                listSportsError(this.status, req.responseText);
            }
        }
    };

    req.open("GET", "listsports?json=true", true);
    req.send();
}

function listSports(form) {
    var data = new FormData(form);
    var req = new XMLHttpRequest();

    req.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                var data = JSON.parse(req.responseText);

                listSportsSuccess(data);
            } else {
                listSportsError(this.status, req.responseText);
            }
        }
    };

    req.open("POST", "listsports?json=true", true);
    req.send(data);
}

function listSportsError(status, error) {
    document.querySelector('.login__container').innerHTML = '<p class="login__title">Error: ' + status + ': ' + error + '</p>';
}

function listSportsSuccess(data) {
    var loginContainer = document.querySelector('.login__container');

    if (data.error) {
        return loginContainer.innerHTML = '<p class="login__title">Error: ' + data.error + '</p>';
    }

    if (data.selected) {
        loginContainer.innerHTML = renderSelected(data.period);
    } else if (data.sportlist) {
        loginContainer.innerHTML = renderSportList(data.sportlist, data.period);
    } else if (data.periodlist) {
        loginContainer.innerHTML = renderPeriods(data.periodlist);
    } else if (data.opens) {
        startCountdown(data.opens);
    } else {
        loginContainer.innerHTML = '<p class="login__title">Selection has closed</p>';
    }
}

function renderSelected(period) {
    var html = '<p class="login__title">' + period.name + '</p>';

    html += '<p class="login__subtitle">You have successfully been enrolled into ' + period.selected_name + '</p>';

    html += '<form action="?show_selection=true" method="post" onsubmit="return selectPeriod(this)">';
    html += '<input type="hidden" name="periodid" value="' + period.periodid + '" />';
    html += '<button class="login__input login__input--button">&lt; Go back to the sport selection page</button>';
    html += '</form>';

    return html;
}

function renderSportList(sports, period) {
    var html = '<p class="login__title">' + period.name + '</p>';

    var subtitle;
    if (period.selected_name) {
        subtitle = 'You are currently enrolled in ' + period.selected_name + '.';
    } else {
        subtitle = 'Click on a sport to see more details, and press the Enrol button to enrol into it.';
    }

    html += '<p class="login__subtitle">' + subtitle + '</p>';

    for (var i = 0; i < sports.length; i++) {
        var sport = sports[i];

        var periodid = period.periodid;
        var sportid = sport.sportid;
        var name = sport.name;
        var description = sport.description;
        var remaining = sport.remaining;
        var selected = sport.selected;

        var status = remaining + ' spots remaining';
        var buttonText = 'Enrol &gt;';
        if (remaining == 0) {
            status = 'Full';
            buttonText = 'Full';
        }
        if (remaining == 1) {
            status = remaining + ' spot remaining';
        }
        if (selected) {
            status = 'Enrolled';
            buttonText = 'Enrolled';
        }

        var aria = 'Enrol in ' + name + ', ' + status;
        if (remaining == 0) {
            aria = name + ' is full';
        }
        if (selected) {
            aria = 'You are currently enrolled in ' + name;
        }

        var buttonClass = 'selection';
        var disabled = '';
        if (selected) {
            buttonClass = buttonClass + ' selection--selected';
            disabled = 'disabled';
        } else if (remaining == 0) {
            buttonClass = buttonClass + ' selection--full';
            disabled = 'disabled';
        }

        // Unenroll button
        if (name == '_Unenroll') {
            name = 'Unenroll';
            aria = 'Unenroll from this selection';
            if (!period.selected_name) {
                disabled = 'disabled';
                status = 'You are not enrolled';
                buttonClass = 'selection selection--full';
            } else if (remaining == 0) {
                // Someone didn't give the _Unenroll sport enough space :/
                disabled = 'disabled';
                status = 'Full';
                buttonClass = 'selection selection--full';
            } else {
                disabled = '';
                status = 'Unenroll';
                buttonClass = 'selection';
            }
        }

        html += '<form action="?show_selection=true" method="post" onsubmit="return selectSport(this)">';
        html += '<input type="hidden" name="periodid" value="' + periodid + '" />';
        html += '<input type="hidden" name="sportid" value="' + sportid + '" />';
        html += '<div class="' + buttonClass + ' selection--tab" onclick="return openSportDetails(this)">';
        html += '<div class="selection__name">' + name + '</div>';
        html += '<div class="selection__status">' + status + '</div>';
        html += '</div>';
        html += '<div class="selection__details">';
        html += description;
        html += '<button class="' + buttonClass + ' selection--button" aria-label="' + aria + '" ' + disabled + '>' + buttonText + '</button>';
        html += '</div>'
        html += '</form>';
    }

    html += '<p class="login__endtitle">' + subtitle + '</p>';

    return html;
}

function renderPeriods(periods) {
    var html = '<p class="login__title">Selection Periods</p>';

    for (var i = 0; i < periods.length; i++) {
        var period = periods[i];
        var aria = "Open selection period " + period.name;

        html += '<form action="?show_selection=true" method="post" onsubmit="return selectPeriod(this)">';
        html += '<input type="hidden" name="periodid" value="' + period.periodid + '" />';
        html += '<button class="selection selection--tab" aria-label="' + aria + '">';
        html += '<div class="selection__name">' + period.name + '</div>';
        html += '<div class="selection__status">&gt;</div>';
        html += '</button>';
        html += '</form>';
    }

    return html;
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

    var loginTitle = document.querySelector('.login__title');

    if (!loginTitle) {
        return;
    }

    if (Date.now() > date) {
        loginTitle.innerHTML = 'Selection is opening...';
        setTimeout(showSelectionPage, Math.random() * 4000 + 100);
    } else {
        loginTitle.innerHTML = 'Selection opens in ' + prettifyTime(date - Date.now());
        setTimeout(startCountdown, 1000, time);
    }
}