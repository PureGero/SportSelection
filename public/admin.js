'use strict';

let wsProtocol = location.protocol == 'https:' ? 'wss' : 'ws';
let ws = new WebSocket(`${wsProtocol}://${location.host}/admin`);

let groups = [];

ws.onclose = () => {
    document.querySelector('.disconnected').style.display = '';
};

ws.onerror = (error) => {
    console.error(error);
};

ws.onmessage = (event) => {
    let json = JSON.parse(event.data);

    if (json.action == 'login') {
        if (json.error) {
            document.querySelector('.error').innerHTML = json.error;
            document.querySelector('form').submit.innerText = 'Login';
        } else {
            init(json.username);
        }
    } else if (json.action == 'groups') {
        groups = json.groups;
    } else if (json.action == 'periodlist') {
        renderPeriodList(json);
    } else if (json.action == 'sportlist') {
        renderSportList(json);
    } else if (json.action == 'sportinfo') {
        renderSportInfo(json);
    }
};

ws.onopen = () => {
    document.querySelector('.disconnected').style.display = 'none';
}

function send(json) {
    ws.send(JSON.stringify(json));
}

function login(form) {
    document.querySelector('.error').innerHTML = '';
    
    send({
        action: 'login',
        username: form.username.value,
        password: form.password.value
    });
    
    form.submit.innerText = 'Logging in...';
    
    // Disable default form action
    return false;
}

function init(username) {
    document.querySelector('h1').onclick = loadPeriodList;
    document.getElementById('loginstatus').innerHTML = 'Logged in as ' + username;
    
    loadPeriodList();
}

function loadPeriodList() {
    document.querySelector('.periodlist').innerHTML = '<h2 id="periodlist">Loading...</h2>';
    document.querySelector('.sportlist').innerHTML = '';
    document.querySelector('main').innerHTML = '<h2 id="name">Loading period list...</h2>';
    
    send({
        action: 'periodlist'
    });
}

function renderPeriodList(json) {
    if (document.querySelector('.periodlist').innerHTML.indexOf('Loading...') >= 0) {
        // Render main aswell
        document.querySelector('main').innerHTML = '<h2 id="name">Select a period on the left</h2>';
        document.querySelector('.periodlist').innerHTML = '<h2 id="periodlist" class="visuallyhidden">Period List</h2><ul></ul>';
    }
    
    // Update
    let ul = document.querySelector('.periodlist').querySelector('ul');
    
    if (!ul.querySelector('.new')) {
        ul.innerHTML += '<li class="new" onclick="renderCreateNewPeriod()"><h3>New Period</h3></li>';
    }
    
    json.periodlist.forEach(period => {
        let li = ul.querySelector(`.period${period.periodid}`);
        
        if (!li) {
            ul.innerHTML += `<li class="period${period.periodid}" onclick="loadPeriod(${period.periodid})"><h3></h3><span class="time"></span></li>`;
            li = ul.querySelector(`.period${period.periodid}`);
        }
    
        let time;
        
        if (period.opens > Date.now()) {
            time = `Opens <time class="countdown" datetime="${datetime(period.opens)}"></time>`;
        } else if (period.closes > Date.now()) {
            time = `Closes <time class="countdown" datetime="${datetime(period.closes)}"></time>`;
        } else {
            time = `Closed`;
        }
        
        li.querySelector('h3').innerHTML = period.name;
        li.querySelector('.time').innerHTML = time;
    });
    
    doCountdown();
}

function renderCreateNewPeriod() {
    document.querySelector('.sportlist').innerHTML = '';

    document.querySelector('.periodlist').querySelectorAll('.active').forEach(period => {
        period.classList.remove('active');
    });

    document.querySelector('.periodlist').querySelector('.new').classList.add('active');

    document.querySelector('main').innerHTML = `
        <form onsubmit="return createPeriod(this)">
            <h2 id="name">Create new period</h2>
            <label for="period_name">Name:</label>
            <input type="text" id="period_name" name="period_name"/>
            <label for="opens">Opens at:</label>
            <input type="datetime-local" id="opens" name="opens" value="${datetimeLocal(Date.now()).slice(0, 16)}"/>
            <label for="closes">Closes at:</label>
            <input type="datetime-local" id="closes" name="closes" value="${datetimeLocal(Date.now() + 7 * 24 * 60 * 60 * 1000).slice(0, 16)}"/>
            <label for="description">Description:</label>
            <textarea id="description" name="description"></textarea>
            <button id="submit">Create <i class="fas fa-plus-square"></i></button>
        </form>
        `;
    document.querySelector('#period_name').focus();
}

function createPeriod(form) {
    send({
        action: 'createperiod',
        name: form.period_name.value,
        opens: new Date(form.opens.value).getTime(),
        closes: new Date(form.closes.value).getTime(),
        description: form.description.value,
    });
    
    form.submit.innerText = 'Creating...';
    
    // Disable default form action
    return false;
}

