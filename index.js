const xml = require('xml2js')
const dc = require('discord.js')
const https = require('https')
const metarurl = 'https://www.aviationweather.gov/adds/dataserver_current/httpparam?datasource=metars&requestType=retrieve&format=xml&mostRecentForEachStation=constraint&hoursBeforeNow=1.25&stationString='

function getmetar(icao, cb) {
    https.get(metarurl + icao, (resp) => {
        // parse xml

        let s = ''
        resp.on('data', (data) => {
            s += data
        })
        resp.on('end', () => {
            xml.parseString(s, (err, result) => {
                if (err) {
                    return
                }
                cb(result.response.data[0])
            })

        })
    })
}

function startbot(token, appid) {
    // do a thing
    {
        let json = new SlashCommandBuilder()
        .setName("atis")
        .setDescription("metar")
        .addStringOption(
            (option) => option
            .setName("input")
            .setDescription("airport(s) to")
            .setRequired(true)
        ).toJSON()
        const { REST, Routes } = require('discord.js');
        const rest = new REST({ version: 10 }).setToken(token)
        rest.put(Routes.applicationCommands(appid), { body: [json] })
    }
    const client = new dc.Client({ intents: [] })
    client.on('ready', () => {
        console.log('owned')
    })
    client.on(dc.Events.InteractionCreate, interaction => {
        if (interaction.commandName === "atis") {
            let arg = interaction.options.get('input'); 
            if (arg.value === '') {
                return
            }
            getmetar(arg.value, (codes) => {
                if (codes.$.num_results == 0) {
                    interaction.reply('no results')
                    return
                }
                let segment = ''
                codes.METAR.forEach(metar => {
                    if (segment.length + metar.raw_text.length > 1000) {
                        // new segment
                        interaction.reply('```' + segment + '```')
                        segment = ''
                    }
                    segment += metar.raw_text + '\n'
                });
                interaction.reply('```' + segment + '```')
            })
        }
    })
    client.on('messageCreate', async (msg) => {
        // check if message 
        if (msg.content.startsWith('!atis')) {
            // get
            let arg = msg.content.substring(5).trim()
            if (arg === '') {
                return
            }
            getmetar(arg, (codes) => {
                if (codes.$.num_results == 0) {
                    msg.channel.send('no results')
                    return
                }
                let segment = ''
                codes.METAR.forEach(metar => {
                    if (segment.length + metar.raw_text.length > 1000) {
                        // new segment
                        msg.channel.send('```' + segment + '```')
                        segment = ''
                    }
                    segment += metar.raw_text + '\n'
                });
                msg.channel.send('```' + segment + '```')
            })
        }
    })

    client.login(token).catch((err) => {
        console.error("login error:", err)
    }).then((ok) => {
        console.log('success i think')
    })
}

// read config

const fs = require('fs')
const { SlashCommandBuilder } = require('discord.js')
fs.open('config.json', (err, f) => {
    if (err) {
        if (err.code === 'ENOENT') {
            // create file
            fs.open('config.json', 'w', (err, fd) => {
                if (err) {
                    throw err
                }
                fs.write(fd, '{"token":"token here","appid":"appid here"}', (err) => {
                    if (err) {
                        throw err
                    }
                })
                console.log('please change the generated configs :)')
                return
            })
        } else {
            throw err
        }
        return
    }
    fs.read(f, (err, n, data) => {
        if (err) {
            throw err
        }
        let config = JSON.parse(data.toString('utf8', 0, n))
        startbot(config.token, config.appid)
    })
})

