const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const fs = require('fs');
const {SequentialTaskQueue} = require('sequential-task-queue');

const E = exports;
let queue;
const {FFMPEG_BIN} = process.env;

E.transform = function(input_stream, opt){
    if (!queue)
        throw 'call init first';
    let filters = ['atempo=5/4', 'asetrate=44100*4/5'];
    if (opt && opt.mid)
        filters = ['atempo=9/8', 'asetrate=44100*8/9']
    if (opt && opt.slim)
        filters = ['atempo=4/5', 'asetrate=44100*5/4']
    const pass = stream.PassThrough();
    queue.push(()=>new Promise(resolve=>{
        try {
            ffmpeg(input_stream)
            .format('ogg')
            .audioFilters(['speechnorm'].concat(filters))
            .addOption('-movflags faststart')
            .addOption('-ac 1')
            .addOption('-map 0:a')
            .addOption('-c:a libopus')
            .output(pass)
            .on('end', ()=>resolve())
            .run();
        } catch (e){
            console.log('ffmpeg', e);
            process.exit(1);
        }
   }));
   return pass;
}

E.normalize = function(input_stream){
    if (!queue)
        throw 'call init first';
    const pass = stream.PassThrough();
    queue.push(()=>new Promise(resolve=>{
        try {
            ffmpeg(input_stream)
            .format('ogg')
            .audioFilters(['loudnorm', 'silenceremove=stop_periods=-1:stop_duration=1:start_threshold=0.03:stop_threshold=0.03', 'highpass=f=200', 'speechnorm'])
            .addOption('-movflags faststart')
            .addOption('-ac 1')
            .addOption('-map 0:a')
            .addOption('-c:a libopus')
            .output(pass)
            .on('end', ()=>resolve())
            .run();
        } catch (e){
            console.log('ffmpeg', e);
            process.exit(1);
        }
   }));
   return pass;
}


E.cleanup = function(input_stream){
    if (!queue)
        throw 'call init first';
    const pass = stream.PassThrough();
    queue.push(()=>new Promise(resolve=>{
        try {
            ffmpeg(input_stream)
            .format('ogg')
            //.audioFilters(['highpass=200','lowpass=3000','afftdn', 'speechnorm', 'loudnorm'].concat([]||filters))
            .audioFilters(['afftdn=nf=-25', 'highpass=f=200', /**'lowpass=f=3000',**/ 'speechnorm', 'loudnorm'])
            .addOption('-movflags faststart')
            .addOption('-ac 1')
            .addOption('-map 0:a')
            .addOption('-c:a libopus')
            //.on('start', (cmdline) => console.log(cmdline))
            .output(pass)
            .on('end', ()=>resolve())
            .run();
        } catch (e){
            console.log('ffmpeg', e);
            process.exit(1);
        }
   }));
   return pass;
}


E.spectrogram = function(input_stream){
    if (!queue)
        throw 'call init first';
    const pass = stream.PassThrough();
    queue.push(()=>new Promise(resolve=>{
        try {
            ffmpeg(input_stream)
            .inputFormat('ogg')
            .addInputOption('-t 8')
            .audioFilters(['loudnorm'])
            .complexFilter(`[0]showspectrumpic=stop=1000:s=1024x1024[v]`)
            .addOption('-map [v]')
            .outputFormat('image2')
            .output(pass)
            .on('end', ()=>resolve())
            .run();
        } catch (e){
            console.log('ffmpeg', e);
            process.exit(1);
        }
   }));
   return pass;
}
E.init = function(args){
    ffmpeg.setFfmpegPath(FFMPEG_BIN||'/usr/app/ffmpeg/ffmpeg');
    console.log('USING', FFMPEG_BIN||'/usr/app/ffmpeg/ffmpeg')
    queue = new SequentialTaskQueue();
    if (!args)
        return;
    console.log(`transforming ${args[0]} -> ${args[1]}`);
    const write_stream = fs.createWriteStream(args[1], {flags: 'w'});
    E.transform(fs.createReadStream(args[0])).pipe(write_stream);
}

if (!module.parent)
    E.init(process.argv.slice(2));