function loadPeriod(periodid) {
    document.querySelector('.sportlist').innerHTML = '<h2 id="sportlist">Loading...</h2>';
    document.querySelector('main').innerHTML = '<h2 id="name">Loading period...</h2>';
    
    send({
        action: 'sportlist',
        periodid: periodid
    });
}

function renderSportList(json) {
    if (document.querySelector('.sportlist').innerHTML.length == 0 ||
            document.querySelector('.sportlist').innerHTML.indexOf('Loading...') >= 0) {
        // Render main aswell
        document.querySelector('main').innerHTML = `
            <form onsubmit="return submitPeriod(this)">
                <h2 id="name" contenteditable>${json.period.name}</h2>
                <input type="hidden" name="periodid" value="${json.period.periodid}"/>
                <label for="opens">Opens at:</label>
                <input type="datetime-local" id="opens" name="opens" value="${datetimeLocal(json.period.opens).slice(0, 16)}"/>
                <label for="closes">Closes at:</label>
                <input type="datetime-local" id="closes" name="closes" value="${datetimeLocal(json.period.closes).slice(0, 16)}"/>
                <label for="description">Description:</label>
                <textarea id="description" name="description">${json.period.description}</textarea>
                <button id="submit">Save <i class="fas fa-save"></i></button>
            </form>
            `;
        document.querySelector('.sportlist').innerHTML = `<h2 id="sportlist" periodid="${json.period.periodid}" class="visuallyhidden">Sport List</h2><ul></ul>`;
        
        document.querySelector('.periodlist').querySelectorAll('.active').forEach(period => {
            period.classList.remove('active');
        });

        document.querySelector('.periodlist').querySelector(`.period${json.period.periodid}`).classList.add('active');
    }
    
    // Update
    let ul = document.querySelector('.sportlist').querySelector('ul');
    
    if (!ul.querySelector('.new')) {
        ul.innerHTML += `<li class="new" onclick="renderCreateNewSport(${json.period.periodid})"><h3>New Sport</h3></li>`;
    }
    
    json.sportlist.forEach(sport => {
        let li = ul.querySelector(`.sport${sport.sportid}`);
        
        if (!li) {
            ul.innerHTML += `<li class="sport${sport.sportid}" onclick="loadSport(${json.period.periodid},${sport.sportid})"><h3></h3><span class="users"></span></li>`;
            li = ul.querySelector(`.sport${sport.sportid}`);
        }
        
        li.querySelector('h3').innerHTML = sport.name;
        li.querySelector('.users').innerHTML = `${sport.users}/${sport.maxusers} users`;
    });
    
    doCountdown();
}

function submitPeriod(form) {
    send({
        action: 'updateperiod',
        periodid: form.periodid.value,
        name: form.querySelector('#name').innerText,
        opens: new Date(form.opens.value).getTime(),
        closes: new Date(form.closes.value).getTime(),
        description: form.description.value,
    });
    
    form.submit.innerText = 'Saving...';

    document.querySelector('.sportlist').innerHTML = '';
    
    // Disable default form action
    return false;
}

function renderCreateNewSport(periodid) {
    let allowed = '';
    
    groups.forEach(group => {
        const groupName = ~group.indexOf('_') ? group.substr(group.indexOf('_') + 1) : group;
        allowed += `<li><input type="checkbox" id="allowed.${group}" name="allowed.${group}" value="${group}"/><label for="allowed.${group}">${groupName}</label></li>`;
    });

    document.querySelector('.sportlist').querySelectorAll('.active').forEach(period => {
        period.classList.remove('active');
    });

    document.querySelector('.sportlist').querySelector('.new').classList.add('active');

    document.querySelector('main').innerHTML = `
        <form onsubmit="return createSport(this)">
            <h2 id="name">Create new sport</h2>
            <input type="hidden" name="periodid" value="${periodid}"/>
            <label for="sport_name">Name:</label>
            <input type="text" id="sport_name" name="sport_name"/>
            <label for="maxusers">Max users:</label>
            <input type="number" id="maxusers" name="maxusers" value="25"/>
            <label for="description">Description:</label>
            <textarea id="description" name="description"></textarea>
            <label for="allowed">Allowed groups:</label>
            <ul id="allowed">${allowed}</ul>
            <button id="submit">Create <i class="fas fa-plus-square"></i></button>
        </form>
        `;
    document.querySelector('#sport_name').focus();
}

function createSport(form) {
    let allowed = [];

    form.querySelectorAll('input[type=checkbox]:checked').forEach(checkbox => {
        allowed.push(checkbox.value);
    });

    send({
        action: 'createsport',
        periodid: form.periodid.value,
        name: form.sport_name.value,
        maxusers: form.maxusers.value,
        description: form.description.value,
        allowed: allowed,
    });
    
    form.submit.innerText = 'Creating...';
    
    // Disable default form action
    return false;
}

