/**
 * twitspot Tidal.
 *
 * @author   Patrick Schroen / https://github.com/pschroen
 * @license  MIT Licensed
 */

/* jshint strict:true, eqeqeq:true, newcap:false, multistr:true, expr:true, loopfunc:true, shadow:true, node:true, indent:4 */
"use strict";

var ffmpeg = require('fluent-ffmpeg'),
    wav = require('wav'),
    Speaker = require('speaker'),
    TidalAPI = require('tidalapi'),
    quality = null,
    api = null;

var debug = require('debug')('twitspot:tidal');

process.on('message', function (payload) {
    debug('message  : '+JSON.stringify(payload));
    var message = payload.message,
        data = payload.data,
        id = payload.id;
    switch (message) {
        case 'login':
            quality = data.quality;
            api = new TidalAPI({
                username: data.username,
                password: data.password,
                token: quality === 'lossless' ? 'P5Xbeo5LFvESeDy6' : 'wdgaB1CilGA-S_s2',
                quality: quality === 'lossless' ? 'LOSSLESS' : 'HIGH'
            });
            process.send({id:id});
            break;
        case 'search':
            api.search({type:'tracks', query:data.query, limit:1}, function (data) {
                debug('search  : '+JSON.stringify(data));
                // Normalize track data
                var track = data.tracks.items.length ? {
                        name: data.tracks.items[0].title+(data.tracks.items[0].version ? ' ('+data.tracks.items[0].version+')' : ''),
                        artists: [{
                            name: data.tracks.items[0].artists[0].name
                        }],
                        album: {
                            images: [{
                                url: api.getArtURL(data.tracks.items[0].album.cover, 1280)
                            }]
                        },
                        id: data.tracks.items[0].id
                    } : null;
                process.send({data:track, id:id});
            });
            break;
        case 'get':
            api.getStreamURL({id:data.id}, function (data) {
                debug('track get  : '+JSON.stringify(data));
                var reader = new wav.Reader();
                reader.on('format', function (format) {
                    reader.pipe(new Speaker(format));
                });
                var url = quality === 'lossless' ? data.url : 'rtmp://'+data.url;
                ffmpeg(url).format('wav').pipe(reader, {end:true}).on('finish', function () {
                    debug('track finish');
                    process.send({id:id});
                });
            });
            break;
    }
});
