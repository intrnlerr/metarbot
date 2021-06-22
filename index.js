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

function startbot(token) {
    const client = new dc.Client()
    client.on('ready', () => {
        console.log('owned')
    })

    client.on('message', async (msg) => {
        // check if message 
        if (msg.content.startsWith('!atis')) {
            // get
            let arg = msg.content.substring(5).trim()
            if (arg === '') {
                return
            }
            getmetar(arg, (codes) => {
                if (codes.$.num_results == 0) {
                    msg.channel.send('invalid icao')
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

    client.login(token)
}

// read config

const fs = require('fs')
fs.open('config.json', (err, f) => {
    if (err) {
        if (err.code === 'ENOENT') {
            // create file
            fs.open('config.json', 'w', (err, fd) => {
                if (err) {
                    throw err
                }
                fs.write(fd, '{"token":"token here"}', (err) => {
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
        startbot(config.token)
    })
})