function loadSport(periodid, sportid) {
    document.querySelector('main').innerHTML = '<h2 id="name">Loading sport...</h2>';
    
    send({
        action: 'sportinfo',
        periodid: periodid,
        sportid: sportid
    });
}

function renderSportInfo(json) {
    let allowed = '';
    let users = '';
    
    groups.forEach(group => {
        // Remove the username prefix from the group name
        const groupName = ~group.indexOf('_') ? group.substr(group.indexOf('_') + 1) : group;
        const selected = ~json.sport.allowed.indexOf(group) ? 'checked' : '';
        allowed += `<li><input type="checkbox" id="allowed.${group}" name="allowed.${group}" value="${group}" ${selected}/><label for="allowed.${group}">${groupName}</label></li>`;
    });
    
    json.sport.allowed.forEach(group => {
        if (!~groups.indexOf(group)) {
            const groupName = ~group.indexOf('_') ? group.substr(group.indexOf('_') + 1) : group;
            allowed += `<li><input type="checkbox" id="allowed.${group}" name="allowed.${group}" value="${group}" checked/><label for="allowed.${group}">${groupName}</label></li>`;
        }
    });
    
    json.sport.users.forEach(user => {
        users += user + ' ';
    });

    document.querySelector('.sportlist').querySelectorAll('.active').forEach(period => {
        period.classList.remove('active');
    });

    document.querySelector('.sportlist').querySelector(`.sport${json.sport.sportid}`).classList.add('active');
    
    document.querySelector('main').innerHTML = `
        <form onsubmit="return submitSport(this)">
            <h2 id="name" contenteditable>${json.sport.name}</h2>
            <input type="hidden" name="periodid" value="${json.period.periodid}"/>
            <input type="hidden" name="sportid" value="${json.sport.sportid}"/>
            <label for="maxusers">Max users:</label>
            <input type="number" id="maxusers" name="maxusers" value="${json.sport.maxusers}"/>
            <label for="description">Description:</label>
            <textarea id="description" name="description">${json.sport.description}</textarea>
            <label for="allowed">Allowed groups:</label>
            <ul id="allowed">${allowed}</ul>
            <label for="users">Users enrolled (${json.sport.users.length}):</label>
            <textarea id="users" name="users">${users}</textarea>
            <button id="submit">Save <i class="fas fa-save"></i></button>
        </form>
        `;
}

function submitSport(form) {
    let allowed = [];

    form.querySelectorAll('input[type=checkbox]:checked').forEach(checkbox => {
        allowed.push(checkbox.value);
    });

    send({
        action: 'updatesport',
        periodid: form.periodid.value,
        sportid: form.sportid.value,
        name: form.querySelector('#name').innerText,
        maxusers: form.maxusers.value,
        description: form.description.value,
        allowed: allowed,
    });
    
    form.submit.innerText = 'Saving...';
    
    // Disable default form action
    return false;
}

function doCountdown() {
    document.querySelectorAll('time.countdown').forEach(element => {
        countdown(element);
    });
}

setInterval(doCountdown, 1000);

function countdown(element) {
    let timeDiff = new Date(element.dateTime) - new Date();

    element.innerHTML = prettifyTime(timeDiff);
}

function datetime(millis) {
    return datetimeLocal(millis).replace(/-/g, "/").replace("T", " ");
}

function datetimeLocal(millis) {
    const time = new Date(millis);
    const offsetMs = time.getTimezoneOffset() * 60 * 1000;
    const dateLocal = new Date(time.getTime() - offsetMs);
    return dateLocal.toISOString().slice(0, 19);
}

function prettifyTime(millis) {
    if (millis < 0) {
        if (millis > -60000) {
            return "now";
        } else {
            return prettifyTime(-millis).replace('in ', '') + ' ago';
        }
    }

    var seconds = Math.floor(millis/1000);
    var minutes = Math.floor(seconds/60);
    var hours = Math.floor(minutes/60);
    var days = Math.floor(hours/24);
    
    if (seconds < 1) {
        return "in " + seconds + " seconds";
    } else if (seconds < 2) {
        return "in " + seconds + " second";
    } else if (seconds < 60) {
        return "in " + seconds + " seconds";
    } else if (minutes < 2) {
        return "in " + minutes + " minute";
    } else if (minutes < 60) {
        return "in " + minutes + " minutes";
    } else if (hours < 2) {
        return "in " + hours + " hour";
    } else if (hours < 24) {
        return "in " + hours + " hours";
    } else if (days < 2) {
        return "in " + days + " day";
    } else {
        return "in " + days + " days";
    }
}