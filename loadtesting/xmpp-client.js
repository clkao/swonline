const {client, xml} = require('@xmpp/client')
const debug = require('@xmpp/debug')
 
const xmpp = client({
  service: 'wss://jitsi.jothon.online/xmpp-websocket',
})

debug(xmpp, true)
 
xmpp.on('error', err => {
    console.error(err)
})
 
xmpp.on('offline', () => {
    console.log('offline')
})


xmpp.on("stanza", async (stanza) => {
//    console.log("=====stanza", stanza.toString());
    if (stanza.is("message")) {
    }
});


function delay(t, val) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve(val);
        }, t);
    });
}

function randHex(len) {
    var maxlen = 8,
        min = Math.pow(16,Math.min(len,maxlen)-1) 
        max = Math.pow(16,Math.min(len,maxlen)) - 1,
        n   = Math.floor( Math.random() * (max-min+1) ) + min,
        r   = n.toString(16);
    while ( r.length < len ) {
       r = r + randHex( len - maxlen );
    }
    return r;
  };


async function send_message(nick, content) {
    xmpp.send(xml('message', {
        to: "swonline@conference.jitsi.jothon.online",
        type: "groupchat"
    },
    xml('body', {}, content),
    xml('nick', {xmlns: "http://jabber.org/protocol/nick", nick})
    ));
}

async function update_presence(key, nick, top, left) {
    return xmpp.send(xml('presence', {
        to: `swonline@conference.jitsi.jothon.online/${key}`
        },
        xml('x', {xmlns: "http://jabber.org/protocol/muc"}),
        xml('nick', {xmlns: "http://jabber.org/protocol/nick"}, nick),
        xml('jitsi_participant_character', {}, "school uniform 1/su1 Student fmale 13"),
        xml('jitsi_participant_top', {},top),
        xml('jitsi_participant_left', {},left),
   ));
}

xmpp.on('online', async address => {
    const iq = await xmpp.iqCaller.get(xml("query", "http://jabber.org/protocol/disco#info"));
    console.debug(iq);
    const foo = await xmpp.iqCaller.set(
        xml("conference", {
            room: "swonline@conference.jitsi.jothon.online",
            'machine-uid': "d2ab506763d354af66ee5d276a97d6e3",
            xmlns: "http://jitsi.org/protocol/focus",
        },
        xml('property', {name: 'disableRtx', value: 'false'}),
        xml('property', {name: "openSctp", value: "true"}),
        ),
        'focus.jitsi.jothon.online',
    );
    var current_top = Math.floor(Math.random() * 30) * 32;
    var current_left = Math.floor(Math.random() * 30) * 32;
    const key = randHex(8);
    const nick = 'xmpp-' + key;
    for (var i = 0; i < 100; ++i) {
        current_top += 32 * (Math.floor(Math.random() * 3) - 1)
        current_left += 32 * (Math.floor(Math.random() * 3) - 1)
        await update_presence(key, nick, current_top, current_left);
        if(Math.random() > 0.95) {
            await send_message(nick, "❤️")
        }
        await delay(2000);

    }
})

xmpp.start().catch(console.error);

